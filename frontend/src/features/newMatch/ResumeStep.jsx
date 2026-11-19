import { IconArrowRight, IconUpload } from '@tabler/icons-react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { fileIcon } from '../../lib/files';
import { pagesAndWordsDotted, plural } from '../../lib/numbers';

/** Step 1 (UI-UX.md screen 6): pick one of the user's resumes, as a native radio group. */
export function ResumeStep({ resumes, resumeId, onChange, onContinue }) {
  if (resumes.length === 0) {
    return (
      <>
        <h2 className="t-card mt-0 mb-3.5">Choose the resume</h2>
        <p className="muted mt-0 mb-4">You have no resumes yet. Upload one first; it takes a few seconds.</p>
        <Link to="/resumes" className="btn btn-primary">
          <IconUpload size={18} aria-hidden="true" /> Upload a resume
        </Link>
      </>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <fieldset className="m-0 border-0 p-0">
        <legend className="t-card font-display mb-3.5 p-0 font-semibold text-strong">Choose the resume</legend>
        <div className="option-list">
          {resumes.map((resume) => {
            const { Icon, color } = fileIcon(resume.contentType);
            return (
              <label key={resume.id} className="file option">
                <input
                  type="radio"
                  name="resume"
                  value={resume.id}
                  checked={resume.id === resumeId}
                  onChange={() => onChange(resume.id)}
                />
                <Icon size={24} className="flex-none" style={{ color }} aria-hidden="true" />
                <span className="grow">
                  <b>{resume.fileName}</b>
                  <span className="ver">v{resume.version}</span>
                  <span className="dim block text-[13px]">{pagesAndWordsDotted(resume)}</span>
                </span>
                <span className="dim text-[13px] whitespace-nowrap">{plural(resume.matchCount, 'match', 'matches')}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" type="submit" disabled={!resumeId}>
          Continue <IconArrowRight size={18} aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
