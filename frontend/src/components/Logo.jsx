import { useId } from 'react';

/**
 * The Resumify mark (UI-UX.md "Brand", owner's choice 8 Nov 2026): a white resume page with a
 * light-blue folded corner, a bold blue "R" and a small blue AI spark in the fold. The filter id
 * comes from useId, so several logos on one page don't share (and break) each other's ids.
 */
export function Logo({ size = 40, className = '' }) {
  const shadow = `${useId().replace(/:/g, '')}-shadow`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <filter id={shadow} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#0a2a5e" floodOpacity=".18" />
        </filter>
      </defs>
      {/* The page, with its top-right corner cut for the fold */}
      <path
        d="M14 4h28l14 14v38a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"
        fill="#fff"
        stroke="#cfdcef"
        strokeWidth="1.5"
        filter={`url(#${shadow})`}
      />
      {/* The folded corner */}
      <path d="M42 4v10a4 4 0 0 0 4 4h10z" fill="#dbe8f7" stroke="#cfdcef" strokeWidth="1.5" strokeLinejoin="round" />
      {/* The "R" */}
      <path
        transform="translate(1.5 1)"
        d="M20 48V18.5a1.5 1.5 0 0 1 1.5-1.5H32a9.5 9.5 0 0 1 2.4 18.7L42 46.2a1.2 1.2 0 0 1-1 1.8h-4.2a1.2 1.2 0 0 1-1-.5L29 36.5h-3.4V46.5A1.5 1.5 0 0 1 24.1 48H21.5A1.5 1.5 0 0 1 20 46.5z M25.6 22.4v9h6.2a4.5 4.5 0 0 0 0-9z"
        fill="#0a66c2"
        fillRule="evenodd"
      />
      {/* The AI spark in the fold */}
      <path d="M46 10.8l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="#0a66c2" />
    </svg>
  );
}

/** "Resum" in the strongest text colour and "ify" in the accent blue. */
export function Wordmark({ className = '' }) {
  return (
    <span className={`font-display font-bold tracking-[-0.02em] text-strong ${className}`}>
      Resum<span className="text-accent">ify</span>
    </span>
  );
}
