// Turning API errors (api/client.js ApiError) into what the user sees.
// The backend's messages are the UI-UX.md texts ("States" and "Validation messages"), so they are
// shown as they come; only unexpected errors get a generic sentence.

export const SOMETHING_WENT_WRONG = 'Something went wrong. Please try again.';

/**
 * A 400, 409 or 422 with field details: show each message under its field and focus the first one.
 * Returns true when at least one field got an error.
 */
export function applyFieldErrors(error, setError, fieldNames) {
  const details = (error?.details ?? []).filter((detail) => fieldNames.includes(detail.field));
  details.forEach((detail, index) => {
    setError(detail.field, { type: 'server', message: detail.message }, { shouldFocus: index === 0 });
  });
  return details.length > 0;
}

/**
 * One sentence for an error that doesn't belong to a field, shown in place (a form alert, a file
 * row, an error panel). Null when the session ended (the app is already on Log in, whose toast says
 * why) or when the server couldn't be reached (that one is a toast, see isNetworkError).
 * A 429 keeps the backend's own text: "Too many attempts…" for log in and register, "You've run 20
 * matches this hour…" for match runs, "You've uploaded a lot of files this hour…" for uploads.
 */
export function errorMessage(error) {
  if (error?.code === 'SESSION_ENDED' || error?.status === 0) {
    return null;
  }
  if (!error?.status) {
    return SOMETHING_WENT_WRONG;
  }
  // A 502 from the match service has its own message ("Couldn't finish the match…"); any other
  // 5xx is unexpected and its text isn't meant for users.
  if (error.status >= 500 && error.code !== 'MATCH_SERVICE_FAILED') {
    return SOMETHING_WENT_WRONG;
  }
  return error.message ?? SOMETHING_WENT_WRONG;
}

/** True when the request never reached the server (a dropped connection, the backend down). */
export function isNetworkError(error) {
  return error?.status === 0;
}

/** True for "not found": a deleted item, a wrong id, or another user's item (they look the same). */
export function isNotFound(error) {
  return error?.status === 404;
}
