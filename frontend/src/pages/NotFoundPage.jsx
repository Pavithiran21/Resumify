import { NotFoundPanel } from '../components/StatePanels';
import { usePageTitle } from '../hooks/usePageTitle';

/** Any address the app doesn't have: the same "This isn't here" as a missing or someone else's item. */
export function NotFoundPage() {
  usePageTitle('Not found');
  return <NotFoundPanel />;
}
