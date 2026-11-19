import { IconInfoCircle, IconSparkles } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { listJobs } from '../../api/jobs';
import { queryKeys } from '../../api/queryKeys';
import { CompanyBadge } from '../../components/CompanyBadge';
import { Pager } from '../../components/Pager';
import { BestScore } from '../../components/Score';
import { ErrorPanel, LoadingPanel } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useSearchParamsState } from '../../hooks/useSearchParamsState';
import { formatDayShort } from '../../lib/dates';
import { formatNumber, plural } from '../../lib/numbers';
import { joinMeta } from '../matches/runs';

const PAGE_SIZE = 20;

/**
 * The saved jobs as cards (owner's choice, 8 Nov 2026): the company badge, the title (its link
 * covers the whole card), the company, when it was added, its length and matches, the best match
 * score, and "Match" to run a new match with this job.
 */
function JobCards({ jobs }) {
  return (
    <ul className="card-grid">
      {jobs.map((job) => (
        <li key={job.id} className="lcard">
          <div className="lcard-head">
            <CompanyBadge name={job.company || job.title} />
            <div className="min-w-0">
              <Link to={`/jobs/${job.id}`} className="lcard-title">
                {job.title}
              </Link>
              <div className="muted text-sm">{job.company || 'No company given'}</div>
            </div>
          </div>
          <div className="meta">
            {joinMeta([
              `Added ${formatDayShort(job.createdAt)}`,
              `${formatNumber(job.characterCount)} characters`,
              plural(job.matchCount, 'match', 'matches'),
            ])}
          </div>
          <div className="lcard-foot">
            <BestScore score={job.bestScore} verdict={job.bestVerdict} />
            <Link to={`/matches/new?jobId=${job.id}`} className="btn btn-secondary btn-sm" aria-label={`Match a resume with ${job.title}`}>
              <IconSparkles size={16} aria-hidden="true" /> Match
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Jobs (UI-UX.md screen 12): the saved job descriptions, newest first. Jobs are added in New match
 * and can't be edited, so past matches stay true to the ad they were run against.
 */
export function JobsPage() {
  usePageTitle('Jobs');
  const [filters, setFilters] = useSearchParamsState(['page']);
  const page = Number(filters.page) || 1;
  const params = { page, size: PAGE_SIZE };
  const jobs = useQuery({
    queryKey: queryKeys.jobs.list(params),
    queryFn: () => listJobs(params),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="screen-head">
        <div className="grow">
          <div className="crumbs">Jobs</div>
          <h1 className="t-screen">Your jobs</h1>
        </div>
        <Link to="/matches/new" className="btn btn-primary">
          <IconSparkles size={18} aria-hidden="true" /> New match
        </Link>
      </div>
      <div className="mt-[18px]">
        {jobs.isPending && <LoadingPanel lines={5} label="Loading jobs" />}
        {jobs.isError && <ErrorPanel error={jobs.error} onRetry={jobs.refetch} />}
        {jobs.data && (
          <section className="panel pad" aria-label="Your jobs">
            {jobs.data.totalItems === 0 ? (
              <p className="muted mt-0 text-sm">No jobs yet. Add one when you run a new match.</p>
            ) : (
              <JobCards jobs={jobs.data.items} />
            )}
            <Pager data={jobs.data} onPage={(next) => setFilters({ page: next })} />
            <div className="hint flex gap-1.5">
              <IconInfoCircle size={16} className="mt-0.5 flex-none" aria-hidden="true" />
              <span>
                Jobs are added in New match. A saved job can&apos;t be edited: if the ad changes, add it again, so past
                matches stay true.
              </span>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
