from urllib.parse import quote

from bson import ObjectId
from fastapi import APIRouter, Depends, Request, Response

from app.core.auth import current_user_id
from app.core.pagination import Page, PageParams
from app.core.rate_limit import UPLOADS_PER_USER, per_user
from app.routers.uploads import read_single_file
from app.schemas.resumes import ResumeOut
from app.services import resume_service

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

upload_limit = per_user(UPLOADS_PER_USER, "uploads", "You've uploaded a lot of files this hour. Please wait a while and try again.")


def content_disposition(file_name: str) -> str:
    # An ASCII fallback name for old clients, and the real name (RFC 5987) for everyone else.
    fallback = "".join(c if c.isascii() and c.isprintable() and c not in '"\\' else "_" for c in file_name)
    return f"attachment; filename=\"{fallback}\"; filename*=UTF-8''{quote(file_name, safe='')}"


@router.get("", response_model=Page[ResumeOut])
async def list_resumes(params: PageParams = Depends(), user_id: ObjectId = Depends(current_user_id)):
    return await resume_service.list_page(user_id, params)


@router.post("", status_code=201, response_model=ResumeOut, dependencies=[Depends(upload_limit)])
async def upload_resume(request: Request, user_id: ObjectId = Depends(current_user_id)):
    """multipart/form-data with one "file" field: a PDF or DOCX of at most 5 MB."""
    upload = await read_single_file(request)
    return await resume_service.upload(user_id, upload.file_name, upload.content)


@router.delete("", status_code=204)
async def delete_all_resumes(user_id: ObjectId = Depends(current_user_id)):
    await resume_service.delete_all(user_id)
    return Response(status_code=204)


@router.get("/{resume_id}", response_model=ResumeOut)
async def get_resume(resume_id: str, user_id: ObjectId = Depends(current_user_id)):
    return await resume_service.get(user_id, resume_id)


@router.post("/{resume_id}/versions", response_model=ResumeOut, dependencies=[Depends(upload_limit)])
async def upload_new_version(resume_id: str, request: Request, user_id: ObjectId = Depends(current_user_id)):
    """A new file for the same resume (version + 1), so it can be matched again and compared."""
    upload = await read_single_file(request)
    return await resume_service.upload_new_version(user_id, resume_id, upload.file_name, upload.content)


@router.get("/{resume_id}/download")
async def download_resume(resume_id: str, user_id: ObjectId = Depends(current_user_id)):
    resume = await resume_service.get_for_download(user_id, resume_id)
    return Response(
        content=bytes(resume["data"]),
        media_type=resume["contentType"],
        headers={
            "Content-Disposition": content_disposition(resume["fileName"]),
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(resume_id: str, user_id: ObjectId = Depends(current_user_id)):
    await resume_service.delete(user_id, resume_id)
    return Response(status_code=204)
