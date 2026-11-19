import { IconAlertCircle, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useId, useState } from 'react';

/**
 * Form fields (UI-UX.md "Labels and roles"): a visible label, "(optional)" where it applies, a
 * leading icon, the error under the field with aria-invalid and aria-describedby, then the hint.
 * React Hook Form's register() spreads onto the input; ref is a normal prop in React 19.
 */
function FieldShell({ inputId, label, optional, error, hint, className = '', children }) {
  return (
    <div className={`field ${error ? 'bad' : ''} ${className}`}>
      <label htmlFor={inputId}>
        {label}
        {optional && <span className="opt"> (optional)</span>}
      </label>
      {children}
      {error && (
        <div className="ferr" id={`${inputId}-error`}>
          <IconAlertCircle size={16} aria-hidden="true" /> <span>{error}</span>
        </div>
      )}
      {hint && (
        <div className="hint" id={`${inputId}-hint`}>
          {hint}
        </div>
      )}
    </div>
  );
}

function describedBy(inputId, error, hint) {
  const ids = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

export function TextField({ label, optional, icon: Icon, error, hint, end, className, id, ref, ...inputProps }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell inputId={inputId} label={label} optional={optional} error={error} hint={hint} className={className}>
      <div className={`inp ${end ? 'with-end' : ''}`}>
        {Icon && <Icon size={18} className="lead" aria-hidden="true" />}
        <input
          id={inputId}
          ref={ref}
          className="ctl"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(inputId, error, hint)}
          {...inputProps}
        />
        {end}
      </div>
    </FieldShell>
  );
}

/** A password field with a show/hide button (a real button, so it works from the keyboard). */
export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? IconEyeOff : IconEye;
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      end={
        <button
          type="button"
          className="end"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          <Icon size={18} aria-hidden="true" />
        </button>
      }
    />
  );
}

/** A textarea; hint can be any node (the job description puts the upload link and the counter there). */
export function TextAreaField({ label, error, hint, className, id, ref, ...textareaProps }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell inputId={inputId} label={label} error={error} hint={hint} className={className}>
      <textarea
        id={inputId}
        ref={ref}
        className="ctl"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        {...textareaProps}
      />
    </FieldShell>
  );
}
