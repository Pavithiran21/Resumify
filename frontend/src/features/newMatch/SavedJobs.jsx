import { IconArrowLeft, IconSparkles } from '@tabler/icons-react';
import { Button } from '../../components/Button';
import { formatDayShort } from '../../lib/dates';
import { formatNumber, plural } from '../../lib/numbers';
import { joinMeta } from '../matches/runs';

/** A saved job (UI-UX.md screen 6, "Saved jobs"): a native radio group, then "Run match". */
export function SavedJobs({ jobs, jobId, onChange, onRun, onBack, onNewJob }) {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onRun();
      }}
    >
      {jobs.length === 0 ? (
        <p className="muted mt-0 text-sm">
          No saved jobs yet.{' '}
          <button type="button" className="link" onClick={onNewJob}>
            Add a new job
          </button>
        </p>
      ) : (
        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">Saved jobs</legend>
          <div className="option-list">
            {jobs.map((job) => (
              <label key={job.id} className="file option">
                <input
                  type="radio"
                  name="job"
                  value={job.id}
                  checked={job.id === jobId}
                  onChange={() => onChange(job.id)}
                />
                <span className="grow">
                  <b>{job.title}</b>
                  <span className="dim block text-[13px]">
                    {joinMeta([
                      job.company,
                      formatDayShort(job.createdAt),
                      `${formatNumber(job.characterCount)} characters`,
                    ])}
                  </span>
                </span>
                <span className="dim text-[13px] whitespace-nowrap">{plural(job.matchCount, 'match', 'matches')}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="mt-4 flex flex-wrap justify-between gap-2.5">
        <Button onClick={onBack}>
          <IconArrowLeft size={18} aria-hidden="true" /> Back
        </Button>
        <Button variant="primary" type="submit" disabled={!jobId}>
          <IconSparkles size={18} aria-hidden="true" /> Run match
        </Button>
      </div>
    </form>
  );
}
