import {
  IconDownload,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconFileUpload,
  IconHistory,
  IconInfoCircle,
  IconTrash,
  IconVersions,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { listMatches } from '../../api/matches';
import { queryKeys } from '../../api/queryKeys';
import { downloadResume, getResume } from '../../api/resumes';
import { Button } from '../../components/Button';
import { ErrorPanel, LoadingPanel, NotFoundPanel, Skeleton } from '../../components/StatePanels';
import { usePageTitle } from '../../hooks/usePageTitle';
import { errorMessage, isNetworkError, isNotFound } from '../../lib/apiErrors';
import { formatDay } from '../../lib/dates';
import { fileIcon, formatFileSize } from '../../lib/files';
import { formatNumber } from '../../lib/numbers';
import { saveFile } from '../../lib/saveFile';
import { useToast } from '../../toast/ToastContext';
import { MatchTable } from '../matches/MatchTable';
import { DeleteResumeDialog, NewVersionDialog } from './ResumeDialogs';

const MATCHES_SHOWN = 20;
const PDF_TYPE = 'application/pdf';

/** Pages, words, matches, size, first uploaded, current version date (UI-UX.md screen 9). */
function Facts({ resume }) {
  const facts = [
    ['Pages', resume.pageCount ?? '–'],
    ['Words', formatNumber(resume.wordCount)],
    ['Matches', formatNumber(resume.matchCount)],
    ['Size', formatFileSize(resume.size)],
    ['First uploaded', formatDay(resume.createdAt)],
    [`Version ${resume.version} from`, formatDay(resume.updatedAt)],
  ];
  return (
    <dl className="facts">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>
            <small>{label}</small>
          </dt>
          <dd className="m-0">
            <b>{value}</b>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The resume's matches, newest first, each opening its result. */
function ResumeMatches({ resume }) {
  const params = { resumeId: resume.id, size: MATCHES_SHOWN };
  const matches = useQuery({ queryKey: queryKeys.matches.list(params), queryFn: () => listMatches(params) });
  if (matches.isPending) {
    return <Skeleton lines={3} />;
  }
  if (matches.isError) {
    return <ErrorPanel error={matches.error} onRetry={matches.refetch} />;
  }
  if (matches.data.totalItems === 0) {
    return (
      <p className="muted m-0 text-sm">
        No matches with this resume yet.{' '}
        <Link to={`/matches/new?resumeId=${resume.id}`} className="link">
          New match
        </Link>
      </p>
    );
  }
  return (
    <>
      <MatchTable matches={matches.data.items} variant="resume" caption="Matches with this resume" />
      {matches.data.totalItems > MATCHES_SHOWN && (
        <Link to={`/matches?resumeId=${resume.id}`} className="more">
          All {matches.data.totalItems} matches
        </Link>
      )}
    </>
  );
}

/**
 * "View resume" (owner's choice, 8 Nov 2026): the PDF itself, in the browser's own PDF viewer.
 * The file comes from the owner-checked download endpoint with the access token (a plain link
 * can't send it) and is shown from a temporary blob: address, made and revoked in one effect, so
 * nothing stays in memory once the panel closes. Only PDFs: browsers can't show a DOCX.
 */
function ResumePdf({ resume }) {
  const panelRef = useRef(null);
  const frameRef = useRef(null);
  const linkRef = useRef(null);
  const file = useQuery({
    queryKey: queryKeys.resumes.file(resume.id, resume.version),
    queryFn: () => downloadResume(resume),
    staleTime: Infinity,
    gcTime: 0,
  });

  // Opened from the buttons above: bring it into view.
  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  useEffect(() => {
    if (!file.data) {
      return undefined;
    }
    const address = URL.createObjectURL(file.data.blob);
    frameRef.current.src = address;
    linkRef.current.href = address;
    return () => URL.revokeObjectURL(address);
  }, [file.data]);

  return (
    <section ref={panelRef} id="resume-pdf" className="panel pad mt-[18px]" aria-labelledby="resume-pdf-title">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="resume-pdf-title" className="t-panel m-0 flex-1">
          {resume.fileName} <span className="ver">v{resume.version}</span>
        </h2>
        {file.data && (
          <a ref={linkRef} className="more" target="_blank" rel="noopener noreferrer">
            Open in a new tab <IconExternalLink size={16} aria-hidden="true" />
          </a>
        )}
      </div>
      {file.isPending && <Skeleton lines={8} />}
      {file.isError && <ErrorPanel error={file.error} onRetry={file.refetch} />}
      {file.data && <iframe ref={frameRef} className="pdf-frame" title={`${resume.fileName}, version ${resume.version}`} />}
    </section>
  );
}

function ResumeView({ resume }) {
  const { showError } = useToast();
  const [dialog, setDialog] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const isPdf = resume.contentType === PDF_TYPE;
  const { Icon, color } = fileIcon(resume.contentType);

  async function download() {
    setDownloading(true);
    try {
      const { blob, fileName } = await downloadResume(resume);
      saveFile(blob, fileName);
    } catch (error) {
      showError(errorMessage(error) ?? error.message, { network: isNetworkError(error) });
    } finally {
      setDownloading(false);
    }
  }

  // The file's details and its matches side by side on a wide screen (they stack below 1150 px);
  // the PDF opens below both, across the full width.
  return (
    <>
    <div className="grid2">
      <section className="panel pad" aria-labelledby="resume-title">
        <div className="crumbs">
          <Link to="/resumes">Resumes</Link> /
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Icon size={34} style={{ color }} aria-hidden="true" />
          <h1 id="resume-title" className="rv-title">
            {resume.fileName}
          </h1>
          <span className="chip c-info">
            <IconVersions size={16} aria-hidden="true" /> Version {resume.version}
          </span>
        </div>
        <Facts resume={resume} />
        <div className="flex flex-wrap gap-2.5">
          <Button variant="primary" onClick={() => setDialog('version')}>
            <IconFileUpload size={18} aria-hidden="true" /> Upload new version
          </Button>
          {isPdf && (
            <Button aria-expanded={showPdf} aria-controls="resume-pdf" onClick={() => setShowPdf((open) => !open)}>
              {showPdf ? <IconEyeOff size={18} aria-hidden="true" /> : <IconEye size={18} aria-hidden="true" />}
              {showPdf ? 'Hide resume' : 'View resume'}
            </Button>
          )}
          <Button pending={downloading} onClick={download}>
            {!downloading && <IconDownload size={18} aria-hidden="true" />} Download
          </Button>
          <Button variant="danger" onClick={() => setDialog('delete')}>
            <IconTrash size={18} aria-hidden="true" /> Delete
          </Button>
        </div>
        {!isPdf && (
          <p className="hint mb-0 flex gap-1.5">
            <IconInfoCircle size={16} className="mt-0.5 flex-none" aria-hidden="true" />
            <span>Only PDF resumes can be viewed here; Download opens this DOCX.</span>
          </p>
        )}
        {dialog === 'version' && <NewVersionDialog resume={resume} onClose={() => setDialog(null)} />}
        {dialog === 'delete' && <DeleteResumeDialog resume={resume} onClose={() => setDialog(null)} />}
      </section>
      <section className="panel pad" aria-labelledby="resume-matches-title">
        <h2 id="resume-matches-title" className="t-panel mt-0 mb-2.5">
          Matches with this resume
        </h2>
        <ResumeMatches resume={resume} />
        <div className="hint flex gap-1.5">
          <IconHistory size={16} className="mt-0.5 flex-none" aria-hidden="true" />
          <span>
            A new version replaces the file and its text. Past matches keep their results and show the version they
            used.
          </span>
        </div>
      </section>
    </div>
    {showPdf && <ResumePdf resume={resume} />}
    </>
  );
}

/** The read-only resume view (UI-UX.md screen 9): /resumes/:resumeId. Every change is an action button. */
export function ResumePage() {
  const { resumeId } = useParams();
  const query = useQuery({ queryKey: queryKeys.resumes.detail(resumeId), queryFn: () => getResume(resumeId) });
  usePageTitle('Resume');

  if (query.isPending) {
    return <LoadingPanel lines={6} label="Loading the resume" />;
  }
  if (query.isError) {
    return isNotFound(query.error) ? <NotFoundPanel /> : <ErrorPanel error={query.error} onRetry={query.refetch} />;
  }
  return <ResumeView resume={query.data} />;
}
