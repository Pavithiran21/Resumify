import { MATCH_STEPS } from '../matches/matchSteps';
import { ScoreRuleNote } from '../matches/ScoreRuleNote';

/** The side panel of New match: what happens when you run a match, and how it is scored. */
export function HowMatchWorks() {
  return (
    <aside className="panel pad" aria-labelledby="how-title">
      <h2 id="how-title" className="t-panel mt-0 mb-1">
        How your match works
      </h2>
      <p className="muted mt-0 mb-0 text-sm">About 10 seconds. Nothing is saved until it finishes.</p>
      {/* Named by the heading, so it can't be mistaken for the step indicator ("Steps") above. */}
      <ol className="run" aria-labelledby="how-title">
        {MATCH_STEPS.map(({ Icon, text }) => (
          <li key={text}>
            <span aria-hidden="true">
              <Icon size={16} />
            </span>
            {text}
          </li>
        ))}
      </ol>
      <ScoreRuleNote className="mt-3" />
    </aside>
  );
}
