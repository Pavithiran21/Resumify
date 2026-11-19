import { IconSend } from '@tabler/icons-react';
import { Gauge } from '../../components/Gauge';
import { VerdictChip } from '../../components/Score';
import { formatDayTime } from '../../lib/dates';
import { verdictOf } from '../../lib/verdicts';
import { ImprovementChip } from './ImprovementChip';
import { ScoreRuleNote } from './ScoreRuleNote';

function percent(part, whole) {
  return whole > 0 ? Math.round(Math.min(1, part / whole) * 100) : 0;
}

/** One breakdown tile: label, value, and a bar (or a note when the part is left out). */
function Tile({ label, value, fill, note }) {
  return (
    <div>
      <small>{label}</small>
      <b className={note ? 'na' : ''}>{value}</b>
      {note ? (
        <div className="dim note-line text-[13px]">{note}</div>
      ) : (
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${fill}%` }} />
        </div>
      )}
    </div>
  );
}

/**
 * Skills x of y, keywords x of y, experience (UI-UX.md "Breakdown tiles"). A part the job doesn't
 * have (no skills found, no years asked) is left out of the score, and the tile says so.
 */
function Breakdown({ breakdown }) {
  const { skills, keywords, experience } = breakdown;
  return (
    <div className="bk">
      {skills.total > 0 ? (
        <Tile label="Skills" value={`${skills.matched} of ${skills.total}`} fill={percent(skills.matched, skills.total)} />
      ) : (
        <Tile label="Skills" value="None found" note="The job names no skills Resumify knows, so this part is left out." />
      )}
      {keywords.total > 0 ? (
        <Tile
          label="Keywords"
          value={`${keywords.matched} of ${keywords.total}`}
          fill={percent(keywords.matched, keywords.total)}
        />
      ) : (
        <Tile label="Keywords" value="None found" note="The job has no keywords to look for." />
      )}
      <ExperienceTile experience={experience} />
    </div>
  );
}

/** "3 yrs / 3+" (bar full), "3 yrs / 4+" (bar 75%), or "Not asked" when the job asks for no years. */
function ExperienceTile({ experience }) {
  const { resumeYears, requiredYears } = experience;
  if (requiredYears === null) {
    return (
      <Tile
        label="Experience"
        value="Not asked"
        note="The job asks for no years, so this part is left out of the score."
      />
    );
  }
  const value = resumeYears === null ? `None found / ${requiredYears}+` : `${resumeYears} yrs / ${requiredYears}+`;
  return <Tile label="Experience" value={value} fill={percent(resumeYears ?? 0, requiredYears)} />;
}

/**
 * The top of the result (UI-UX.md screen 5): the half-gauge score with its verdict, how the score
 * moved since the run before, the one-line summary, the resume and version, run "N of M", the date,
 * the breakdown, and where the score comes from.
 */
export function ResultHero({ match, runs }) {
  return (
    <section className={`hero ${verdictOf(match.verdict).ring}`} aria-label="Score">
      <Gauge score={match.score} verdict={match.verdict} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <VerdictChip verdict={match.verdict} />
          <ImprovementChip match={match} runs={runs} />
          {/* When to apply, by verdict (owner's bands: 85+ ready, 60+ after the fixes, 40+ tailor first). */}
          <span className="advice">
            <IconSend size={16} aria-hidden="true" /> {verdictOf(match.verdict).advice}
          </span>
        </div>
        <p className="t-lead font-display mt-2.5 mb-1.5 font-semibold text-strong">{match.summary}</p>
        <p className="muted m-0 [overflow-wrap:anywhere]">
          Resume <b>{match.resumeFileName}</b>
          <span className="ver">v{match.resumeVersion}</span> · run {match.runNumber} of {match.runCount} ·{' '}
          {formatDayTime(match.createdAt)}
        </p>
        <Breakdown breakdown={match.breakdown} />
        <ScoreRuleNote className="mt-3" />
      </div>
    </section>
  );
}
