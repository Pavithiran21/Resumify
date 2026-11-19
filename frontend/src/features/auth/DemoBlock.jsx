import { IconAlertCircle, IconLogin2, IconPresentation } from '@tabler/icons-react';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { errorMessage } from '../../lib/apiErrors';
import { useDemoAccounts } from './useDemoAccounts';

/**
 * Demo mode only: each demo account's email and the public, demo-only password, with "Log in as <role>".
 * Shown on the demo page (/demo). GET /demo answers 404 when demo mode is off; then nothing shows.
 */
export function DemoBlock() {
  const { login } = useAuth();
  const [pendingEmail, setPendingEmail] = useState(null);
  const [error, setError] = useState(null);
  const { data } = useDemoAccounts();

  if (!data?.accounts?.length) {
    return null;
  }

  async function logInAs(account) {
    setPendingEmail(account.email);
    setError(null);
    try {
      await login({ email: account.email, password: account.password });
    } catch (loginError) {
      setError(errorMessage(loginError));
      setPendingEmail(null);
    }
  }

  return (
    <section className="demo" aria-label="Demo accounts">
      {data.accounts.map((account) => (
        <div key={account.email} className="not-first:mt-4">
          <div className="flex items-center gap-2.5">
            <b className="flex flex-1 items-center gap-1.5 text-[13px]">
              <IconPresentation size={16} className="text-accent" aria-hidden="true" /> {account.role}
            </b>
            <Button size="xs" pending={pendingEmail === account.email} onClick={() => logInAs(account)}>
              <IconLogin2 size={16} aria-hidden="true" /> Log in as {account.role}
            </Button>
          </div>
          <div className="dim mt-1.5 text-xs break-all">
            {account.email} · {account.password}
          </div>
        </div>
      ))}
      {error && (
        <div className="ferr" role="alert">
          <IconAlertCircle size={16} aria-hidden="true" /> <span>{error}</span>
        </div>
      )}
    </section>
  );
}
