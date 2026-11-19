import { useEffect, useRef } from 'react';

/**
 * A modal dialog on the native <dialog> element (UI-UX.md "Keyboard"): showModal() makes the page
 * behind it inert, so focus stays inside; Esc closes it; when it closes, focus goes back to the
 * control that opened it. Resumify's look: a panel centred over a dark scrim, on every screen size.
 *
 * Render it only while it is open: mounting opens it, unmounting closes it. The element marked
 * data-autofocus gets the first focus (delete dialogs mark "Keep it").
 * role="alertdialog" for confirmations that delete something.
 */
export function Dialog({ onClose, labelledBy, describedBy, role = 'dialog', children }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const returnTo = document.activeElement;

    // Esc: let React state close it, so the page decides (a busy dialog can refuse).
    function handleCancel(event) {
      event.preventDefault();
      onCloseRef.current();
    }
    dialog.addEventListener('cancel', handleCancel);
    dialog.showModal();
    dialog.querySelector('[data-autofocus]')?.focus();

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (dialog.open) {
        dialog.close();
      }
      if (returnTo instanceof HTMLElement && document.contains(returnTo)) {
        returnTo.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      role={role === 'dialog' ? undefined : role}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="dlg"
    >
      {children}
    </dialog>
  );
}
