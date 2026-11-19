import { zodResolver } from '@hookform/resolvers/zod';
import { IconArrowLeft, IconBriefcase, IconBuilding, IconSparkles } from '@tabler/icons-react';
import { useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { extractJobText } from '../../api/jobs';
import { Button } from '../../components/Button';
import { TextAreaField, TextField } from '../../components/Field';
import { FileRow } from '../../components/Files';
import { FormAlert } from '../../components/FormAlert';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useFormErrors } from '../../hooks/useFormErrors';
import { JOB_ACCEPT, jobFileProblem } from '../../lib/files';
import { formatNumber } from '../../lib/numbers';
import { DESCRIPTION_MAX, jobSchema } from './jobSchema';

/**
 * A new job (UI-UX.md screen 6, "New job"): title, company (optional) and the description, pasted or
 * read from a TXT, PDF or DOCX file. The file's text fills the box and the file itself is never kept
 * (POST /api/jobs/extract-text stores nothing). onSave(values) saves the job and runs the match;
 * it throws the API error, which lands under its field.
 */
export function NewJobForm({ onSave, onBack }) {
  const fileInputRef = useRef(null);
  const { formError, clearFormError, handleError } = useFormErrors();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(jobSchema), defaultValues: { title: '', company: '', description: '' } });
  // For the "152 / 20,000" counter. useWatch, not watch(): it re-renders only on this field and is
  // safe with the React Compiler.
  const description = useWatch({ control, name: 'description' });

  const jobFile = useFileUpload({
    check: jobFileProblem,
    upload: extractJobText,
    onSuccess: ({ text, characterCount }) => {
      setValue('description', text, { shouldValidate: true, shouldDirty: true });
      return `Text added to the description · ${formatNumber(characterCount)} characters · file not kept`;
    },
  });

  async function onSubmit(values) {
    clearFormError();
    try {
      await onSave(values);
    } catch (error) {
      handleError(error, setError, ['title', 'company', 'description']);
    }
  }

  const hint = (
    <span className="flex justify-between gap-2.5">
      <span>
        Or{' '}
        <button type="button" className="link-u" onClick={() => fileInputRef.current?.click()} disabled={jobFile.busy}>
          upload a TXT, PDF or DOCX
        </button>
        ; its text fills this box. We keep only the text, not the file.
      </span>
      <span className="whitespace-nowrap" aria-live="polite">
        {formatNumber(description.length)} / {formatNumber(DESCRIPTION_MAX)}
      </span>
    </span>
  );

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormAlert message={formError} />
      <div className="two">
        <TextField label="Job title" icon={IconBriefcase} autoFocus error={errors.title?.message} {...register('title')} />
        <TextField label="Company" optional icon={IconBuilding} error={errors.company?.message} {...register('company')} />
      </div>
      <TextAreaField label="Job description" rows={8} error={errors.description?.message} hint={hint} {...register('description')} />
      <input
        ref={fileInputRef}
        type="file"
        accept={JOB_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            jobFile.start(file);
          }
        }}
      />
      {jobFile.state && (
        <div className="-mt-2 mb-4">
          <FileRow state={jobFile.state} />
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-2.5">
        <Button onClick={onBack}>
          <IconArrowLeft size={18} aria-hidden="true" /> Back
        </Button>
        <Button variant="primary" type="submit" pending={isSubmitting}>
          {!isSubmitting && <IconSparkles size={18} aria-hidden="true" />} Save job and run match
        </Button>
      </div>
    </form>
  );
}
