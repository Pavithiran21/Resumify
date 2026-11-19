import { zodResolver } from '@hookform/resolvers/zod';
import { IconLock, IconMail } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { PasswordField, TextField } from '../../components/Field';
import { usePageTitle } from '../../hooks/usePageTitle';
import { AuthLayout } from '../../layout/AuthLayout';
import { loginSchema } from './authSchemas';
import { FormAlert } from '../../components/FormAlert';
import { useFormErrors } from '../../hooks/useFormErrors';
import { useDemoAccounts } from './useDemoAccounts';

/**
 * Log in (UI-UX.md screen 1, at /). A wrong email or password is shown under the password field without
 * saying which one was wrong. After logging in, GuestOnly sends the user to the page they wanted,
 * or Home.
 */
export function LoginPage() {
  usePageTitle('Log in');
  const { login } = useAuth();
  const { formError, clearFormError, handleError } = useFormErrors();
  // In demo mode only, a link to the demo page (/demo); the demo box itself isn't on this page.
  const { data: demo } = useDemoAccounts();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '', remember: false } });

  async function onSubmit(values) {
    clearFormError();
    try {
      await login(values);
    } catch (error) {
      if (error.code === 'INVALID_CREDENTIALS') {
        setError('password', { type: 'server', message: error.message }, { shouldFocus: true });
        return;
      }
      handleError(error, setError, ['email', 'password']);
    }
  }

  return (
    <AuthLayout preview>
      <div className="text-center">
        <h1 className="t-screen mt-3 mb-1">Welcome back</h1>
        <p className="muted mt-0 mb-6">See why your resume fits, and how to fix it.</p>
      </div>
      <FormAlert message={formError} />
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Email"
          type="email"
          icon={IconMail}
          autoComplete="username"
          autoFocus
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          icon={IconLock}
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {/* Unticked (the default), closing the browser logs out, so the next visit starts here. */}
        <div className="-mt-1 mb-[18px] flex flex-wrap items-center justify-between gap-2">
          <label className="check">
            <input type="checkbox" {...register('remember')} />
            Keep me logged in
          </label>
          <Link to="/forgot-password" className="link">
            Forgot password?
          </Link>
        </div>
        <Button variant="primary" type="submit" pending={isSubmitting} className="w-full py-[13px]">
          Log in
        </Button>
      </form>
      <p className="muted mt-[18px] mb-0 text-center text-sm">
        New to Resumify?{' '}
        <Link to="/register" className="link-u">
          Create a free account
        </Link>
      </p>
      {demo?.accounts?.length > 0 && (
        <p className="muted mt-2 mb-0 text-center text-sm">
          Just looking?{' '}
          <Link to="/demo" className="link-u">
            Try the demo
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
