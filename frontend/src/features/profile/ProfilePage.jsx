import { zodResolver } from '@hookform/resolvers/zod';
import { IconLock, IconLogout, IconPresentation, IconUser } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { listJobs } from '../../api/jobs';
import { listMatches } from '../../api/matches';
import { updateProfile } from '../../api/profile';
import { queryKeys } from '../../api/queryKeys';
import { listResumes } from '../../api/resumes';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/Button';
import { TextField } from '../../components/Field';
import { FormAlert } from '../../components/FormAlert';
import { useFormErrors } from '../../hooks/useFormErrors';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatNumber } from '../../lib/numbers';
import { useToast } from '../../toast/ToastContext';
import { nameField } from '../auth/authSchemas';
import { ChangePasswordDialog, DeleteAccountDialog, DeleteAllResumesDialog } from './AccountDialogs';

const profileSchema = z.object({ name: nameField });
const COUNT_PARAMS = { size: 1 };

/** The counts the delete dialogs name ("2 resumes, 3 jobs and 4 matches"), from totalItems. */
function useLibraryCounts() {
  const resumes = useQuery({ queryKey: queryKeys.resumes.list(COUNT_PARAMS), queryFn: () => listResumes(COUNT_PARAMS) });
  const jobs = useQuery({ queryKey: queryKeys.jobs.list(COUNT_PARAMS), queryFn: () => listJobs(COUNT_PARAMS) });
  const matches = useQuery({ queryKey: queryKeys.matches.list(COUNT_PARAMS), queryFn: () => listMatches(COUNT_PARAMS) });
  return {
    resumes: resumes.data?.totalItems ?? 0,
    jobs: jobs.data?.totalItems ?? 0,
    matches: matches.data?.totalItems ?? 0,
    loaded: Boolean(resumes.data && jobs.data && matches.data),
  };
}

/** What Resumify stores for this user, from the same counts the delete dialogs name. */
function StoredCounts({ counts }) {
  const tiles = [
    ['Resumes', counts.resumes],
    ['Jobs', counts.jobs],
    ['Matches', counts.matches],
  ];
  return (
    <dl className="facts facts-3" aria-busy={!counts.loaded}>
      {tiles.map(([label, value]) => (
        <div key={label}>
          <dt>
            <small>{label}</small>
          </dt>
          <dd className="m-0">
            <b>{counts.loaded ? formatNumber(value) : '–'}</b>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The name (the only profile field) with Save, the login email read-only, and Change password in
 * the same row as Save (UI-UX.md screen 13).
 */
function NameForm({ user, onChangePassword }) {
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  const { formError, clearFormError, handleError } = useFormErrors();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name } });

  async function onSubmit(values) {
    clearFormError();
    try {
      const updated = await updateProfile(values.name);
      updateUser(updated);
      reset({ name: updated.name });
      showToast({ message: 'Name saved', success: true });
    } catch (error) {
      handleError(error, setError, ['name']);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormAlert message={formError} />
      <TextField label="Name" icon={IconUser} autoComplete="name" error={errors.name?.message} {...register('name')} />
      <div className="field">
        <span className="label" id="email-label">
          Email
        </span>
        <div className="ro" aria-labelledby="email-label">
          {user.email}
        </div>
        <div className="hint">Your login email can&apos;t be changed.</div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button variant="primary" type="submit" pending={isSubmitting}>
          Save
        </Button>
        <Button onClick={onChangePassword} disabled={user.isDemo}>
          Change password
        </Button>
      </div>
    </form>
  );
}

/**
 * Profile and privacy (UI-UX.md screen 13): the name (the only profile field), the login email
 * read-only, Change password, Log out, and "Your data" with Delete all resumes and Delete account.
 * Demo accounts can't change their password or be deleted (the backend also answers 403).
 */
export function ProfilePage() {
  usePageTitle('Profile');
  const { user, logout } = useAuth();
  const counts = useLibraryCounts();
  const [dialog, setDialog] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const closeDialog = () => setDialog(null);

  async function logOut() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <>
      <div className="screen-head">
        <div className="grow">
          <div className="crumbs">Profile</div>
          <h1 className="t-screen">Profile and privacy</h1>
        </div>
        <Button pending={loggingOut} onClick={logOut}>
          {!loggingOut && <IconLogout size={18} aria-hidden="true" />} Log out
        </Button>
      </div>
      {/* Two cards side by side on a wide screen; they stack below 1150 px (.grid2). */}
      <div className="grid2 mt-[18px]">
        <section className="panel pad" aria-labelledby="account-title">
          <h2 id="account-title" className="font-display mt-0 mb-3 flex items-center gap-1.5 text-[15px]">
            <IconUser size={16} className="text-accent" aria-hidden="true" /> Account
          </h2>
          <NameForm key={user.id} user={user} onChangePassword={() => setDialog('password')} />
          {user.isDemo && (
            <div className="note inf mt-[18px] mb-0">
              <IconPresentation size={18} aria-hidden="true" />
              <span>
                <b>This is a demo account.</b> Its password can&apos;t be changed and it can&apos;t be deleted.
                Everything else works.
              </span>
            </div>
          )}
        </section>
        <section className="panel pad" aria-labelledby="data-title">
          <h2 id="data-title" className="font-display m-0 flex items-center gap-1.5 text-[15px]">
            <IconLock size={16} className="text-accent" aria-hidden="true" /> Your data
          </h2>
          <p className="muted mt-1 mb-0 text-sm">
            Resumes, extracted text and results are private and never written to logs.
          </p>
          <StoredCounts counts={counts} />
          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" onClick={() => setDialog('resumes')} disabled={!counts.loaded || counts.resumes === 0}>
              Delete all resumes
            </Button>
            <Button variant="danger" size="sm" onClick={() => setDialog('account')} disabled={user.isDemo || !counts.loaded}>
              Delete account
            </Button>
          </div>
        </section>
      </div>
      {dialog === 'password' && <ChangePasswordDialog onClose={closeDialog} />}
      {dialog === 'resumes' && <DeleteAllResumesDialog counts={counts} onClose={closeDialog} />}
      {dialog === 'account' && <DeleteAccountDialog counts={counts} onClose={closeDialog} />}
    </>
  );
}
