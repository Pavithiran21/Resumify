import { IconFileUpload, IconTrash } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { useNavigate } from 'react-router';
import { invalidateLibrary } from '../../api/invalidate';
import { queryKeys } from '../../api/queryKeys';
import { deleteResume, uploadNewVersion } from '../../api/resumes';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Dialog } from '../../components/Dialog';
import { DropZone, FileRow } from '../../components/Files';
import { useFileUpload } from '../../hooks/useFileUpload';
import { errorMessage, isNetworkError } from '../../lib/apiErrors';
import { RESUME_ACCEPT, resumeFileProblem } from '../../lib/files';
import { pagesAndWords, plural } from '../../lib/numbers';
import { useToast } from '../../toast/ToastContext';

/** "matches from version 1", "versions 1 and 2", "versions 1 to 4". */
function earlierVersions(version) {
  if (version === 1) {
    return 'version 1';
  }
  if (version === 2) {
    return 'versions 1 and 2';
  }
  return `versions 1 to ${version}`;
}

/**
 * Upload a new version (UI-UX.md screen 9): the new file becomes the next version and earlier
 * matches keep their results. The upload starts as soon as a file is chosen; when it is done the
 * dialog closes and a toast says which version it became.
 */
export function NewVersionDialog({ resume, onClose }) {
  const titleId = useId();
  const descriptionId = useId();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const upload = useFileUpload({
    check: resumeFileProblem,
    upload: (file, onProgress) => uploadNewVersion(resume.id, file, onProgress),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.resumes.detail(updated.id), updated);
      invalidateLibrary(queryClient);
      showToast({ message: `Version ${updated.version} uploaded · ${pagesAndWords(updated)}`, success: true });
      onClose();
      return null;
    },
  });
  const close = () => {
    if (!upload.busy) {
      onClose();
    }
  };

  return (
    <Dialog labelledBy={titleId} describedBy={descriptionId} onClose={close}>
      <div className="ic ok">
        <IconFileUpload size={23} aria-hidden="true" />
      </div>
      <h2 id={titleId} className="t-lead">
        Upload a new version
      </h2>
      <p id={descriptionId} className="muted mt-0 mb-3.5 text-sm [overflow-wrap:anywhere]">
        <b>{resume.fileName}</b> is at version {resume.version}. The new file becomes{' '}
        <b>version {resume.version + 1}</b>; matches from {earlierVersions(resume.version)} keep their results.
      </p>
      <DropZone
        compact
        title="Drop the new file here"
        hint="PDF or DOCX, up to 5 MB"
        accept={RESUME_ACCEPT}
        onFile={upload.start}
        disabled={upload.busy}
      />
      {upload.state && <FileRow state={upload.state} />}
      <div className="acts">
        <Button onClick={close} disabled={upload.busy}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}

/**
 * Delete this resume? (UI-UX.md screen 14): names the file and its version and says its text and
 * matches go too. On success the user is back on Resumes with "Resume, its text and 3 matches deleted".
 */
export function DeleteResumeDialog({ resume, onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast, showError } = useToast();
  const remove = useMutation({
    mutationFn: () => deleteResume(resume.id),
    onSuccess: () => {
      navigate('/resumes', { replace: true });
      queryClient.removeQueries({ queryKey: queryKeys.resumes.detail(resume.id) });
      invalidateLibrary(queryClient);
      showToast({
        message: `Resume, its text and ${plural(resume.matchCount, 'match', 'matches')} deleted`,
        icon: IconTrash,
        iconColor: 'var(--color-danger)',
      });
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        showError(error.message, { network: true });
      }
    },
  });

  return (
    <ConfirmDialog
      icon={IconTrash}
      title="Delete this resume?"
      description={
        <>
          <b className="[overflow-wrap:anywhere]">{resume.fileName}</b> (version {resume.version}), its extracted text
          and its {plural(resume.matchCount, 'match', 'matches')} will be removed for good. This can&apos;t be undone.
        </>
      }
      confirmLabel="Delete resume"
      pending={remove.isPending}
      error={remove.error && !isNetworkError(remove.error) ? errorMessage(remove.error) : null}
      onConfirm={() => remove.mutate()}
      onClose={onClose}
    />
  );
}
