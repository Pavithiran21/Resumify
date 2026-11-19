import { IconScale } from '@tabler/icons-react';

/** How the score is worked out: shown under a result and beside the New match steps. */
export function ScoreRuleNote({ className = '' }) {
  return (
    <p className={`dim mb-0 flex gap-1.5 text-[13px] ${className}`}>
      <IconScale size={16} className="mt-0.5 flex-none" aria-hidden="true" />
      <span>
        Score worked out by Resumify&apos;s rules (skills 60, keywords 25, experience 15), never by the AI. Same resume
        version and job, same score.
      </span>
    </p>
  );
}
