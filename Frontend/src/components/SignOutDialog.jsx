import ConfirmDialog from './ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import './SignOutDialog.css';

/**
 * Sign-out confirmation.
 *
 * The old copy was "Are you sure you want to quit and sign out?", which sounds
 * like the game is closing and gives the player no reason to care about the
 * answer. Signing out is routine and completely reversible, so this dialog
 * leads with that: your account is untouched, here is exactly what is being
 * kept, and the safe option ("Stay signed in") is the one that gets focus.
 *
 * Showing the operative's name matters on a shared device — it is the one
 * detail that stops someone signing out the wrong account.
 */
export default function SignOutDialog({ open, onConfirm, onCancel }) {
  const { user } = useAuth();
  const username = user?.username?.trim();

  return (
    <ConfirmDialog
      open={open}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title="Sign out of CipherQuest?"
      description={
        username
          ? `You'll be signed out of ${username} on this device.`
          : "You'll be signed out on this device."
      }
      icon="logout"
      tone="danger"
      confirmLabel="Sign out"
      cancelLabel="Stay signed in"
    >
      <p className="sd-lead">
        Signing out only closes this session on this browser. Nothing is deleted,
        and signing back in puts you straight back where you left off.
      </p>

      <ul className="sd-saved">
        <li><span className="material-symbols-outlined" aria-hidden="true">check_circle</span>Cleared stages and difficulty progress</li>
        <li><span className="material-symbols-outlined" aria-hidden="true">check_circle</span>Badges, XP and total score</li>
        <li><span className="material-symbols-outlined" aria-hidden="true">check_circle</span>Session hearts — any running cooldown keeps its clock</li>
      </ul>
    </ConfirmDialog>
  );
}
