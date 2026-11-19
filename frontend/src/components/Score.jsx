import { scoreLabel, verdictOf } from '../lib/verdicts';

const RING_RADIUS = 20;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * A score in a list: a ring filled to the score in its verdict's colour, "32%" in the middle and
 * the verdict word beside it, so the number says what it means without a column header.
 * Read out as "32, weak match".
 */
export function ScoreRing({ score, verdict }) {
  const { ring, short } = verdictOf(verdict);
  const filled = (Math.min(Math.max(score, 0), 100) / 100) * RING_LENGTH;
  return (
    <span className={`score-ring ${ring}`} role="img" aria-label={scoreLabel(score, verdict)}>
      <span className="dial">
        <svg viewBox="0 0 50 50" aria-hidden="true">
          <circle className="tint" cx="25" cy="25" r={RING_RADIUS} />
          <circle className="track" cx="25" cy="25" r={RING_RADIUS} />
          {/* Starts at 12 o'clock and runs clockwise. */}
          <circle
            className="arc"
            cx="25"
            cy="25"
            r={RING_RADIUS}
            strokeDasharray={`${filled} ${RING_LENGTH}`}
            transform="rotate(-90 25 25)"
          />
        </svg>
        <b>{score}%</b>
      </span>
      <span className="word">{short}</span>
    </span>
  );
}

/** A list card's best score: "Best" with its ring, or "No matches yet" before the first match. */
export function BestScore({ score, verdict }) {
  if (score === null || score === undefined) {
    return <span className="dim text-[13px]">No matches yet</span>;
  }
  return (
    <span className="best">
      <span className="best-cap">Best</span>
      <ScoreRing score={score} verdict={verdict} />
    </span>
  );
}

/** The verdict with its own icon and label: "Good match" (short: "Good", used in Compare). */
export function VerdictChip({ verdict, short = false, className = '' }) {
  const { Icon, label, short: shortLabel, chip } = verdictOf(verdict);
  return (
    <span className={`chip ${chip} ${className}`}>
      <Icon size={16} aria-hidden="true" /> {short ? shortLabel : label}
    </span>
  );
}
