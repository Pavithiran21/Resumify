import { IconSparkles } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { invalidateLibrary } from '../../api/invalidate';
import { getMatch, runMatch } from '../../api/matches';
import { queryKeys } from '../../api/queryKeys';
import { Button } from '../../components/Button';
import { ErrorPanel, LoadingPanel, NotFoundPanel } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { isNetworkError, isNotFound } from '../../lib/apiErrors';
import { useToast } from '../../toast/ToastContext';
import { CompareButton } from './CompareButton';
import { KeywordsPanel } from './KeywordsPanel';
import { MatchRunError } from './MatchRunError';
import { ResultHero } from './ResultHero';
import { RunningPanel } from './RunningPanel';
import { useRuns } from './runs';
import { FixFirstPanel, MatchedPanel, MissingPanel } from './SkillPanels';

/**
 * "Run again": the same resume (at its current version) against the same job. With nothing
 * changed, the backend reuses the stored AI answer, so the score comes out the same.
 */
function useRunAgain(match) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast, showError } = useToast();
  return useMutation({
    mutationFn: () => runMatch(match.resumeId, match.jobId),
    onSuccess: (result) => {
      invalidateLibrary(queryClient);
      showToast({ message: `Match saved · score ${result.score}`, success: true });
      navigate(`/matches/${result.id}`);
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        showError(error.message, { network: true });
      }
    },
  });
}

function ResultBody({ match }) {
  const { data: runs } = useRuns(match.resumeId, match.jobId);
  const runAgain = useRunAgain(match);
  const matched = match.skills.filter((skill) => skill.status === 'matched');
  const missing = match.skills.filter((skill) => skill.status === 'missing');
  const runError = runAgain.error && !isNetworkError(runAgain.error) ? runAgain.error : null;

  return (
    <>
      <div className="screen-head">
        <div className="grow">
          <div className="crumbs">
            <Link to="/matches">Matches</Link> / {match.jobCompany ?? match.jobTitle}
          </div>
          <h1 className="t-screen">{match.jobTitle}</h1>
        </div>
        <CompareButton match={match} runs={runs} showHint={false} />
        <Button variant="primary" pending={runAgain.isPending} onClick={() => runAgain.mutate()}>
          {!runAgain.isPending && <IconSparkles size={18} aria-hidden="true" />} Run again
        </Button>
      </div>
      {match.runCount < 2 && (
        <p className="dim mt-2 mb-0 text-[13px]">Upload a new version and run again to compare.</p>
      )}
      {runAgain.isPending && (
        <div className="mt-3.5">
          <RunningPanel />
        </div>
      )}
      {runError && (
        <div className="mt-3.5">
          <MatchRunError error={runError} onRetry={() => runAgain.mutate()} />
        </div>
      )}
      <ResultHero match={match} runs={runs} />
      {/* What to fix comes first, then what's missing, then what matched, each across the full
          width with its skills in a grid (owner's choice: side-by-side lists left empty space). */}
      <FixFirstPanel suggestions={match.suggestions} />
      <MissingPanel skills={missing} />
      <MatchedPanel skills={matched} />
      <KeywordsPanel keywords={match.keywords} counts={match.breakdown.keywords} />
    </>
  );
}

/** The match result (UI-UX.md screen 5, the signature screen): /matches/:matchId. */
export function MatchResultPage() {
  const { matchId } = useParams();
  const query = useQuery({ queryKey: queryKeys.matches.detail(matchId), queryFn: () => getMatch(matchId) });
  usePageTitle(query.data ? query.data.jobTitle : 'Match result');

  if (query.isPending) {
    return <LoadingPanel lines={6} label="Loading the result" />;
  }
  if (query.isError) {
    return isNotFound(query.error) ? <NotFoundPanel /> : <ErrorPanel error={query.error} onRetry={query.refetch} />;
  }
  // key: a new result (after Run again) starts with fresh local state.
  return <ResultBody key={query.data.id} match={query.data} />;
}
