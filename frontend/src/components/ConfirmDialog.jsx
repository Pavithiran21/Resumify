import { IconAlertCircle } from '@tabler/icons-react';
import { useId } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';

/**
 * "Delete this …?" (UI-UX.md screens 12, 13 and 14): a red icon tile, the title, what goes and
 * what stays, "can't be undone". The safe button ("Keep it") gets the first focus, and the dialog
 * can't be closed while the delete is running. children: extra content (the password field);
 * it sits inside the form, so Enter in it confirms.
 */
export function ConfirmDialog({
  icon: Icon,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Keep it',
  pending = false,
  error = null,
  onConfirm,
  onClose,
  children,
}) {
  const titleId = useId();
  const descriptionId = useId();

  function close() {
    if (!pending) {
      onClose();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm();
  }

  return (
    <Dialog role="alertdialog" labelledBy={titleId} describedBy={descriptionId} onClose={close}>
      <form noValidate onSubmit={handleSubmit}>
        <div className="ic">
          <Icon size={23} aria-hidden="true" />
        </div>
        <h2 id={titleId} className="t-lead">
          {title}
        </h2>
        <p id={descriptionId} className="muted m-0 text-sm">
          {description}
        </p>
        {children}
        {error && (
          <div className="note err mt-3.5" role="alert">
            <IconAlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <div className="acts">
          <Button data-autofocus onClick={close} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant="danger" type="submit" pending={pending}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
