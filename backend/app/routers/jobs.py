from bson import ObjectId
from fastapi import APIRouter, Depends, Request, Response

from app.core.auth import current_user_id
from app.core.pagination import Page, PageParams
from app.core.rate_limit import UPLOADS_PER_USER, per_user
from app.routers.uploads import read_single_file
from app.schemas.jobs import ExtractedTextOut, JobIn, JobOut, JobSummaryOut
from app.services import job_service

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

upload_limit = per_user(UPLOADS_PER_USER, "uploads", "You've uploaded a lot of files this hour. Please wait a while and try again.")


@router.get("", response_model=Page[JobSummaryOut])
async def list_jobs(params: PageParams = Depends(), user_id: ObjectId = Depends(current_user_id)):
    return await job_service.list_page(user_id, params)


@router.post("", status_code=201, response_model=JobOut)
async def create_job(data: JobIn, user_id: ObjectId = Depends(current_user_id)):
    return await job_service.create(user_id, data)


@router.post("/extract-text", response_model=ExtractedTextOut, dependencies=[Depends(upload_limit)])
async def extract_job_text(request: Request, user_id: ObjectId = Depends(current_user_id)):
    """multipart/form-data with one "file" field (TXT, PDF or DOCX). Returns the text; stores nothing."""
    upload = await read_single_file(request)
    return await job_service.extract_job_text(upload.content)


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str, user_id: ObjectId = Depends(current_user_id)):
    return await job_service.get(user_id, job_id)


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, user_id: ObjectId = Depends(current_user_id)):
    await job_service.delete(user_id, job_id)
    return Response(status_code=204)
