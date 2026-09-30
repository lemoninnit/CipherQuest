import { useId, useRef, useState } from 'react';
import { authApi, assessCipher, MIN_CIPHER_LENGTH } from '../api/cipherQuestApi';
import ConfirmDialog from './ConfirmDialog';
import './ChangePasswordDialog.css';

/**
 * The in-app "change your password" flow, raised from Settings.
 *
 * This is the flow a player should use when signed in. The forgot-password
 * reset exists for when they are not, and it is deliberately weaker (it trusts
 * Operative ID + comms channel instead of a cipher) because by definition the
 * current cipher is unavailable.
 *
 * Built on ConfirmDialog rather than a bespoke modal so it inherits the focus
 * trap, Escape/backdrop-to-cancel, focus restoration and scroll lock that the
 * sign-out and delete-account dialogs already have. Only the body is new.
 *
 * Accessibility notes beyond what ConfirmDialog already handles:
 *   - The confirm field carries `aria-invalid`, because a mismatch is the
 *     mistake this form exists to catch.
 *   - The strength meter is `aria-live="polite"`, so guidance is announced as
 *     it updates rather than only being seen.
 *   - Submit stays enabled and reports why, instead of disabling itself: a
 *     disabled button gives no explanation to a keyboard or screen-reader user.
 */
export default function ChangePasswordDialog({ open, onClose, onChanged }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [visible, setVisible] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const firstFieldRef = useRef(null);
  const uid = useId();

  // Reopening must not show the previous attempt's error or half-typed cipher.
  // This adjusts state during render rather than in an effect: doing it in a
  // useEffect would setState on every close and trigger an extra render pass
  // just to clear state nobody is looking at any more.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setVisible({ currentPassword: false, newPassword: false, confirmPassword: false });
      setError('');
      setTouched(false);
      setBusy(false);
    }
  }

  const assessment = assessCipher(form.newPassword);
  const mismatch = form.confirmPassword.length > 0 && form.confirmPassword !== form.newPassword;
  const showMismatch = mismatch && (touched || error !== '');
  const tooShort = form.newPassword.length > 0 && form.newPassword.length < MIN_CIPHER_LENGTH;

  const onChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const reveal = (field) => () => setVisible((prev) => ({ ...prev, [field]: !prev[field] }));

  const submit = async (event) => {
    if (event) event.preventDefault();
    setTouched(true);

    if (form.confirmPassword !== form.newPassword) {
      setError('New Access Ciphers do not match. Please re-enter them to confirm.');
      return;
    }
    if (form.newPassword.length < MIN_CIPHER_LENGTH) {
      setError(`New Access Cipher must be at least ${MIN_CIPHER_LENGTH} characters.`);
      return;
    }

    setBusy(true);
    setError('');
    try {
      await authApi.changePassword(form.currentPassword, form.newPassword, form.confirmPassword);
      onChanged?.();
    } catch (err) {
      // A rejected current cipher is the common case, so name the field that
      // was wrong rather than leaving them hunting through the form.
      setError(err.message || 'Could not change your Access Cipher. Please try again.');
      firstFieldRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };
  const field = (key, label, opts = {}) => (
    <div className="cpd-field">
      <label className="cpd-label" htmlFor={`${uid}-${key}`}>{label}</label>
      <div className="cpd-input-wrap">
        <span className="material-symbols-outlined cpd-input-icon" aria-hidden="true">{opts.icon}</span>
        <input
          id={`${uid}-${key}`}
          ref={key === 'currentPassword' ? firstFieldRef : undefined}
          className="cpd-input"
          type={visible[key] ? 'text' : 'password'}
          value={form[key]}
          onChange={onChange(key)}
          onBlur={() => setTouched(true)}
          autoComplete={opts.autoComplete}
          placeholder={opts.placeholder}
          disabled={busy}
          aria-invalid={key === 'confirmPassword' ? showMismatch : undefined}
          aria-describedby={key === 'newPassword' ? `${uid}-rules` : undefined}
        />
        <button
          type="button"
          className="cpd-toggle"
          onClick={reveal(key)}
          disabled={busy}
          aria-label={visible[key] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible[key]}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {visible[key] ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
    </div>
  );

  // Only one problem is shown at a time: stacking a mismatch, a length warning
  // and a server error at once is how a form turns into a wall of red.
  const inlineError = showMismatch
    ? 'New Access Ciphers do not match.'
    : tooShort
      ? `Your new cipher needs at least ${MIN_CIPHER_LENGTH} characters.`
      : error;

  return (
    <ConfirmDialog
      open={open}
      onConfirm={submit}
      onCancel={onClose}
      title="Change Access Cipher"
      description="Your new cipher takes effect immediately. You will stay signed in on this device."
      icon="lock_reset"
      confirmLabel="Change cipher"
      cancelLabel="Cancel"
      busy={busy}
      busyLabel="Updating…"
      initialFocus="confirm"
    >
      <form className="cpd-form" onSubmit={submit} noValidate>
        {field('currentPassword', 'Current Access Cipher', {
          icon: 'lock', autoComplete: 'current-password', placeholder: 'Your current cipher',
        })}

        {field('newPassword', 'New Access Cipher', {
          icon: 'lock_reset', autoComplete: 'new-password', placeholder: 'Choose a new cipher',
        })}

        {/* Strength is guidance, not a gate: the server checks length only, and
            claiming a rule is enforced when it is not would be misleading. */}
        {form.newPassword.length > 0 && (
          <div className="cpd-strength" aria-live="polite">
            <div className="cpd-strength-head">
              <span>Strength</span>
              <span className={`cpd-strength-label is-s${assessment.score}`}>{assessment.label}</span>
            </div>
            <div className="cpd-meter" role="presentation">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`cpd-meter-bar ${i < assessment.score ? `is-on is-s${assessment.score}` : ''}`}
                />
              ))}
            </div>
            <ul className="cpd-rules" id={`${uid}-rules`}>
              {assessment.rules.map((rule) => (
                <li key={rule.id} className={rule.met ? 'is-met' : ''}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {rule.met ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {field('confirmPassword', 'Confirm New Access Cipher', {
          icon: 'verified_user', autoComplete: 'new-password', placeholder: 'Re-enter new cipher',
        })}

        {inlineError && (
          <p className="cd-error" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            {inlineError}
          </p>
        )}

        <p className="cpd-note">
          <span className="material-symbols-outlined" aria-hidden="true">info</span>
          Forgotten it? Sign out and use the recovery flow on the login screen.
        </p>
      </form>
    </ConfirmDialog>
  );
}
