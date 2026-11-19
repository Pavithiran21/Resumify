import { Link } from 'react-router';
import { Skeleton } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { AuthLayout } from '../../layout/AuthLayout';
import { DemoBlock } from './DemoBlock';
import { useDemoAccounts } from './useDemoAccounts';

/**
 * Try the demo (UI-UX.md screen 1b, at /demo): the demo accounts' emails and their public, demo-only
 * password, one "Log in as <role>" button each. Log in at / stays a plain form. With demo mode off the server has
 * no demo, and this page says so.
 */
export function DemoPage() {
  usePageTitle('Demo');
  const { data, isPending } = useDemoAccounts();
  const available = data?.accounts?.length > 0;

  return (
    <AuthLayout preview>
      <div className="text-center">
        <h1 className="t-screen mt-3 mb-1">Try the demo</h1>
        <p className="muted mt-0 mb-0">
          {isPending || available
            ? 'Two ready-made accounts. The first has resumes, jobs and matches; the second has its own, separate data. Nothing you do here is kept.'
            : "There's no demo on this server."}
        </p>
      </div>
      {isPending && (
        <div role="status" className="mt-[18px]">
          <span className="sr-only">Loading…</span>
          <Skeleton lines={2} />
        </div>
      )}
      {available && <DemoBlock />}
      <p className="muted mt-[18px] mb-0 text-center text-sm">
        {available ? 'Have an account? ' : ''}
        <Link to="/" className="link-u">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
