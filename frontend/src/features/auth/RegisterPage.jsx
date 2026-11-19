import { zodResolver } from '@hookform/resolvers/zod';
import { IconLock, IconMail, IconUser } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { PasswordField, TextField } from '../../components/Field';
import { usePageTitle } from '../../hooks/usePageTitle';
import { AuthLayout } from '../../layout/AuthLayout';
import { registerSchema } from './authSchemas';
import { FormAlert } from '../../components/FormAlert';
import { useFormErrors } from '../../hooks/useFormErrors';

/**
 * Create account (UI-UX.md screen 2): name, email and password. The new user is logged in at once
 * and lands on Home's "No matches yet". A taken email is a field error (409 EMAIL_TAKEN).
 */
export function RegisterPage() {
  usePageTitle('Create account');
  const { register: registerAccount } = useAuth();
  const { formError, clearFormError, handleError } = useFormErrors();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', password: '' } });

  async function onSubmit(values) {
    clearFormError();
    try {
      await registerAccount(values);
    } catch (error) {
      handleError(error, setError, ['name', 'email', 'password']);
    }
  }

  return (
    <AuthLayout>
      <h1 className="t-card mt-3 mb-1 text-center">Create your account</h1>
      <p className="muted mt-0 mb-5 text-center">Free. Your resumes stay private.</p>
      <FormAlert message={formError} />
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Name"
          icon={IconUser}
          autoComplete="name"
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Email"
          type="email"
          icon={IconMail}
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          icon={IconLock}
          autoComplete="new-password"
          error={errors.password?.message}
          hint={errors.password ? undefined : 'At least 8 characters, with a number.'}
          {...register('password')}
        />
        <Button variant="primary" type="submit" pending={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
      <p className="muted mt-[18px] mb-0 text-center text-sm">
        Already have an account?{' '}
        <Link to="/" className="link">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
