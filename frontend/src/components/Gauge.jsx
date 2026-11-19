import { verdictOf } from '../lib/verdicts';

// The half-circle arc is pi x 130 long (radius 130), so a score S draws S/100 of it.
const ARC_LENGTH = 408.4;
const ARC = 'M30 170 A130 130 0 0 1 290 170';

/**
 * The half-gauge match score (UI-UX.md "Match result", the signature visual). The arc and the
 * number are in the verdict's colour, the same as the score rings in the lists (owner's choice:
 * green 85+, amber 60+, orange 40+, grey below). The value arc fills once from 0 when the result
 * opens (the .arc keyframe, off under prefers-reduced-motion).
 * size: "hero" (320 px, 260 on phones) or "mini" (Home's latest result).
 */
export function Gauge({ score, verdict, size = 'hero' }) {
  const filled = ((Math.max(0, Math.min(100, score)) / 100) * ARC_LENGTH).toFixed(1);
  const { label, ring } = verdictOf(verdict);
  return (
    <div
      className={`gauge ${ring} ${size === 'mini' ? 'mini' : ''}`}
      role="img"
      aria-label={`Match score ${score} out of 100, ${label.toLowerCase()}`}
    >
      <svg viewBox="0 0 320 190" aria-hidden="true" focusable="false">
        <path d={ARC} fill="none" style={{ stroke: 'var(--color-stroke)' }} strokeWidth="22" strokeLinecap="round" />
        <g style={{ stroke: 'var(--color-stroke2)' }} strokeWidth="2">
          <path d="M30 170h-10M290 170h10M160 40v-10" />
        </g>
        {score > 0 && (
          <path
            className="arc"
            d={ARC}
            fill="none"
            style={{ stroke: 'var(--ring)' }}
            strokeWidth="22"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${ARC_LENGTH}`}
          />
        )}
      </svg>
      <div className="num">
        <b className="v-text">{score}</b>
        {size === 'hero' && <div className="muted text-[13px] font-semibold">out of 100</div>}
      </div>
    </div>
  );
}
