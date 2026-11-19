import { IconArrowRight, IconBulb, IconSparkles, IconUpload } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { listJobs } from '../../api/jobs';
import { getMatch, listMatches } from '../../api/matches';
import { queryKeys } from '../../api/queryKeys';
import { listResumes } from '../../api/resumes';
import { useAuth } from '../../auth/AuthContext';
import { Gauge } from '../../components/Gauge';
import { VerdictChip } from '../../components/Score';
import { EmptyPanel, ErrorPanel, Skeleton } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatDayShort } from '../../lib/dates';
import { MAX_RESUMES } from '../../lib/files';
import { CompareButton } from '../matches/CompareButton';
import { ImprovementChip } from '../matches/ImprovementChip';
import { MatchTable } from '../matches/MatchTable';
import { useRuns } from '../matches/runs';

const RECENT_PARAMS = { size: 3 };
// Only the counts are needed: totalItems of a one-item page.
const COUNT_PARAMS = { size: 1 };
const HOME_TIPS = 2;

/**
 * The latest result (UI-UX.md screen 4): a mini gauge, the verdict, how the score moved since the
 * run before, the summary, Open result, Compare runs, and the first two "Fix these first" tips.
 * The glowing panel of the Home screen.
 */
function LatestResult({ summary }) {
  const detail = useQuery({ queryKey: queryKeys.matches.detail(summary.id), queryFn: () => getMatch(summary.id) });
  const { data: runs } = useRuns(summary.resumeId, summary.jobId);
  const match = detail.data;

  return (
    <section className="panel glow pad flex flex-col" aria-labelledby="latest-title">
      <h2 className="sub first">Latest result</h2>
      <div className="latest">
        <Gauge score={summary.score} verdict={summary.verdict} size="mini" />
        <div className="min-w-0">
          <h3 id="latest-title" className="t-lead m-0 [overflow-wrap:anywhere]">
            {summary.jobTitle}
          </h3>
          <div className="muted text-sm [overflow-wrap:anywhere]">
            {summary.jobCompany && `${summary.jobCompany} · `}
            {summary.resumeFileName}
            <span className="ver">v{summary.resumeVersion}</span> · {formatDayShort(summary.createdAt)}
          </div>
          <div className="my-2.5 flex flex-wrap gap-2">
            <VerdictChip verdict={summary.verdict} />
            {runs && <ImprovementChip match={summary} runs={runs} />}
          </div>
          {match ? <p className="muted mt-0 mb-3.5 text-sm">{match.summary}</p> : <Skeleton lines={2} />}
          <div className="flex flex-wrap gap-2.5">
            <Link to={`/matches/${summary.id}`} className="btn btn-secondary btn-sm">
              Open result <IconArrowRight size={18} aria-hidden="true" />
            </Link>
            <CompareButton match={summary} runs={runs} size="sm" />
          </div>
        </div>
      </div>
      {match?.suggestions.length > 0 && (
        <div className="mt-auto">
          <h3 className="sub first flex items-center gap-1.5">
            <IconBulb size={18} className="text-accent" aria-hidden="true" /> Fix these first
          </h3>
          <ol className="fix">
            {match.suggestions.slice(0, HOME_TIPS).map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Library({ resumeCount, jobCount }) {
  return (
    <section className="panel pad" aria-labelledby="library-title">
      <h2 id="library-title" className="t-panel mt-0 mb-3">
        Your library
      </h2>
      <div className="lib">
        <Link to="/resumes">
          <small>Resumes</small>
          <b>{resumeCount ?? '–'}</b>
          <div className="dim text-xs">of {MAX_RESUMES} · private to you</div>
        </Link>
        <Link to="/jobs">
          <small>Jobs</small>
          <b>{jobCount ?? '–'}</b>
          <div className="dim text-xs">saved descriptions</div>
        </Link>
      </div>
    </section>
  );
}

/** "Welcome back, Meera": the first word of the name. */
function firstName(name) {
  return name.trim().split(/\s+/)[0];
}

/**
 * Home (UI-UX.md screen 4), the first screen after logging in: the latest result beside the three
 * newest matches and the library counts. Before the first match it shows "No matches yet".
 */
export function HomePage() {
  usePageTitle('Home');
  const { user } = useAuth();
  const recent = useQuery({ queryKey: queryKeys.matches.list(RECENT_PARAMS), queryFn: () => listMatches(RECENT_PARAMS) });
  const resumes = useQuery({ queryKey: queryKeys.resumes.list(COUNT_PARAMS), queryFn: () => listResumes(COUNT_PARAMS) });
  const jobs = useQuery({ queryKey: queryKeys.jobs.list(COUNT_PARAMS), queryFn: () => listJobs(COUNT_PARAMS) });

  const latest = recent.data?.items[0];
  const hasResumes = (resumes.data?.totalItems ?? 0) > 0;
  // One gradient button per screen: before the first match it is the empty state's action.
  const isEmpty = Boolean(recent.data && !latest);

  return (
    <>
      <div className="screen-head">
        <div className="grow">
          <div className="crumbs">Home</div>
          <h1 className="t-screen">Welcome back, {firstName(user.name)}</h1>
          <p className="muted mt-0.5 mb-0">Your latest result, and what to fix first.</p>
        </div>
        <Link to="/matches/new" className={`btn ${isEmpty ? 'btn-secondary' : 'btn-primary'}`}>
          <IconSparkles size={18} aria-hidden="true" /> New match
        </Link>
      </div>
      {recent.isPending && (
        <div className="home" aria-hidden="true">
          <div className="skel block h-72" />
          <div className="skel block h-72" />
        </div>
      )}
      {recent.isError && (
        <div className="mt-[18px]">
          <ErrorPanel error={recent.error} onRetry={recent.refetch} />
        </div>
      )}
      {isEmpty && (
        <div className="mt-[18px] max-w-xl">
          <EmptyPanel
            title="No matches yet"
            text="Upload a resume, add a job, and see how well they fit."
            action={
              hasResumes ? (
                <Link to="/matches/new" className="btn btn-primary">
                  <IconSparkles size={18} aria-hidden="true" /> Run your first match
                </Link>
              ) : (
                <Link to="/resumes" className="btn btn-primary">
                  <IconUpload size={18} aria-hidden="true" /> Upload a resume
                </Link>
              )
            }
          />
        </div>
      )}
      {latest && (
        <div className="home">
          <LatestResult key={latest.id} summary={latest} />
          <div className="flex min-w-0 flex-col gap-[18px]">
            <section className="panel pad" aria-labelledby="recent-title">
              <div className="flex items-center gap-2.5">
                <h2 id="recent-title" className="t-panel m-0 flex-1">
                  Recent matches
                </h2>
                <Link to="/matches" className="more">
                  All matches <IconArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <MatchTable matches={recent.data.items} />
            </section>
            <Library resumeCount={resumes.data?.totalItems} jobCount={jobs.data?.totalItems} />
          </div>
        </div>
      )}
    </>
  );
}
