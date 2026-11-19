import { IconCheck, IconChevronDown, IconTags, IconX } from '@tabler/icons-react';

/**
 * The job's keywords (UI-UX.md "Job keywords"), collapsed in a details disclosure: "8 of 20 found"
 * with "Show all 20". Inside, the ones in the resume are green with a tick and the others red with
 * a cross, the same colours as matched and missing skills (owner's choice, 8 Nov 2026).
 */
export function KeywordsPanel({ keywords, counts }) {
  const total = counts.total;
  if (total === 0) {
    return null;
  }
  return (
    <details className="kwd panel pad mt-[18px]">
      <summary>
        <h2 className="t-panel m-0 flex flex-1 items-center gap-2">
          <IconTags size={22} className="text-info" aria-hidden="true" /> Job keywords
        </h2>
        <span className="chip c-info">
          {counts.matched} of {total} found
        </span>
        <span className="more">
          Show all {total} <IconChevronDown size={16} className="chev" aria-hidden="true" />
        </span>
      </summary>
      <ul className="kw mt-3 list-none p-0">
        {keywords.matched.map((keyword) => (
          <li key={keyword} className="chip sm c-match">
            <IconCheck size={14} aria-hidden="true" /> {keyword}
            <span className="sr-only">, in your resume</span>
          </li>
        ))}
        {keywords.missing.map((keyword) => (
          <li key={keyword} className="chip sm c-miss">
            <IconX size={14} aria-hidden="true" /> {keyword}
            <span className="sr-only">, not in your resume</span>
          </li>
        ))}
      </ul>
      <p className="dim mt-2.5 mb-0 text-xs">
        Green ones are in your resume; red ones aren&apos;t. The job&apos;s most repeated words and two-word terms,
        without its skills, title or company.
      </p>
    </details>
  );
}
