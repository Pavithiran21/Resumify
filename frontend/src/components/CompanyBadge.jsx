// Six calm colours, each with white text at 4.5:1 or more. The name picks one, so a company keeps
// its colour on every visit.
const BADGE_COLOURS = ['#0a66c2', '#0f766e', '#6d28d9', '#be185d', '#b45309', '#475569'];

/**
 * A job card's badge: the company's first letter (or the job title's, when there is no company)
 * on its colour, like the logo square on a job site. Decorative: the name is written beside it.
 */
export function CompanyBadge({ name }) {
  const text = (name || '?').trim() || '?';
  const sum = [...text].reduce((total, char) => total + char.codePointAt(0), 0);
  return (
    <span className="company-badge" style={{ background: BADGE_COLOURS[sum % BADGE_COLOURS.length] }} aria-hidden="true">
      {text.charAt(0).toUpperCase()}
    </span>
  );
}
