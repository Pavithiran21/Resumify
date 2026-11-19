import io
import logging
import re
import zipfile
from dataclasses import dataclass

from docx import Document
from pypdf import PdfReader

from app.core.errors import AppError
from app.core.file_types import DOCX, PDF, TXT

logger = logging.getLogger("resumify.files")

# A resume or job ad is a few pages. These caps stop a huge or hostile file from tying up the
# server: a 5 MB PDF with thousands of pages, or a DOCX (a ZIP) that unpacks to gigabytes.
MAX_PAGES = 30
MAX_DOCX_UNPACKED_BYTES = 30 * 1024 * 1024
MAX_TEXT_CHARACTERS = 100_000

CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
DOCX_PAGES = re.compile(rb"<Pages>(\d+)</Pages>")


@dataclass
class ExtractedText:
    text: str
    page_count: int | None
    word_count: int


def no_text_found() -> AppError:
    return AppError(422, "NO_TEXT_FOUND", "We couldn't read any text from this file.")


def clean_text(raw: str) -> str:
    """
    One clean-up for every text Resumify keeps (from a PDF, a DOCX, a TXT or pasted): control
    characters removed, spaces inside a line collapsed, at most one empty line in a row.
    """
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    text = CONTROL_CHARACTERS.sub(" ", text)

    lines = []
    previous_blank = True
    for line in text.split("\n"):
        line = " ".join(line.split())
        if line:
            lines.append(line)
            previous_blank = False
        elif not previous_blank:
            lines.append("")
            previous_blank = True
    return "\n".join(lines).strip()


def extract_text(content: bytes, content_type: str) -> ExtractedText:
    """
    Reads the text out of a PDF, DOCX or TXT file. CPU-bound, so callers run it in a worker
    thread. Raises AppError (422) when the file can't be read or holds no text, for example
    a scanned PDF, which is only pictures of text.
    """
    try:
        if content_type == PDF:
            raw, page_count = _read_pdf(content)
        elif content_type == DOCX:
            raw, page_count = _read_docx(content)
        elif content_type == TXT:
            raw, page_count = content.decode("utf-8-sig"), None
        else:
            raise ValueError(f"Unsupported content type {content_type}")
    except AppError:
        raise
    except Exception as error:
        # pypdf and python-docx raise many kinds of errors for a damaged file. Only the error
        # type is logged: never the file name or its contents.
        logger.info("File could not be read: %s", type(error).__name__)
        raise no_text_found() from None

    text = clean_text(raw)[:MAX_TEXT_CHARACTERS]
    if not text:
        raise no_text_found()
    return ExtractedText(text=text, page_count=page_count, word_count=len(text.split()))


def _too_many_pages() -> AppError:
    return AppError(422, "TOO_MANY_PAGES", f"This file has more than {MAX_PAGES} pages. Upload just the resume or job description.")


def _read_pdf(content: bytes) -> tuple[str, int]:
    reader = PdfReader(io.BytesIO(content))
    if reader.is_encrypted:
        # Many PDFs are "encrypted" with an empty password only to block editing; those still open.
        if not reader.decrypt(""):
            raise AppError(422, "FILE_PROTECTED", "This PDF is password-protected. Save it without a password and try again.")

    page_count = len(reader.pages)
    if page_count > MAX_PAGES:
        raise _too_many_pages()
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages), page_count


def _read_docx(content: bytes) -> tuple[str, int | None]:
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        # file_size is the unpacked size written in the ZIP's directory, so this check reads nothing.
        if sum(info.file_size for info in archive.infolist()) > MAX_DOCX_UNPACKED_BYTES:
            raise no_text_found()
        names = set(archive.namelist())
        properties = archive.read("docProps/app.xml") if "docProps/app.xml" in names else b""

    # Word writes the page count it last showed into docProps/app.xml; other tools may not.
    found = DOCX_PAGES.search(properties)
    page_count = int(found.group(1)) if found and int(found.group(1)) > 0 else None
    if page_count is not None and page_count > MAX_PAGES:
        raise _too_many_pages()

    document = Document(io.BytesIO(content))
    parts = [paragraph.text for paragraph in document.paragraphs]
    for table in document.tables:
        for row in table.rows:
            # A merged cell is returned once per column it covers, so repeats in a row are skipped.
            seen = []
            for cell in row.cells:
                if cell.text not in seen:
                    seen.append(cell.text)
            parts.append("  ".join(seen))
    return "\n".join(parts), page_count
