import { IconSparkles } from '@tabler/icons-react';
import { Skeleton } from '../../components/StatePanels';
import { MATCH_STEPS } from './matchSteps';

/** "Running your match…" (UI-UX.md "States"), a polite live region. */
export function RunningPanel() {
  return (
    <div className="panel pad" role="status" aria-live="polite">
      <b className="flex items-center gap-1.5">
        <IconSparkles size={18} className="text-accent" aria-hidden="true" /> Running your match…
      </b>
      <div className="dim text-[13px]">About 10 seconds. Nothing is saved until it finishes.</div>
      <ol className="run" aria-label="What Resumify is doing">
        {MATCH_STEPS.map(({ Icon, text }) => (
          <li key={text}>
            <span aria-hidden="true">
              <Icon size={16} />
            </span>
            {text}
          </li>
        ))}
      </ol>
      <Skeleton lines={2} />
    </div>
  );
}
