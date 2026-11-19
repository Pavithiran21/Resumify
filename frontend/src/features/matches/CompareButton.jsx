import { IconArrowsDiff } from '@tabler/icons-react';
import { Link } from 'react-router';
import { compareLink } from './runs';

/**
 * "Compare runs": opens this run against the run before it. With one run only it is disabled,
 * with the hint "Upload a new version and run again to compare." (UI-UX.md "Run and version").
 */
export function CompareButton({ match, runs, size, showHint = true }) {
  const href = compareLink(runs, match.id);
  const sizeClass = size ? `btn-${size}` : '';
  if (href) {
    return (
      <Link to={href} className={`btn btn-secondary ${sizeClass}`}>
        <IconArrowsDiff size={18} aria-hidden="true" /> Compare runs
      </Link>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2.5">
      <button type="button" className={`btn btn-secondary ${sizeClass}`} disabled aria-describedby={`compare-hint-${match.id}`}>
        <IconArrowsDiff size={18} aria-hidden="true" /> Compare runs
      </button>
      <span id={`compare-hint-${match.id}`} className={showHint ? 'dim text-[13px]' : 'sr-only'}>
        Upload a new version and run again to compare.
      </span>
    </span>
  );
}
