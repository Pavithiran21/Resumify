import { useState } from 'react';
import { applyFieldErrors, errorMessage, isNetworkError } from '../lib/apiErrors';
import { useToast } from '../toast/ToastContext';

/**
 * Where a failed submit's error goes (FRONTEND.md "Error display"): under its field when the
 * backend names one, a toast when the server couldn't be reached, otherwise a form-level alert.
 * Returns { formError, clearFormError, handleError(error, setError, fieldNames) }.
 */
export function useFormErrors() {
  const { showError } = useToast();
  const [formError, setFormError] = useState(null);

  function handleError(error, setError, fieldNames) {
    if (isNetworkError(error)) {
      showError(error.message, { network: true });
      return;
    }
    if (applyFieldErrors(error, setError, fieldNames)) {
      return;
    }
    setFormError(errorMessage(error));
  }

  return { formError, clearFormError: () => setFormError(null), handleError };
}
