import { useEffect } from 'react';

/** "Matches · Resumify" in the browser tab. */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Resumify` : 'Resumify';
  }, [title]);
}
