import { zodResolver } from '@hookform/resolvers/zod';
import { IconMail, IconMailCheck, IconPresentation } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { forgotPassword } from '../../api/auth';
import { Button } from '../../components/Button';
import { TextField } from '../../components/Field';
import { usePageTitle } from '../../hooks/usePageTitle';
import { AuthLayout } from '../../layout/AuthLayout';
import { forgotSchema } from './authSchemas';
import { FormAlert } from '../../components/FormAlert';
import { useFormErrors } from '../../hooks/useFormErrors';
import { useDemoAccounts } from './useDemoAccounts';

/**
 * Forgot password (UI-UX.md screen 3). The answer is the same whether or not the email has an
 * account, so nobody can use this page to find out who uses Resumify. In demo mode a note says
 * that demo accounts get no link: their address is public on the demo page anyway.
 */
export function ForgotPasswordPage() {
  usePageTitle('Forgot password');
  const [sent, setSent] = useState(false);
  // The same query as the Log in page's demo link, so it is usually already in the cache.
  const { data: demo } = useDemoAccounts();
  const demoMode = demo?.accounts?.length > 0;
  const { formError, clearFormError, handleError } = useFormErrors();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  async function onSubmit(values) {
    clearFormError();
    setSent(false);
    try {
      await forgotPassword(values.email);
      setSent(true);
    } catch (error) {
      handleError(error, setError, ['email']);
    }
  }

  return (
    <AuthLayout>
      <h1 className="t-card mt-3 mb-1 text-center">Forgot password?</h1>
      <p className="muted mt-0 mb-5 text-center">We&apos;ll email you a link to set a new one.</p>
      <FormAlert message={formError} />
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Email"
          type="email"
          icon={IconMail}
          autoComplete="email"
          autoFocus
          error={errors.email?.message}
          {...register('email')}
        />
        <Button variant="primary" type="submit" pending={isSubmitting} className="w-full">
          Send reset link
        </Button>
      </form>
      <div role="status">
        {sent && (
          <div className="note ok mt-3.5">
            <IconMailCheck size={18} aria-hidden="true" />
            <span>
              <b>Check your inbox.</b> If an account exists, a link is on its way. It works once and expires in 30
              minutes.
            </span>
          </div>
        )}
      </div>
      {demoMode && (
        <div className="note inf mt-3.5">
          <IconPresentation size={18} aria-hidden="true" />
          <span>Demo accounts can&apos;t change their password, so they get no reset email.</span>
        </div>
      )}
      <p className="muted mt-[18px] mb-0 text-center text-sm">
        <Link to="/" className="link">
          Back to log in
        </Link>
      </p>
    </AuthLayout>
  );
}
