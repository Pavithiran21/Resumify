import { IconFile, IconFileText, IconFileTypeDocx, IconFileTypePdf } from '@tabler/icons-react';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** The most resumes one user can keep (the backend refuses the 21st with 409 RESUME_LIMIT). */
export const MAX_RESUMES = 20;

const RESUME_EXTENSIONS = ['.pdf', '.docx'];
const JOB_EXTENSIONS = ['.txt', '.pdf', '.docx'];

/** What each file picker offers. */
export const RESUME_ACCEPT = '.pdf,.docx';
export const JOB_ACCEPT = '.txt,.pdf,.docx';

/**
 * A quick check before uploading, so a 9 MB photo isn't sent just to be refused (the backend refuses
 * a body over 5 MB before reading it, which the browser can see as a dropped connection). The
 * backend still decides from the file's first bytes: a JPG renamed to .pdf passes this check and is
 * refused there. Returns the UI-UX.md message, or null.
 */
function fileProblem(file, extensions, typeMessage) {
  const name = file.name.toLowerCase();
  if (!extensions.some((extension) => name.endsWith(extension))) {
    return typeMessage;
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'File is larger than 5 MB.';
  }
  if (file.size === 0) {
    return 'The file is empty.';
  }
  return null;
}

export function resumeFileProblem(file) {
  return fileProblem(file, RESUME_EXTENSIONS, "Use a PDF or DOCX. Images can't be read yet.");
}

export function jobFileProblem(file) {
  return fileProblem(file, JOB_EXTENSIONS, 'Use a TXT, PDF or DOCX file.');
}

/** "1.8 KB", "412 KB", "2.4 MB". */
export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return kb < 10 ? `${Math.max(0.1, kb).toFixed(1)} KB` : `${Math.round(kb)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The icon and colour for a file, from the type the backend detected (or the chosen file's name). */
export function fileIcon(contentTypeOrName = '') {
  const value = contentTypeOrName.toLowerCase();
  if (value === 'application/pdf' || value.endsWith('.pdf')) {
    return { Icon: IconFileTypePdf, color: 'var(--color-miss)' };
  }
  if (value.includes('wordprocessingml') || value.endsWith('.docx')) {
    return { Icon: IconFileTypeDocx, color: 'var(--color-info)' };
  }
  if (value.endsWith('.txt')) {
    return { Icon: IconFileText, color: 'var(--color-muted)' };
  }
  return { Icon: IconFile, color: 'var(--color-dim)' };
}
