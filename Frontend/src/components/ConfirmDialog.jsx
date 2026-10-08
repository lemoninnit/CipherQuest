import { useEffect, useRef, useState, useCallback } from 'react';
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
 * The app's confirmation dialog with smooth open and closing animations.
 */
export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  children,
  icon = 'help',
  tone = 'default',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  busyLabel = 'Working…',
  initialFocus = 'cancel',
}) {
  const cardRef = useRef(null);
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleDismiss = useCallback(() => {
    if (busy || isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onCancel?.();
    }, 200);
  }, [busy, isClosing, onCancel]);

  const handleConfirmAction = () => {
    if (busy || isClosing) return;
    onConfirm?.();
  };

  useEffect(() => {
    if (!open) {
      setIsClosing(false);
      return undefined;
    }

    restoreFocusRef.current = document.activeElement;
    const target = initialFocus === 'confirm' ? confirmRef.current : cancelRef.current;
    target?.focus();

    return () => {
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
        handleDismiss();
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

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, handleDismiss]);

  if (!open) return null;

  const titleId = 'confirm-dialog-title';
  const descriptionId = 'confirm-dialog-description';

  return (
    <div className={`cd-overlay ${isClosing ? 'is-closing' : ''}`} onClick={handleDismiss}>
      <div
        ref={cardRef}
        className={`cd-card is-${tone} ${isClosing ? 'is-closing' : ''}`}
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
            onClick={handleDismiss}
            disabled={busy || isClosing}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="cd-btn cd-btn-confirm"
            onClick={handleConfirmAction}
            disabled={busy || isClosing}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
