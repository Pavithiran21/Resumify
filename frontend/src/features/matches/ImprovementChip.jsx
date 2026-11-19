import { IconEqual, IconTrendingDown, IconTrendingUp } from '@tabler/icons-react';
import { previousRun } from './runs';

/**
 * How the score moved since the run before (UI-UX.md "Run and version"): "Up 13 from run 1" in
 * green, or a neutral "Down 4 from run 1" / "Same as run 1". Nothing for the first run.
 */
export function ImprovementChip({ match, runs }) {
  const previous = previousRun(runs, match.id);
  if (!previous) {
    return null;
  }
  const change = match.score - previous.score;
  if (change > 0) {
    return (
      <span className="chip c-match">
        <IconTrendingUp size={16} aria-hidden="true" /> Up {change} from run {previous.runNumber}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="chip c-weak">
        <IconTrendingDown size={16} aria-hidden="true" /> Down {-change} from run {previous.runNumber}
      </span>
    );
  }
  return (
    <span className="chip c-weak">
      <IconEqual size={16} aria-hidden="true" /> Same as run {previous.runNumber}
    </span>
  );
}
