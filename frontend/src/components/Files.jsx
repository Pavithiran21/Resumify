import { IconFileAlert, IconFileCheck, IconFileUpload } from '@tabler/icons-react';
import { useId, useRef, useState } from 'react';
import { fileIcon } from '../lib/files';

/**
 * A drop zone for one file (UI-UX.md "Upload"): drop a file on it, or use its "Browse files" button,
 * which opens the hidden file input. onFile gets the chosen File. The drop zone itself is not a
 * button, so keyboard users reach the real button inside it.
 */
export function DropZone({ title, hint, accept, onFile, disabled = false, compact = false, browseRef }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // The same file can be chosen again after an error.
    if (file) {
      onFile(file);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !disabled) {
      onFile(file);
    }
  }

  return (
    <div
      className={`drop ${over ? 'over' : ''} ${compact ? 'compact' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      {!compact && <IconFileUpload size={34} className="mx-auto text-accent" aria-hidden="true" />}
      <div className="mt-1.5 font-bold text-strong">{title}</div>
      <div className="dim text-[13px]">{hint}</div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={choose}
        disabled={disabled}
      />
      <button
        ref={browseRef}
        type="button"
        className="btn btn-secondary btn-sm mt-3"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        data-autofocus
      >
        Browse files
      </button>
    </div>
  );
}

/**
 * One file being read or refused (UI-UX.md "Upload"): its type icon and name, then "Reading text… 60%"
 * with a progress bar, a done line, or the backend's error message in red.
 * state: { name, status: 'reading' | 'done' | 'error', progress, message }
 */
export function FileRow({ state }) {
  const { Icon, color } = fileIcon(state.name);
  if (state.status === 'error') {
    return (
      <div className="file bad">
        <IconFileAlert size={24} className="flex-none text-danger" aria-hidden="true" />
        <div className="grow">
          <b className="text-sm">{state.name}</b>
          <div className="err-text" role="alert">
            {state.message}
          </div>
        </div>
      </div>
    );
  }
  if (state.status === 'done') {
    return (
      <div className="file good">
        <IconFileCheck size={24} className="flex-none text-match" aria-hidden="true" />
        <div className="grow">
          <b className="text-sm">{state.name}</b>
          <div className="dim text-xs">{state.message}</div>
        </div>
      </div>
    );
  }
  // While the bytes are sent the bar follows them; once all are sent the server is reading the text.
  const sending = state.progress < 100;
  return (
    <div className="file" role="status">
      <Icon size={24} className="flex-none" style={{ color }} aria-hidden="true" />
      <div className="grow">
        <b className="text-sm">{state.name}</b>
        <div className="dim text-xs">{sending ? `Reading text… ${state.progress}%` : 'Reading text…'}</div>
        <div className="prog">
          <span style={{ width: `${sending ? state.progress : 100}%` }} />
        </div>
      </div>
    </div>
  );
}
