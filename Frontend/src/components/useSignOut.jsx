import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SignOutDialog from './SignOutDialog';

/**
 * One owner for "sign out", shared by every entry point (the sidebar Quit item
 * on the dashboard, leaderboard and badges pages, and the Settings modal).
 *
 * Three copies of the same handler used to be inlined, each with its own
 * window.confirm() copy. That is exactly the kind of thing that drifts, so the
 * state machine lives here once and the pages only wire up two things:
 *
 *   const { signOut, dialog } = useSignOut();
 *   <button onClick={signOut}>Sign out</button>
 *   {dialog}
 *
 * `dialog` is the rendered element rather than a set of props so a page cannot
 * forget half of it and end up with an un-dismissable dialog.
 */
export default function useSignOut() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const requestSignOut = useCallback(() => setOpen(true), []);
  const cancelSignOut = useCallback(() => setOpen(false), []);

  const confirmSignOut = useCallback(() => {
    setOpen(false);
    logout();
    // `replace` so Back cannot return to a protected dashboard page that the
    // signed-out session can no longer render.
    navigate('/', { replace: true });
  }, [logout, navigate]);

  return {
    signOut: requestSignOut,
    dialog: (
      <SignOutDialog
        open={open}
        onConfirm={confirmSignOut}
        onCancel={cancelSignOut}
      />
    ),
  };
}
