import { IconAlertCircle } from '@tabler/icons-react';

/** An error that belongs to the whole form, not one field (a rate limit, an unexpected error). */
export function FormAlert({ message }) {
  if (!message) {
    return null;
  }
  return (
    <div className="note err mb-4" role="alert">
      <IconAlertCircle size={18} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
