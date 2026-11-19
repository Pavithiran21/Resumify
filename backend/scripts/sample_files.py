"""
Builds real PDF and DOCX files from lines of text, for the seed scripts (and for trying the
upload endpoints by hand). The files go through the same upload code as a user's files, so
their text is read back by pypdf and python-docx exactly like any other resume.

  make_docx(lines)  a Word document, one paragraph per line (python-docx)
  make_pdf(lines)   a plain PDF, one text line per line, 46 lines per A4 page. PDF is a text
                    format with a table of byte offsets at the end, so a simple text-only file
                    can be written by hand without another library.

Usage (from backend/), to write sample files for a hand check:
  .venv\\Scripts\\python.exe -m scripts.sample_files <folder>
  .venv\\Scripts\\python.exe -m scripts.sample_files <folder> --e2e   also the Playwright test files
"""

import io
import sys
from pathlib import Path

from docx import Document

LINES_PER_PAGE = 46


def make_docx(lines: list[str]) -> bytes:
    document = Document()
    for line in lines:
        document.add_paragraph(line)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def _pdf_string(text: str) -> bytes:
    # PDF strings are wrapped in ( ); a backslash, ( or ) inside must be escaped.
    escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    return b"(" + escaped.encode("cp1252", errors="replace") + b")"


def _page_content(lines: list[str]) -> bytes:
    # BT/ET: a text block. 11 pt Helvetica, 15 pt between lines, starting near the top left.
    parts = [b"BT", b"/F1 11 Tf", b"15 TL", b"56 790 Td"]
    for line in lines:
        parts.append(_pdf_string(line) + b" Tj T*")
    parts.append(b"ET")
    return b"\n".join(parts)


def make_pdf(lines: list[str]) -> bytes:
    pages = [lines[start : start + LINES_PER_PAGE] for start in range(0, len(lines), LINES_PER_PAGE)] or [[]]

    # Objects 1-3 are the catalog, the page tree and the font; then a page and its text per page.
    objects: dict[int, bytes] = {3: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"}
    page_ids = []
    for index, page_lines in enumerate(pages):
        page_id = 4 + index * 2
        content_id = page_id + 1
        content = _page_content(page_lines)
        objects[page_id] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 3 0 R >> >> /Contents {content_id} 0 R >>"
        ).encode()
        objects[content_id] = f"<< /Length {len(content)} >>\nstream\n".encode() + content + b"\nendstream"
        page_ids.append(page_id)

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
    objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode()

    output = bytearray(b"%PDF-1.4\n")
    offsets = {}
    for object_id in sorted(objects):
        offsets[object_id] = len(output)
        output += f"{object_id} 0 obj\n".encode() + objects[object_id] + b"\nendobj\n"

    # The cross-reference table: where each object starts, so a reader can jump to it.
    xref_start = len(output)
    size = max(objects) + 1
    output += f"xref\n0 {size}\n".encode() + b"0000000000 65535 f \n"
    for object_id in range(1, size):
        output += f"{offsets[object_id]:010d} 00000 n \n".encode()
    output += f"trailer\n<< /Size {size} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode()
    return bytes(output)


def make_locked_pdf(lines: list[str], password: str = "open-sesame") -> bytes:
    """A PDF that needs a password to open, which the upload refuses (422 FILE_PROTECTED)."""
    from pypdf import PdfReader, PdfWriter

    writer = PdfWriter(clone_from=PdfReader(io.BytesIO(make_pdf(lines))))
    writer.encrypt(user_password=password, algorithm="RC4-128")
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def make_zip_bomb_docx(unpacked_bytes: int = 31 * 1024 * 1024) -> bytes:
    """
    A small file that looks like a DOCX (a ZIP holding word/document.xml) but would unpack to more
    than 30 MB. Spaces compress about 1000 to 1, so the file itself is only a few tens of KB.
    """
    import zipfile

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        archive.writestr("word/document.xml", b" " * unpacked_bytes)
    return buffer.getvalue()


def e2e_files() -> dict[str, bytes]:
    """
    The extra files the Playwright tests use (written by e2e/prepare.js before every run):
    the texts of Meera's resumes, Arjun's resume, the job as PDF and DOCX, and the files the
    upload must refuse.
    """
    from scripts import sample_data

    return {
        # The text each resume PDF is made from, so a test can check that every quote is really in it.
        "Meera_Iyer_2026_v1.txt": "\n".join(sample_data.MEERA_RESUME_V1).encode(),
        "Meera_Iyer_2026_v2.txt": "\n".join(sample_data.MEERA_RESUME_V2).encode(),
        "Arjun_Mehta_Backend.pdf": make_pdf(sample_data.ARJUN_RESUME),
        "Northwind_Frontend_Developer.pdf": make_pdf(sample_data.NORTHWIND_JOB["description"].splitlines()),
        "Northwind_Frontend_Developer.docx": make_docx(sample_data.NORTHWIND_JOB["description"].splitlines()),
        # Refused: a password-protected PDF, a scan with no text layer, and 31 pages (limit 30).
        "Resume_locked.pdf": make_locked_pdf(sample_data.MEERA_RESUME_V1),
        "Resume_scan.pdf": make_pdf([]),
        "Resume_31_pages.pdf": make_pdf([f"Line {number} of a very long document" for number in range(31 * LINES_PER_PAGE)]),
        "Resume_zip_bomb.docx": make_zip_bomb_docx(),
    }


def main() -> None:
    import argparse

    from scripts import sample_data

    parser = argparse.ArgumentParser(description="Writes sample resumes and job files for trying uploads by hand.")
    parser.add_argument("folder", nargs="?", default=".")
    parser.add_argument("--e2e", action="store_true", help="also write the files the Playwright tests use")
    parser.add_argument("--quiet", action="store_true", help="don't list the files written")
    args = parser.parse_args()

    folder = Path(args.folder)
    folder.mkdir(parents=True, exist_ok=True)
    files = {
        "Meera_Iyer_2026_v1.pdf": make_pdf(sample_data.MEERA_RESUME_V1),
        "Meera_Iyer_2026_v2.pdf": make_pdf(sample_data.MEERA_RESUME_V2),
        "Meera_Iyer_Design.docx": make_docx(sample_data.MEERA_DESIGN_RESUME),
        "Northwind_Frontend_Developer.txt": sample_data.NORTHWIND_JOB["description"].encode(),
        "Orbit_UI_Engineer.docx": make_docx(sample_data.ORBIT_JOB["description"].splitlines()),
    }
    if args.e2e:
        files.update(e2e_files())
    for name, content in files.items():
        (folder / name).write_bytes(content)
        if not args.quiet:
            print(f"{folder / name} ({len(content)} bytes)")


if __name__ == "__main__":
    main()
