import { Link, useNavigate } from 'react-router';
import { ScoreRing } from '../../components/Score';
import { formatDayShort } from '../../lib/dates';
import { joinMeta } from './runs';

/** What the meta line under the job title shows, per screen (the order follows the design). */
function metaLine(match, variant) {
  const day = formatDayShort(match.createdAt);
  const version = `v${match.resumeVersion}`;
  const run = `run ${match.runNumber}`;
  if (variant === 'resume') {
    // Inside a resume's view: the file is known, so only its version.
    return joinMeta([match.jobCompany, version, run, day]);
  }
  if (variant === 'job') {
    // Inside a job's view: the job is known, so the resume, its version, the run and the day.
    return joinMeta([`${match.resumeFileName} ${version}`, run, day]);
  }
  if (variant === 'full') {
    return joinMeta([match.jobCompany, day, `${match.resumeFileName} ${version}`, run]);
  }
  return joinMeta([match.jobCompany, day, version, run]);
}

/** The extra columns of Past matches on a wide screen (they hide below 1150 px, see index.css). */
function WideCells({ match }) {
  const resume = `${match.resumeFileName} v${match.resumeVersion}`;
  return (
    <>
      <td className="col-wide">{match.jobCompany || <span aria-hidden="true">–</span>}</td>
      <td className="col-wide">
        <span className="file-name" title={resume}>
          {resume}
        </span>
      </td>
      <td className="col-wide">{formatDayShort(match.createdAt)}</td>
      <td className="col-wide num">{match.runNumber}</td>
    </>
  );
}

/**
 * Rows of match summaries: job title, a meta line, and the score pill in its verdict colour. The
 * title is the link (for the keyboard and screen readers); a click anywhere on the row opens it too.
 * variant: "short" (Home), "full" (Past matches, with the file name), "resume" (a resume's view),
 * "job" (a job's view).
 * "full" gives company, resume, date and run their own columns on a wide screen, and shows the
 * meta line instead below 1150 px.
 */
export function MatchTable({ matches, variant = 'short', caption }) {
  const navigate = useNavigate();
  const wide = variant === 'full';
  return (
    <table className="tbl">
      {caption && <caption className="sr-only">{caption}</caption>}
      {wide && (
        <thead>
          <tr>
            <th scope="col">Job</th>
            <th scope="col" className="col-wide">
              Company
            </th>
            <th scope="col" className="col-wide">
              Resume
            </th>
            <th scope="col" className="col-wide">
              Date
            </th>
            <th scope="col" className="col-wide num">
              Run
            </th>
            <th scope="col" className="text-right">
              Score
            </th>
          </tr>
        </thead>
      )}
      <tbody>
        {matches.map((match) => (
          <tr
            key={match.id}
            onClick={(event) => {
              if (!event.target.closest('a')) {
                navigate(`/matches/${match.id}`);
              }
            }}
          >
            <td>
              <Link to={`/matches/${match.id}`} className="row-link">
                <b>{match.jobTitle}</b>
                <div className={wide ? 'meta meta-narrow' : 'meta'}>{metaLine(match, variant)}</div>
              </Link>
            </td>
            {wide && <WideCells match={match} />}
            {/* As narrow as the score ring, so the job title keeps the width. */}
            <td className="w-px text-right whitespace-nowrap">
              <ScoreRing score={match.score} verdict={match.verdict} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
