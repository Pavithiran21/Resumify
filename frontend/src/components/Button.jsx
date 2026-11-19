/**
 * A button that can show it is busy (UI-UX.md "Forms": a spinner, no double submit). While pending
 * it is disabled and marked aria-busy, and the spinner takes the place of the icon.
 * variant: primary (the one main action per screen), secondary, danger.
 */
export function Button({
  variant = 'secondary',
  size,
  pending = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ref,
  ...props
}) {
  const sizeClass = size ? `btn-${size}` : '';
  return (
    <button
      ref={ref}
      type={type}
      className={`btn btn-${variant} ${sizeClass} ${className}`}
      disabled={disabled || pending}
      aria-busy={pending ? 'true' : undefined}
      {...props}
    >
      {pending && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
