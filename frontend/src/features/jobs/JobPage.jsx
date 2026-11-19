import { IconSparkles, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { invalidateLibrary } from '../../api/invalidate';
import { deleteJob, getJob } from '../../api/jobs';
import { listMatches } from '../../api/matches';
import { queryKeys } from '../../api/queryKeys';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorPanel, LoadingPanel, NotFoundPanel, Skeleton } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { errorMessage, isNetworkError, isNotFound } from '../../lib/apiErrors';
import { formatDay } from '../../lib/dates';
import { formatNumber, plural } from '../../lib/numbers';
import { useToast } from '../../toast/ToastContext';
import { MatchTable } from '../matches/MatchTable';
import { joinMeta } from '../matches/runs';

const MATCHES_SHOWN = 20;

/** "React Developer at Harbor Labs", or the title alone. */
function jobName(job) {
  return job.company ? `${job.title} at ${job.company}` : job.title;
}

/**
 * Delete this job? (UI-UX.md screen 12): the job and its matches go; the resumes stay. The toast
 * gives the count only, never the job's title or text.
 */
function DeleteJobDialog({ job, onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast, showError } = useToast();
  const remove = useMutation({
    mutationFn: () => deleteJob(job.id),
    onSuccess: () => {
      navigate('/jobs', { replace: true });
      queryClient.removeQueries({ queryKey: queryKeys.jobs.detail(job.id) });
      invalidateLibrary(queryClient);
      showToast({
        message: `Job and its ${plural(job.matchCount, 'match', 'matches')} deleted`,
        icon: IconTrash,
        iconColor: 'var(--color-danger)',
      });
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        showError(error.message, { network: true });
      }
    },
  });

  return (
    <ConfirmDialog
      icon={IconTrash}
      title="Delete this job?"
      description={
        <>
          <b className="[overflow-wrap:anywhere]">{jobName(job)}</b> and its {plural(job.matchCount, 'match', 'matches')}{' '}
          will be removed for good. Your resumes stay. This can&apos;t be undone.
        </>
      }
      confirmLabel="Delete job"
      pending={remove.isPending}
      error={remove.error && !isNetworkError(remove.error) ? errorMessage(remove.error) : null}
      onConfirm={() => remove.mutate()}
      onClose={onClose}
    />
  );
}

/** The job's matches, newest first, each opening its result (like a resume's view). */
function JobMatches({ job }) {
  const params = { jobId: job.id, size: MATCHES_SHOWN };
  const matches = useQuery({ queryKey: queryKeys.matches.list(params), queryFn: () => listMatches(params) });
  if (matches.isPending) {
    return <Skeleton lines={3} />;
  }
  if (matches.isError) {
    return <ErrorPanel error={matches.error} onRetry={matches.refetch} />;
  }
  // No second "Match a resume" link here: the job's own panel already has it as its main button.
  if (matches.data.totalItems === 0) {
    return <p className="muted m-0 text-sm">No matches with this job yet.</p>;
  }
  return (
    <>
      <MatchTable matches={matches.data.items} variant="job" caption="Matches with this job" />
      {matches.data.totalItems > MATCHES_SHOWN && (
        <Link to={`/matches?jobId=${job.id}`} className="more">
          All {matches.data.totalItems} matches
        </Link>
      )}
    </>
  );
}

function JobView({ job }) {
  const [deleting, setDeleting] = useState(false);
  // The job with its full description on top, its matches below at full width (owner's choice:
  // side by side, the long job card stood next to a short matches card).
  return (
    <>
      <section className="panel pad" aria-labelledby="job-title">
        <div className="crumbs">
          <Link to="/jobs">Jobs</Link> /
        </div>
        <h1 id="job-title" className="t-card mt-0.5 mb-0 [overflow-wrap:anywhere]">
          {job.title}
        </h1>
        <div className="muted text-sm">
          {joinMeta([
            job.company,
            `saved ${formatDay(job.createdAt)}`,
            `${formatNumber(job.characterCount)} characters`,
            plural(job.matchCount, 'match', 'matches'),
          ])}
        </div>
        <h2 className="sub">Description</h2>
        {/* Shown in full as plain text (no HTML), so nothing scrolls inside it. */}
        <div className="desc" role="region" aria-label="Job description">
          {job.description}
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link to={`/matches/new?jobId=${job.id}`} className="btn btn-primary">
            <IconSparkles size={18} aria-hidden="true" /> Match a resume
          </Link>
          <Button variant="danger" onClick={() => setDeleting(true)}>
            <IconTrash size={18} aria-hidden="true" /> Delete job
          </Button>
        </div>
        {deleting && <DeleteJobDialog job={job} onClose={() => setDeleting(false)} />}
      </section>
      <section className="panel pad mt-[18px]" aria-labelledby="job-matches-title">
        <h2 id="job-matches-title" className="t-panel mt-0 mb-2.5">
          Matches with this job
        </h2>
        <JobMatches job={job} />
      </section>
    </>
  );
}

/** The read-only job view (UI-UX.md screen 12): /jobs/:jobId. Jobs can't be edited. */
export function JobPage() {
  const { jobId } = useParams();
  const query = useQuery({ queryKey: queryKeys.jobs.detail(jobId), queryFn: () => getJob(jobId) });
  usePageTitle(query.data ? query.data.title : 'Job');

  if (query.isPending) {
    return <LoadingPanel lines={6} label="Loading the job" />;
  }
  if (query.isError) {
    return isNotFound(query.error) ? <NotFoundPanel /> : <ErrorPanel error={query.error} onRetry={query.refetch} />;
  }
  return <JobView job={query.data} />;
}
