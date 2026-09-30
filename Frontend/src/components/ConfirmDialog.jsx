import { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * The app's confirmation dialog.
 *
 * Replaces window.confirm()/window.alert(), which render a native browser
 * popup: unstyled, unreadable on a dark UI, untestable, and on mobile they sit
 * outside the app chrome entirely. This is the same dialog everywhere, so
 * "are you sure?" looks and behaves the same on every screen.
 *
 * Accessibility notes, because a modal the user can escape is a modal that
 * traps people:
 *   - Real dialog semantics: role=dialog + aria-modal + labelled/described.
 *   - Focus moves to the SAFE action on open (the cancel button by default),
 *     so a stray Enter can never trigger something destructive.
 *   - Focus is trapped inside the card and wraps at both ends.
 *   - Escape and a backdrop click both mean "cancel", never "confirm".
 *   - Focus returns to whatever opened the dialog on close.
 *   - The page behind is scroll-locked while the dialog is up.
 *
 * `onCancel` is deliberately the default for every dismiss path.
 */
export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  children,
  icon = 'help',
  // 'default' is neutral; 'danger' is for irreversible or account-ending
  // actions and tints the icon, border and confirm button red.
  tone = 'default',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  busyLabel = 'Working…',
  // Which action receives focus on open. 'cancel' is the safe default; pass
  // 'confirm' only for low-risk prompts the user has deliberately opened.
  initialFocus = 'cancel',
}) {
  const cardRef = useRef(null);
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    restoreFocusRef.current = document.activeElement;
    const target = initialFocus === 'confirm' ? confirmRef.current : cancelRef.current;
    target?.focus();

    return () => {
      // Unmounting (e.g. signing out) must not throw if the trigger is gone.
      restoreFocusRef.current?.focus?.();
    };
  }, [open, initialFocus]);

  // Stop the page behind the dialog from scrolling under it.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCancel?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const nodes = Array.from(cardRef.current?.querySelectorAll(FOCUSABLE) ?? [])
        .filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Capture phase: games install their own Escape handlers, and the dialog
    // must win so dismissing it never also pauses or closes the game.
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, onCancel]);

  if (!open) return null;

  const titleId = 'confirm-dialog-title';
  const descriptionId = 'confirm-dialog-description';

  return (
    <div className="cd-overlay" onClick={onCancel}>
      <div
        ref={cardRef}
        className={`cd-card is-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cd-head">
          <span className="cd-icon" aria-hidden="true">
            <span className="material-symbols-outlined">{icon}</span>
          </span>
          <h2 className="cd-title" id={titleId}>{title}</h2>
        </div>

        {description && (
          <p className="cd-desc" id={descriptionId}>{description}</p>
        )}

        {children}

        <div className="cd-actions">
          <button
            ref={cancelRef}
            type="button"
            className="cd-btn cd-btn-cancel"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="cd-btn cd-btn-confirm"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
