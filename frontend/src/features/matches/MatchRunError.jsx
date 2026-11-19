import { IconAlertTriangle, IconHourglass, IconRefresh, IconRefreshAlert } from '@tabler/icons-react';
import { errorMessage } from '../../lib/apiErrors';

/**
 * What went wrong when a match ran (UI-UX.md "States", Running a match), with the backend's own
 * message. Nothing was saved in every case, so "Try again" simply runs it again.
 * - 502 MATCH_SERVICE_FAILED: the model didn't answer (after one retry), or answered badly.
 * - 409 RESUME_CHANGED: a new version of the resume arrived while the match ran.
 * - 429: the 20-runs-an-hour limit.
 * - 404: the resume or the job was deleted meanwhile.
 */
export function MatchRunError({ error, onRetry, children }) {
  const retry = onRetry && (
    <button type="button" className="btn btn-secondary btn-sm mt-2.5" onClick={onRetry}>
      <IconRefresh size={18} aria-hidden="true" /> Try again
    </button>
  );

  if (error?.code === 'MATCH_SERVICE_FAILED') {
    return (
      <div className="panel pad" role="alert" style={{ borderColor: 'rgb(209 36 63 / 0.35)' }}>
        <b>Couldn&apos;t finish the match</b>
        <div className="muted text-sm">The matching service didn&apos;t respond. Nothing was saved; try again.</div>
        <div className="flex flex-wrap gap-2.5">
          {retry}
          {children}
        </div>
      </div>
    );
  }

  const { kind, Icon, title, canRetry } = describe(error);
  return (
    <div role="alert">
      <div className={`note ${kind}`}>
        <Icon size={18} aria-hidden="true" />
        <span>
          <b>{title}</b>
          <br />
          {errorMessage(error)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {canRetry && retry}
        {children}
      </div>
    </div>
  );
}

/** The look of the other errors. Trying again at once can't help with the hourly limit. */
function describe(error) {
  if (error?.code === 'RESUME_CHANGED') {
    return { kind: 'warn', Icon: IconRefreshAlert, title: 'Resume changed', canRetry: true };
  }
  if (error?.status === 429) {
    return { kind: 'warn', Icon: IconHourglass, title: 'Match limit', canRetry: false };
  }
  return { kind: 'err', Icon: IconAlertTriangle, title: "Couldn't run the match", canRetry: true };
}
