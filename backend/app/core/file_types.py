import io
import zipfile

PDF = "application/pdf"
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
TXT = "text/plain"

# Resumes and job files (UI-UX.md: "up to 5 MB"), well under MongoDB's 16 MB document limit.
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
# The usual file-system limit for a file name.
MAX_FILE_NAME_LENGTH = 255


def clean_file_name(raw: str | None) -> str:
    """
    The name is only shown and sent back in Content-Disposition, never used as a path. Old
    browsers send a full path, so only its last part is kept, and a long name is cut to 255
    characters, keeping its extension.
    """
    name = (raw or "").replace("\\", "/").rsplit("/", 1)[-1].strip()
    name = "".join(character for character in name if character.isprintable())
    if not name:
        return "resume"
    if len(name) <= MAX_FILE_NAME_LENGTH:
        return name
    stem, dot, extension = name.rpartition(".")
    if dot and len(extension) <= 10:
        return stem[: MAX_FILE_NAME_LENGTH - len(extension) - 1] + "." + extension
    return name[:MAX_FILE_NAME_LENGTH]


def detect_content_type(content: bytes) -> str | None:
    """
    Works out the real type from the file's first bytes (its "magic number"), never from the
    name or the Content-Type header, which the sender controls. Returns None for anything
    else, for example a JPG renamed to .pdf.
    """
    if content.startswith(b"%PDF-"):
        return PDF
    if content.startswith(b"PK\x03\x04") and _is_docx(content):
        return DOCX
    return None


def detect_job_file_type(content: bytes) -> str | None:
    """A job description may also be plain text, which has no magic number: it must be UTF-8 without NUL bytes."""
    content_type = detect_content_type(content)
    if content_type is not None:
        return content_type
    if b"\x00" in content:
        return None
    try:
        content.decode("utf-8-sig")
    except UnicodeDecodeError:
        return None
    return TXT


def _is_docx(content: bytes) -> bool:
    # A DOCX is a ZIP archive with a Word document inside. Only the list of names is read here,
    # nothing is unpacked.
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            names = set(archive.namelist())
        return "[Content_Types].xml" in names and "word/document.xml" in names
    except zipfile.BadZipFile:
        return False
