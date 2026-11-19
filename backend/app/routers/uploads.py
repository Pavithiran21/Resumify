from dataclasses import dataclass

from fastapi import Request
from starlette.datastructures import UploadFile

from app.core.errors import AppError, field_error
from app.core.file_types import MAX_UPLOAD_BYTES, clean_file_name
from app.core.request_body import discard_body

# Room for the multipart boundaries and headers around a 5 MB file.
FORM_OVERHEAD_BYTES = 64 * 1024
# An oversized upload up to this size is read and dropped before the 413 (core/request_body.py).
MAX_DISCARDED_UPLOAD_BYTES = 2 * MAX_UPLOAD_BYTES


@dataclass
class UploadedFile:
    file_name: str
    content: bytes


def file_too_large() -> AppError:
    return AppError(413, "FILE_TOO_LARGE", "File is larger than 5 MB.")


async def read_single_file(request: Request) -> UploadedFile:
    """
    Reads a multipart/form-data body with one "file" field. The form is read here rather than
    as a route parameter, so an oversized request is refused from its Content-Length before
    anything is parsed or stored (its bytes are only read and dropped, up to 10 MB, so the 413
    reaches the client through a proxy), and the read itself stops one byte past the limit.
    """
    length = request.headers.get("content-length")
    if length is None or not length.isdigit():
        raise AppError(411, "LENGTH_REQUIRED", "Send the file with its size (Content-Length).")
    if int(length) > MAX_UPLOAD_BYTES + FORM_OVERHEAD_BYTES:
        await discard_body(request, MAX_DISCARDED_UPLOAD_BYTES)
        raise file_too_large()

    form = await request.form(max_files=1, max_fields=1)
    try:
        file = form.get("file")
        if not isinstance(file, UploadFile):
            raise field_error(400, "VALIDATION_FAILED", "file", "Choose a file to upload.")
        content = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(content) > MAX_UPLOAD_BYTES:
            raise file_too_large()
        if not content:
            raise AppError(400, "EMPTY_FILE", "The file is empty.")
        return UploadedFile(file_name=clean_file_name(file.filename), content=content)
    finally:
        await form.close()
