import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Filters, the sort and the page number live in the URL, so links can open a filtered view
 * (a resume's "All matches" → /matches?resumeId=…) and Back and reload keep them.
 * Returns [values, update]: update({ key: value }) sets or (with '' or null) removes keys.
 * Changing any filter goes back to page 1 unless the update sets the page itself.
 *
 * Each change starts from the live URL (window.location.search), not from searchParams. React
 * Router renders a navigation as a transition, so on a slow device the last render's searchParams
 * can be older than the address bar: two filter changes in quick succession would otherwise
 * lose the first one (a bug found and fixed in GigVault, 3 Nov 2026).
 */
export function useSearchParamsState(keys) {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = {};
  for (const key of keys) {
    values[key] = searchParams.get(key) ?? '';
  }

  const update = useCallback(
    (changes, { replace = false } = {}) => {
      const next = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(changes)) {
        if (value === '' || value === null || value === undefined) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      if (!('page' in changes)) {
        next.delete('page');
      }
      setSearchParams(next, { replace });
    },
    [setSearchParams],
  );

  return [values, update];
}
