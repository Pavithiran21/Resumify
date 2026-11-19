import { zodResolver } from '@hookform/resolvers/zod';
import { IconCircleCheck, IconLinkOff, IconLock } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { resetPassword } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { PasswordField } from '../../components/Field';
import { usePageTitle } from '../../hooks/usePageTitle';
import { AuthLayout } from '../../layout/AuthLayout';
import { useToast } from '../../toast/ToastContext';
import { isResetToken, resetSchema } from './authSchemas';
import { FormAlert } from '../../components/FormAlert';
import { useFormErrors } from '../../hooks/useFormErrors';

/** A used, replaced, expired or broken link (UI-UX.md screen 3, "Expired link"). */
function ExpiredLink() {
  return (
    <div className="note err" role="alert">
      <IconLinkOff size={18} aria-hidden="true" />
      <span>
        <b>This link has expired.</b>{' '}
        <Link to="/forgot-password" className="link-u">
          Send a new link
        </Link>
      </span>
    </div>
  );
}

/**
 * Set a new password from the emailed link (/reset-password?token=…). The page is open while
 * logged in too, so the link works in any browser. A reset signs out every session, including
 * this tab's, so the user logs in again with the new password.
 */
export function ResetPasswordPage() {
  usePageTitle('New password');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, endSessionLocally } = useAuth();
  const { showToast } = useToast();
  const [expired, setExpired] = useState(!isResetToken(token));
  const { formError, clearFormError, handleError } = useFormErrors();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirm: '' } });

  async function onSubmit(values) {
    clearFormError();
    try {
      await resetPassword(token, values.password);
      if (user) {
        endSessionLocally('logged-out');
      }
      showToast({ message: 'Password changed. Log in with your new password.', success: true, icon: IconCircleCheck });
      navigate('/', { replace: true });
    } catch (error) {
      if (error.code === 'RESET_LINK_EXPIRED' || error.details?.some((detail) => detail.field === 'token')) {
        setExpired(true);
        return;
      }
      handleError(error, setError, ['password']);
    }
  }

  return (
    <AuthLayout>
      <h1 className="t-card mt-3 mb-4 text-center">New password</h1>
      {expired ? (
        <ExpiredLink />
      ) : (
        <>
          <FormAlert message={formError} />
          <form noValidate onSubmit={handleSubmit(onSubmit)}>
            <PasswordField
              label="New password"
              icon={IconLock}
              autoComplete="new-password"
              autoFocus
              error={errors.password?.message}
              hint={errors.password ? undefined : 'At least 8 characters, with a number.'}
              {...register('password')}
            />
            <PasswordField
              label="Confirm password"
              icon={IconLock}
              autoComplete="new-password"
              error={errors.confirm?.message}
              {...register('confirm')}
            />
            <Button variant="primary" type="submit" pending={isSubmitting} className="w-full">
              Set new password
            </Button>
          </form>
        </>
      )}
      <p className="muted mt-[18px] mb-0 text-center text-sm">
        <Link to={user ? '/home' : '/'} className="link">
          {user ? 'Back to Resumify' : 'Back to log in'}
        </Link>
      </p>
    </AuthLayout>
  );
}
