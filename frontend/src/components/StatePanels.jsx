import { IconAlertTriangle, IconArrowLeft, IconFileUnknown, IconRefresh, IconWifiOff } from '@tabler/icons-react';
import { Link } from 'react-router';
import { errorMessage, isNetworkError } from '../lib/apiErrors';
import { Logo } from './Logo';

/** Shimmering placeholder lines while a panel loads (one of the two things that move). */
export function Skeleton({ lines = 3, className = '' }) {
  const widths = ['70%', '45%', '85%', '60%', '35%'];
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="skel" style={{ width: widths[index % widths.length] }} />
      ))}
    </div>
  );
}

/** A panel-sized skeleton with a hidden "Loading" for screen readers. */
export function LoadingPanel({ lines = 4, label = 'Loading' }) {
  return (
    <div className="panel pad" role="status">
      <span className="sr-only">{label}…</span>
      <Skeleton lines={lines} />
    </div>
  );
}

/** A request failed: what went wrong and "Try again" (UI-UX.md "States", error panel). */
export function ErrorPanel({ error, onRetry, title = "Couldn't load this" }) {
  const network = isNetworkError(error);
  const message = network ? "Couldn't reach Resumify. Check your connection." : errorMessage(error);
  const Icon = network ? IconWifiOff : IconAlertTriangle;
  return (
    <div className="panel pad text-center" role="alert" style={{ borderColor: 'rgb(209 36 63 / 0.35)' }}>
      <Icon size={30} className="mx-auto text-danger" aria-hidden="true" />
      <h2 className="t-panel mt-1.5 mb-1">{title}</h2>
      <p className="muted mt-0 mb-3 text-sm">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          <IconRefresh size={18} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

/**
 * Any link or id that isn't the user's: deleted, mistyped, or someone else's item. They look the
 * same on purpose (UI-UX.md "Privacy in the UI": another user's item looks exactly like a missing one).
 */
export function NotFoundPanel() {
  return (
    <div className="panel pad mx-auto mt-6 max-w-md text-center" style={{ background: 'var(--color-panel2)' }}>
      <IconFileUnknown size={30} className="mx-auto text-dim" aria-hidden="true" />
      <h1 className="t-panel mt-1.5 mb-1">This isn&apos;t here</h1>
      <p className="muted mt-0 mb-3 text-sm">It may have been deleted, or the link isn&apos;t yours.</p>
      <Link to="/matches" className="btn btn-secondary btn-sm">
        <IconArrowLeft size={18} aria-hidden="true" /> Back to matches
      </Link>
    </div>
  );
}

/** The first-visit empty state: the logo, a title, one line and one action. */
export function EmptyPanel({ title, text, action }) {
  return (
    <div className="panel pad text-center">
      <span className="inline-block">
        <Logo size={64} />
      </span>
      <h2 className="t-panel mt-2 mb-1">{title}</h2>
      <p className="muted mt-0 mb-3.5 text-sm">{text}</p>
      {action}
    </div>
  );
}

/** While the saved session is being restored on first load. */
export function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center" role="status">
      <span className="sr-only">Loading…</span>
      <Logo size={56} />
    </div>
  );
}
