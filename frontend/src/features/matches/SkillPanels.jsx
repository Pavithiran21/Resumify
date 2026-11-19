import { IconBulb, IconCircleCheck, IconCircleX } from '@tabler/icons-react';
import { SkillItem } from './SkillItem';

/**
 * The skills of one side as a grid of small cards across the full width (3 columns on a wide
 * screen, 1 on a phone), so Missing and Matched never leave half the screen empty (owner, 8 Nov).
 */
function SkillGrid({ skills }) {
  return (
    <div className="skill-grid">
      {skills.map((skill) => (
        <SkillItem key={skill.name} skill={skill} />
      ))}
    </div>
  );
}

export function MissingPanel({ skills }) {
  return (
    <section className="panel pad sk mt-[18px]" aria-labelledby="missing-title">
      <h2 id="missing-title">
        <IconCircleX size={22} className="text-miss" aria-hidden="true" /> Missing
        <span className="chip c-miss ml-auto">{skills.length}</span>
      </h2>
      {skills.length === 0 && <p className="muted m-0 text-sm">Nothing missing: every skill the job names is here.</p>}
      <SkillGrid skills={skills} />
    </section>
  );
}

export function MatchedPanel({ skills }) {
  const anyByAi = skills.some((skill) => skill.matchedBy === 'ai');
  return (
    <section className="panel pad sk mt-[18px]" aria-labelledby="matched-title">
      <h2 id="matched-title">
        <IconCircleCheck size={22} className="text-match" aria-hidden="true" /> Matched
        <span className="chip c-match ml-auto">{skills.length}</span>
      </h2>
      {skills.length === 0 && <p className="muted m-0 text-sm">None of the job&apos;s skills are in this resume yet.</p>}
      <SkillGrid skills={skills} />
      {anyByAi && (
        <p className="dim mt-3 mb-0 text-xs">
          &ldquo;In other words&rdquo; means the AI found it, and Resumify checked that its quote is really in your
          resume.
        </p>
      )}
    </section>
  );
}

/** "Fix these first": the numbered suggestions, the one glowing panel of the result screen. */
export function FixFirstPanel({ suggestions }) {
  return (
    <section className="panel glow pad fix-panel" aria-labelledby="fix-title">
      <h2 id="fix-title" className="t-panel mt-0 mb-2.5 flex items-center gap-2">
        <IconBulb size={22} className="text-accent" aria-hidden="true" /> Fix these first
      </h2>
      {suggestions.length > 0 ? (
        <ol className="fix">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ol>
      ) : (
        <p className="muted m-0 text-sm">No suggestions for this run.</p>
      )}
    </section>
  );
}
