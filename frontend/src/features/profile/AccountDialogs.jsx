import { zodResolver } from '@hookform/resolvers/zod';
import { IconFilesOff, IconKey, IconLock, IconTrash, IconUserX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { invalidateLibrary } from '../../api/invalidate';
import { changePassword, deleteAccount } from '../../api/profile';
import { deleteAllResumes } from '../../api/resumes';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Dialog } from '../../components/Dialog';
import { PasswordField } from '../../components/Field';
import { FormAlert } from '../../components/FormAlert';
import { useFormErrors } from '../../hooks/useFormErrors';
import { errorMessage, isNetworkError } from '../../lib/apiErrors';
import { plural } from '../../lib/numbers';
import { useToast } from '../../toast/ToastContext';
import { currentPasswordField, newPasswordField } from '../auth/authSchemas';

const changePasswordSchema = z.object({ currentPassword: currentPasswordField, newPassword: newPasswordField });

/**
 * Change password (UI-UX.md screen 13). The current password is checked first; a wrong one is a
 * field error and the user stays logged in. Every other device is logged out, and this tab gets a
 * new session from the answer.
 */
export function ChangePasswordDialog({ onClose }) {
  const titleId = useId();
  const { startSession } = useAuth();
  const { showToast } = useToast();
  const { formError, clearFormError, handleError } = useFormErrors();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '' } });

  async function onSubmit(values) {
    clearFormError();
    try {
      startSession(await changePassword(values.currentPassword, values.newPassword));
      showToast({ message: 'Password changed. Other devices are logged out.', success: true });
      onClose();
    } catch (error) {
      handleError(error, setError, ['currentPassword', 'newPassword']);
    }
  }

  return (
    <Dialog labelledBy={titleId} onClose={() => !isSubmitting && onClose()}>
      <div className="ic lock">
        <IconKey size={23} aria-hidden="true" />
      </div>
      <h2 id={titleId} className="t-lead">
        Change password
      </h2>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-3">
        <FormAlert message={formError} />
        <PasswordField
          label="Current password"
          icon={IconLock}
          autoComplete="current-password"
          data-autofocus
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <PasswordField
          label="New password"
          icon={IconLock}
          autoComplete="new-password"
          error={errors.newPassword?.message}
          hint="At least 8 characters, with a number. Other devices are logged out."
          {...register('newPassword')}
        />
        <div className="acts">
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" pending={isSubmitting}>
            Change password
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Delete all resumes? Every resume, its text and every match; jobs and the account stay. */
export function DeleteAllResumesDialog({ counts, onClose }) {
  const queryClient = useQueryClient();
  const { showToast, showError } = useToast();
  const remove = useMutation({
    mutationFn: deleteAllResumes,
    onSuccess: () => {
      invalidateLibrary(queryClient);
      showToast({
        message: `All resumes, their text and ${plural(counts.matches, 'match', 'matches')} deleted`,
        icon: IconTrash,
        iconColor: 'var(--color-danger)',
      });
      onClose();
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        showError(error.message, { network: true });
      }
    },
  });

  return (
    <ConfirmDialog
      icon={IconFilesOff}
      title="Delete all resumes?"
      description={
        <>
          All <b>{plural(counts.resumes, 'resume')}</b>, their text and all{' '}
          <b>{plural(counts.matches, 'match', 'matches')}</b> will be removed for good. Your jobs and your account stay.
          This can&apos;t be undone.
        </>
      }
      confirmLabel="Delete all resumes"
      cancelLabel="Keep them"
      pending={remove.isPending}
      error={remove.error && !isNetworkError(remove.error) ? errorMessage(remove.error) : null}
      onConfirm={() => remove.mutate()}
      onClose={onClose}
    />
  );
}

/**
 * Delete your account? It asks for the password, then removes the account, resumes, jobs and
 * matches for good (PRODUCT.md US-11). A wrong password is a field error; demo accounts get 403.
 */
export function DeleteAccountDialog({ counts, onClose }) {
  const passwordId = useId();
  const navigate = useNavigate();
  const { endSessionLocally } = useAuth();
  const { showToast, showError } = useToast();
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const remove = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => {
      endSessionLocally('account-deleted');
      showToast({ message: 'Your account and all its data were deleted.', icon: IconUserX, iconColor: 'var(--color-danger)' });
      navigate('/', { replace: true });
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        showError(error.message, { network: true });
      } else if (error.details?.some((detail) => detail.field === 'password')) {
        setFieldError(error.details.find((detail) => detail.field === 'password').message);
      }
    },
  });

  function confirm() {
    if (!password) {
      setFieldError('Enter your password.');
      return;
    }
    setFieldError(null);
    remove.mutate();
  }

  const otherError =
    remove.error && !isNetworkError(remove.error) && !remove.error.details?.length ? errorMessage(remove.error) : null;

  return (
    <ConfirmDialog
      icon={IconUserX}
      title="Delete your account?"
      description={
        <>
          Your account, {plural(counts.resumes, 'resume')}, {plural(counts.jobs, 'job')} and{' '}
          {plural(counts.matches, 'match', 'matches')} will be removed for good. This can&apos;t be undone.
        </>
      }
      confirmLabel="Delete account"
      pending={remove.isPending}
      error={otherError}
      onConfirm={confirm}
      onClose={onClose}
    >
      <div className={`field mt-3 mb-0 ${fieldError ? 'bad' : ''}`}>
        <label htmlFor={passwordId}>Enter your password to confirm</label>
        <div className="inp">
          <IconLock size={18} className="lead" aria-hidden="true" />
          <input
            id={passwordId}
            type="password"
            className="ctl"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={fieldError ? 'true' : undefined}
            aria-describedby={fieldError ? `${passwordId}-error` : undefined}
          />
        </div>
        {fieldError && (
          <div className="ferr" id={`${passwordId}-error`} role="alert">
            {fieldError}
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
}
