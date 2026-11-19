import { useQuery } from '@tanstack/react-query';
import { listMatches } from '../../api/matches';
import { queryKeys } from '../../api/queryKeys';

// A "run" is one match of a resume against a job. Runs of the same resume and job can be compared
// (US-10), and the result shows how the score moved since the run before.

/** Every run of one resume against one job, oldest first. */
export function useRuns(resumeId, jobId) {
  const params = { resumeId, jobId, sort: 'createdAt', size: 100 };
  return useQuery({
    queryKey: queryKeys.matches.list(params),
    queryFn: () => listMatches(params),
    enabled: Boolean(resumeId && jobId),
    select: (page) => page.items,
  });
}

/** The run just before this one, or null for the first run. */
export function previousRun(runs, matchId) {
  const index = (runs ?? []).findIndex((run) => run.id === matchId);
  return index > 0 ? runs[index - 1] : null;
}

/**
 * The compare link for two runs, older first, as the backend orders them (so the left picker and
 * the left score are the same run).
 */
export function compareHref(runs, idA, idB) {
  const indexA = runs.findIndex((run) => run.id === idA);
  const indexB = runs.findIndex((run) => run.id === idB);
  const [older, newer] = indexA <= indexB ? [idA, idB] : [idB, idA];
  return `/matches/compare?first=${older}&second=${newer}`;
}

/**
 * Where "Compare runs" goes from a result: this run against the run before it, or, for the first
 * run, against the latest one. Null when there is only one run (Compare is disabled then).
 */
export function compareLink(runs, matchId) {
  if (!runs || runs.length < 2) {
    return null;
  }
  const index = runs.findIndex((run) => run.id === matchId);
  if (index === -1) {
    return null;
  }
  const other = index > 0 ? runs[index - 1] : runs[runs.length - 1];
  return compareHref(runs, other.id, matchId);
}

/** "Northwind · 3 Nov · v2 · run 2": the parts that exist, joined with dots. */
export function joinMeta(parts) {
  return parts.filter(Boolean).join(' · ');
}
