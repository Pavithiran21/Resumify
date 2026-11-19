from bson import ObjectId
from starlette.concurrency import run_in_threadpool

from app.core.database import parse_object_id, run_in_transaction
from app.core.errors import AppError, not_found
from app.core.file_types import detect_job_file_type
from app.core.pagination import PageParams, parse_sort, to_page
from app.core.text_extraction import extract_text
from app.repositories import job_repository, match_repository
from app.schemas.fields import JOB_DESCRIPTION_MAX
from app.schemas.jobs import ExtractedTextOut, JobIn, JobOut, JobSummaryOut

JOB_SORT_FIELDS = ["createdAt", "title"]


async def _find_or_404(user_id: ObjectId, job_id: str) -> dict:
    job = await job_repository.find(user_id, parse_object_id(job_id, "Job"))
    if job is None:
        raise not_found("Job")
    return job


async def _stats(user_id: ObjectId, job_id: ObjectId) -> match_repository.MatchStats:
    stats = await match_repository.stats_by(user_id, "jobId", [job_id])
    return stats.get(job_id, match_repository.NO_MATCHES)


async def create(user_id: ObjectId, data: JobIn) -> JobOut:
    job = await job_repository.insert(user_id, data.title, data.company, data.description)
    return JobOut.from_doc(job, match_count=0)


async def extract_job_text(content: bytes) -> ExtractedTextOut:
    """
    Reads a TXT, PDF or DOCX job ad and returns its text for the description box. Only the
    text is ever kept (when the job is saved); the file is dropped with the request.
    """
    content_type = detect_job_file_type(content)
    if content_type is None:
        raise AppError(415, "FILE_TYPE_NOT_ALLOWED", "Use a TXT, PDF or DOCX file.")

    extracted = await run_in_threadpool(extract_text, content, content_type)
    if len(extracted.text) > JOB_DESCRIPTION_MAX:
        raise AppError(422, "JOB_TOO_LONG", "This is too long. Keep it under 20,000 characters.")
    return ExtractedTextOut(text=extracted.text, character_count=len(extracted.text))


async def list_page(user_id: ObjectId, params: PageParams) -> dict:
    sort = parse_sort(params.sort, JOB_SORT_FIELDS, "-createdAt")
    jobs, total = await job_repository.list_page(user_id, sort, params.skip, params.size)
    stats = await match_repository.stats_by(user_id, "jobId", [job["_id"] for job in jobs])
    items = []
    for job in jobs:
        job_stats = stats.get(job["_id"], match_repository.NO_MATCHES)
        items.append(JobSummaryOut.from_doc(job, job_stats.count, job_stats.best_score))
    return to_page(items, total, params)


async def get(user_id: ObjectId, job_id: str) -> JobOut:
    job = await _find_or_404(user_id, job_id)
    stats = await _stats(user_id, job["_id"])
    return JobOut.from_doc(job, stats.count, stats.best_score)


async def delete(user_id: ObjectId, job_id: str) -> None:
    """The job and all its matches go together, or not at all."""
    job = await job_repository.find_summary(user_id, parse_object_id(job_id, "Job"))
    if job is None:
        raise not_found("Job")

    async def work(session) -> None:
        await match_repository.delete_for_job(user_id, job["_id"], session)
        if not await job_repository.delete(user_id, job["_id"], session):
            raise not_found("Job")

    await run_in_transaction(work)
