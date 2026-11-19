import { IconCheck, IconChevronDown, IconQuote, IconSparkles, IconX } from '@tabler/icons-react';
import { useId, useState } from 'react';
import { markSkill } from '../../lib/markSkill';

/** A quote with the skill's own words marked. Text and <mark> only: the quote is never HTML. */
function MarkedQuote({ text, skillName }) {
  return markSkill(text, skillName).map((piece, index) =>
    typeof piece === 'string' ? piece : <mark key={index}>{piece.mark}</mark>,
  );
}

/**
 * One matched or missing skill as a small card in the skill grid (UI-UX.md "Result details"): the
 * chip, how it was matched and the reason. The JOB quote and, for a matched skill, the YOU quote
 * open with "Show quotes", so every card stays short and the grid stays even.
 */
export function SkillItem({ skill }) {
  const quotesId = useId();
  const [open, setOpen] = useState(false);
  const matched = skill.status === 'matched';
  const resumeQuote = matched ? skill.resumeQuote : null;
  const hasQuotes = Boolean(skill.jobQuote || resumeQuote);

  return (
    <div className="item" data-testid="skill-item">
      <div>
        <span className={`chip ${matched ? 'c-match' : 'c-miss'}`}>
          {matched ? <IconCheck size={16} aria-hidden="true" /> : <IconX size={16} aria-hidden="true" />}
          {skill.name}
          <span className="sr-only">{matched ? ', matched' : ', missing'}</span>
        </span>
        {matched && skill.matchedBy === 'ai' && (
          <span className="by ai">
            <IconSparkles size={14} aria-hidden="true" /> In other words
          </span>
        )}
        {matched && skill.matchedBy === 'text' && (
          <span className="by">
            <IconQuote size={14} aria-hidden="true" /> Word for word
          </span>
        )}
      </div>
      {skill.reason && <p>{skill.reason}</p>}
      {hasQuotes && (
        <>
          <button
            type="button"
            className="qx"
            aria-expanded={open}
            aria-controls={quotesId}
            onClick={() => setOpen((value) => !value)}
          >
            <IconChevronDown size={14} className={open ? 'rot' : ''} aria-hidden="true" />
            {open ? 'Hide quotes' : 'Show quotes'}
          </button>
          <dl id={quotesId} className="quote" hidden={!open}>
            {skill.jobQuote && (
              <>
                <dt>Job</dt>
                <dd>
                  <MarkedQuote text={skill.jobQuote} skillName={skill.name} />
                </dd>
              </>
            )}
            {resumeQuote && (
              <>
                <dt>You</dt>
                <dd>
                  <MarkedQuote text={resumeQuote} skillName={skill.name} />
                </dd>
              </>
            )}
          </dl>
        </>
      )}
    </div>
  );
}
