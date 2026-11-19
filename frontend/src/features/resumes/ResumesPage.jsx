import { IconLock, IconSparkles, IconUpload } from '@tabler/icons-react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { Link } from 'react-router';
import { invalidateLibrary } from '../../api/invalidate';
import { queryKeys } from '../../api/queryKeys';
import { listResumes, uploadResume } from '../../api/resumes';
import { DropZone, FileRow } from '../../components/Files';
import { BestScore } from '../../components/Score';
import { ErrorPanel, LoadingPanel } from '../../components/StatePanels';
import { useFileUpload } from '../../hooks/useFileUpload';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatDayShort } from '../../lib/dates';
import { fileIcon, MAX_RESUMES, RESUME_ACCEPT, resumeFileProblem } from '../../lib/files';
import { pagesAndWords, pagesAndWordsDotted, plural } from '../../lib/numbers';
import { useToast } from '../../toast/ToastContext';

const LIST_PARAMS = { size: MAX_RESUMES };

/** "Updated 3 Nov · 1 page · 169 words" for a later version, "20 Oct · …" for version 1. */
function resumeMeta(resume) {
  const day = resume.version > 1 ? `Updated ${formatDayShort(resume.updatedAt)}` : formatDayShort(resume.createdAt);
  return `${day} · ${pagesAndWordsDotted(resume)}`;
}

/**
 * The resumes as cards (owner's choice, 8 Nov 2026): the file type's icon, the file name (its link
 * covers the whole card) and version, pages, words and matches, the best match score, and
 * "New match" to run a match with this resume.
 */
function ResumeCards({ resumes }) {
  return (
    <ul className="card-grid">
      {resumes.map((resume) => {
        const { Icon, color } = fileIcon(resume.contentType);
        return (
          <li key={resume.id} className="lcard">
            <div className="lcard-head">
              <span className="file-badge" aria-hidden="true">
                <Icon size={26} style={{ color }} />
              </span>
              <div className="min-w-0">
                <Link to={`/resumes/${resume.id}`} className="lcard-title">
                  {resume.fileName}
                </Link>
                <span className="ver">v{resume.version}</span>
                <div className="meta">{`${resumeMeta(resume)} · ${plural(resume.matchCount, 'match', 'matches')}`}</div>
              </div>
            </div>
            <div className="lcard-foot">
              <BestScore score={resume.bestScore} verdict={resume.bestVerdict} />
              <Link
                to={`/matches/new?resumeId=${resume.id}`}
                className="btn btn-secondary btn-sm"
                aria-label={`New match with ${resume.fileName}`}
              >
                <IconSparkles size={16} aria-hidden="true" /> New match
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Upload a resume (UI-UX.md screen 11): drop zone, "Reading text… 60%", then the resume is in the
 * list. A refused file shows the backend's reason in its row. The toast never names the file.
 */
function UploadPanel({ browseRef }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const upload = useFileUpload({
    check: resumeFileProblem,
    upload: uploadResume,
    onSuccess: (resume) => {
      invalidateLibrary(queryClient);
      showToast({ message: `Resume uploaded · ${pagesAndWords(resume)}`, success: true });
      return `Uploaded · ${pagesAndWordsDotted(resume)}`;
    },
  });

  return (
    <section className="panel pad" aria-labelledby="upload-title">
      <h2 id="upload-title" className="t-panel mt-0 mb-2.5">
        Upload a resume
      </h2>
      <DropZone
        title="Drop your resume here"
        hint="PDF or DOCX, up to 5 MB and 30 pages"
        accept={RESUME_ACCEPT}
        onFile={upload.start}
        disabled={upload.busy}
        browseRef={browseRef}
      />
      {upload.state && <FileRow state={upload.state} />}
      <div className="hint flex gap-1.5">
        <IconLock size={16} className="mt-0.5 flex-none" aria-hidden="true" />
        <span>Only the text is read; nobody else can see your resumes.</span>
      </div>
    </section>
  );
}

/** Resumes (UI-UX.md screen 8): the cards beside the upload panel. A card opens the read-only view. */
export function ResumesPage() {
  usePageTitle('Resumes');
  const browseRef = useRef(null);
  const resumes = useQuery({
    queryKey: queryKeys.resumes.list(LIST_PARAMS),
    queryFn: () => listResumes(LIST_PARAMS),
    placeholderData: keepPreviousData,
  });
  const count = resumes.data?.totalItems ?? 0;

  return (
    <>
      <div className="screen-head">
        <div className="grow">
          <div className="crumbs">Resumes</div>
          <h1 className="t-screen">Your resumes</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => browseRef.current?.click()}>
          <IconUpload size={18} aria-hidden="true" /> Upload
        </button>
      </div>
      <div className="grid2 mt-[18px]">
        <div>
          {resumes.isPending && <LoadingPanel lines={5} label="Loading resumes" />}
          {resumes.isError && <ErrorPanel error={resumes.error} onRetry={resumes.refetch} />}
          {resumes.data && (
            <section className="panel pad" aria-label="Your resumes">
              {count === 0 ? (
                <p className="muted mt-0 text-sm">No resumes yet. Upload a PDF or DOCX to get started.</p>
              ) : (
                <ResumeCards resumes={resumes.data.items} />
              )}
              <div className="dim mt-2.5 text-[13px]">
                {count} of {MAX_RESUMES} resumes
              </div>
              <div className="hint flex gap-1.5">
                <IconLock size={16} className="mt-0.5 flex-none" aria-hidden="true" />
                <span>Private to you. Deleting a resume removes its file, text and matches.</span>
              </div>
            </section>
          )}
        </div>
        <UploadPanel browseRef={browseRef} />
      </div>
    </>
  );
}
