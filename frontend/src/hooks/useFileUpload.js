import { useState } from 'react';
import { errorMessage, isNetworkError } from '../lib/apiErrors';
import { useToast } from '../toast/ToastContext';

/**
 * One file upload with its row state for <FileRow> (UI-UX.md "Upload"):
 * { name, status: 'reading' | 'done' | 'error', progress, message }.
 *
 * - check(file) is the quick check before sending (type by name, size, empty); its message is
 *   shown without any request.
 * - upload(file, onProgress) sends the file and returns the backend's answer.
 * - onSuccess(answer) gives the row's done line (or null to clear the row).
 * The backend's own message is shown for a refused file (415, 413, 422, 409, 429). A dropped
 * connection is a toast as everywhere else, with a short line in the row.
 */
export function useFileUpload({ check, upload, onSuccess }) {
  const { showError } = useToast();
  const [state, setState] = useState(null);

  async function start(file) {
    const problem = check(file);
    if (problem) {
      setState({ name: file.name, status: 'error', message: problem });
      return;
    }
    setState({ name: file.name, status: 'reading', progress: 0 });
    try {
      const answer = await upload(file, (progress) =>
        setState((current) => (current?.status === 'reading' ? { ...current, progress } : current)),
      );
      const message = onSuccess(answer);
      setState(message ? { name: file.name, status: 'done', message } : null);
    } catch (error) {
      if (isNetworkError(error)) {
        showError(error.message, { network: true });
      }
      const message = errorMessage(error) ?? "Couldn't send the file. Try again.";
      setState({ name: file.name, status: 'error', message });
    }
  }

  return { state, start, reset: () => setState(null), busy: state?.status === 'reading' };
}
