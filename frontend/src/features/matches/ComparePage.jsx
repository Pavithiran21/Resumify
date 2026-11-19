import { IconEqual, IconInfoCircle, IconTrendingDown, IconTrendingUp, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { compareRuns, getMatch } from '../../api/matches';
import { queryKeys } from '../../api/queryKeys';
import { VerdictChip } from '../../components/Score';
import { ErrorPanel, LoadingPanel, NotFoundPanel } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { isNotFound } from '../../lib/apiErrors';
import { formatDayShort } from '../../lib/dates';
import { verdictOf } from '../../lib/verdicts';
import { compareHref, useRuns } from './runs';

function runOption(run) {
  return `Run ${run.runNumber} · version ${run.resumeVersion} · ${run.score}`;
}

/**
 * The two run pickers. They list only runs of this resume and job, and each one leaves out the
 * run chosen in the other, so the backend's "same run twice" (400) and "different inputs" (422)
 * can't be reached from here.
 */
function RunPickers({ runs, first, second, onChange }) {
  const firstId = useId();
  const secondId = useId();
  return (
    <div className="filters mt-3">
      <label htmlFor={firstId} className="sr-only">
        First run
      </label>
      <select
        id={firstId}
        className="sel"
        value={first}
        onChange={(event) => onChange({ first: event.target.value, second })}
      >
        {runs
          .filter((run) => run.id !== second)
          .map((run) => (
            <option key={run.id} value={run.id}>
              {runOption(run)}
            </option>
          ))}
      </select>
      <span className="dim text-[13px] font-bold">vs</span>
      <label htmlFor={secondId} className="sr-only">
        Second run
      </label>
      <select
        id={secondId}
        className="sel"
        value={second}
        onChange={(event) => onChange({ first, second: event.target.value })}
      >
        {runs
          .filter((run) => run.id !== first)
          .map((run) => (
            <option key={run.id} value={run.id}>
              {runOption(run)}
            </option>
          ))}
      </select>
    </div>
  );
}

function ScoreChange({ change }) {
  if (change > 0) {
    return (
      <span className="chip c-match text-[15px]">
        <IconTrendingUp size={18} aria-hidden="true" /> +{change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="chip c-weak text-[15px]">
        <IconTrendingDown size={18} aria-hidden="true" /> −{-change}
      </span>
    );
  }
  return (
    <span className="chip c-weak text-[15px]">
      <IconEqual size={18} aria-hidden="true" /> No change
    </span>
  );
}

/** "Version 1" when the versions differ, otherwise "Run 1" (two runs of the same version). */
function columnLabel(run, other) {
  return run.resumeVersion !== other.resumeVersion ? `Version ${run.resumeVersion}` : `Run ${run.runNumber}`;
}

/** "Version 1 · run 1 · 30 Oct", or "Run 1 · 30 Oct" when both runs used the same version. */
function runCaption(run, other) {
  const parts = [columnLabel(run, other)];
  if (run.resumeVersion !== other.resumeVersion) {
    parts.push(`run ${run.runNumber}`);
  }
  parts.push(formatDayShort(run.createdAt));
  return parts.join(' · ');
}

function StatusCell({ status, highlight }) {
  if (status === null) {
    return <div className="dim">not in this run</div>;
  }
  return <div className={highlight && status === 'matched' ? 'up' : 'dim'}>{status}</div>;
}

/** The two scores side by side, with the change between them. */
function ScoreDuel({ result }) {
  const { first, second } = result;
  return (
    <div className="vs">
      <div>
        <span className={`score v-text ${verdictOf(first.verdict).ring}`}>{first.score}</span>
        <div className="cap">{runCaption(first, second)}</div>
        <VerdictChip verdict={first.verdict} short className="mt-2" />
      </div>
      <ScoreChange change={result.scoreChange} />
      <div>
        <span className={`score v-text ${verdictOf(second.verdict).ring}`}>{second.score}</span>
        <div className="cap">{runCaption(second, first)}</div>
        <VerdictChip verdict={second.verdict} short className="mt-2" />
      </div>
    </div>
  );
}

/** What changed between the two runs (skills, then the skill and keyword totals) and what is still missing. */
function ChangesTable({ result }) {
  const { first, second } = result;
  const firstLabel = columnLabel(first, second);
  const secondLabel = columnLabel(second, first);
  const skillsUp = second.skills.matched > first.skills.matched;
  const keywordsUp = second.keywords.matched > first.keywords.matched;
  return (
    <>
      <div className="diff" role="table" aria-label="What changed">
        <div role="row" className="contents">
          <div role="columnheader" className="hd">
            What changed
          </div>
          <div role="columnheader" className="hd">
            {firstLabel}
          </div>
          <div role="columnheader" className="hd">
            {secondLabel}
          </div>
        </div>
        {result.skillChanges.map((change) => (
          <div role="row" className="contents" key={change.name}>
            <div role="cell">
              <span className={`chip sm ${change.second === 'matched' ? 'c-match' : 'c-miss'}`}>{change.name}</span>
            </div>
            <div role="cell">
              <StatusCell status={change.first} highlight={false} />
            </div>
            <div role="cell">
              <StatusCell status={change.second} highlight />
            </div>
          </div>
        ))}
        {result.skillChanges.length === 0 && (
          <div role="row" className="contents">
            <div role="cell" className="muted col-span-3">
              No skill changed between these runs.
            </div>
          </div>
        )}
        <div role="row" className="contents">
          <div role="cell">Skills</div>
          <div role="cell">
            {first.skills.matched} / {first.skills.total}
          </div>
          <div role="cell" className={skillsUp ? 'up' : ''}>
            {second.skills.matched} / {second.skills.total}
          </div>
        </div>
        <div role="row" className="contents">
          <div role="cell">Keywords</div>
          <div role="cell">
            {first.keywords.matched} / {first.keywords.total}
          </div>
          <div role="cell" className={keywordsUp ? 'up' : ''}>
            {second.keywords.matched} / {second.keywords.total}
          </div>
        </div>
      </div>
      <h2 className="sub" id="still-missing-title">
        Still missing
      </h2>
      {result.stillMissing.length > 0 ? (
        <ul className="kw list-none p-0" aria-labelledby="still-missing-title">
          {result.stillMissing.map((name) => (
            <li key={name} className="chip c-miss">
              <IconX size={16} aria-hidden="true" /> {name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted m-0 text-sm">Nothing: every skill the job names is matched in the second run.</p>
      )}
    </>
  );
}

/**
 * Compare runs (UI-UX.md screen 7): /matches/compare?first=…&second=…. The first match tells which
 * resume and job these are, so the pickers can list only their runs.
 */
export function ComparePage() {
  usePageTitle('Compare runs');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const first = searchParams.get('first') ?? '';
  const second = searchParams.get('second') ?? '';

  const firstMatch = useQuery({
    queryKey: queryKeys.matches.detail(first),
    queryFn: () => getMatch(first),
    enabled: Boolean(first),
  });
  const runs = useRuns(firstMatch.data?.resumeId, firstMatch.data?.jobId);
  const comparison = useQuery({
    queryKey: queryKeys.matches.compare(first, second),
    queryFn: () => compareRuns(first, second),
    enabled: Boolean(first && second && first !== second),
  });

  if (!first || !second || first === second) {
    return <NotFoundPanel />;
  }
  const failed = [firstMatch, comparison].find((query) => query.isError);
  if (failed) {
    // A 400 or 422 means a hand-edited link: it isn't a pair this user can compare.
    const status = failed.error?.status;
    return isNotFound(failed.error) || status === 400 || status === 422 ? (
      <NotFoundPanel />
    ) : (
      <ErrorPanel error={failed.error} onRetry={failed.refetch} />
    );
  }

  const result = comparison.data;
  return (
    <>
      <div className="screen-head">
        <div className="grow">
          <div className="crumbs">
            <Link to="/matches">Matches</Link> /{' '}
            <Link to={`/matches/${second}`}>{firstMatch.data?.jobCompany ?? firstMatch.data?.jobTitle ?? 'Result'}</Link>{' '}
            / Compare
          </div>
          <h1 className="t-screen">Compare two runs</h1>
        </div>
      </div>
      {/* The runs and their scores beside what changed; they stack below 1150 px (.grid2). */}
      {result ? (
        <div className="grid2 mt-4">
          <div className="panel pad">
            <div className="muted text-sm [overflow-wrap:anywhere]">
              {result.resumeFileName} · {result.jobTitle}
              {result.jobCompany && ` at ${result.jobCompany}`}
            </div>
            {runs.data && (
              <RunPickers
                runs={runs.data}
                first={first}
                second={second}
                onChange={(next) => navigate(compareHref(runs.data, next.first, next.second), { replace: true })}
              />
            )}
            <ScoreDuel result={result} />
            <div className="note inf mt-4">
              <IconInfoCircle size={18} aria-hidden="true" />
              <span>
                A new version changes the score only through what it says. Running the same version against the same
                job again gives the same score.
              </span>
            </div>
          </div>
          <div className="panel pad">
            <ChangesTable result={result} />
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <LoadingPanel lines={5} label="Comparing the runs" />
        </div>
      )}
    </>
  );
}
