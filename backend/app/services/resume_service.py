from bson import ObjectId
from starlette.concurrency import run_in_threadpool

from app.core.database import parse_object_id, run_in_transaction
from app.core.errors import AppError, not_found
from app.core.file_types import detect_content_type
from app.core.pagination import PageParams, parse_sort, to_page
from app.core.text_extraction import ExtractedText, extract_text
from app.repositories import match_repository, resume_repository
from app.schemas.resumes import ResumeOut

# Atlas M0 holds 512 MB in total: 20 resumes of at most 5 MB is a sensible ceiling per user.
MAX_RESUMES_PER_USER = 20
RESUME_SORT_FIELDS = ["createdAt", "updatedAt", "fileName"]


def wrong_file_type() -> AppError:
    return AppError(415, "FILE_TYPE_NOT_ALLOWED", "Use a PDF or DOCX. Images can't be read yet.")


async def _read(content: bytes) -> tuple[str, ExtractedText]:
    """The real type from the first bytes, then the text (CPU work, so in a worker thread)."""
    content_type = detect_content_type(content)
    if content_type is None:
        raise wrong_file_type()
    extracted = await run_in_threadpool(extract_text, content, content_type)
    return content_type, extracted


async def _find_or_404(user_id: ObjectId, resume_id: str) -> dict:
    # Filtered by owner in the query itself: someone else's resume is a 404, same as a missing one.
    resume = await resume_repository.find_details(user_id, parse_object_id(resume_id, "Resume"))
    if resume is None:
        raise not_found("Resume")
    return resume


async def _stats(user_id: ObjectId, resume_id: ObjectId) -> match_repository.MatchStats:
    stats = await match_repository.stats_by(user_id, "resumeId", [resume_id])
    return stats.get(resume_id, match_repository.NO_MATCHES)


async def upload(user_id: ObjectId, file_name: str, content: bytes) -> ResumeOut:
    # A soft limit: two uploads at the very same moment could both pass it, which is harmless.
    if await resume_repository.count_for_user(user_id) >= MAX_RESUMES_PER_USER:
        raise AppError(409, "RESUME_LIMIT", f"You can keep up to {MAX_RESUMES_PER_USER} resumes. Delete one first.")

    content_type, extracted = await _read(content)
    resume = await resume_repository.insert(user_id, file_name, content_type, content, extracted)
    return ResumeOut.from_doc(resume, match_count=0)


async def upload_new_version(user_id: ObjectId, resume_id: str, file_name: str, content: bytes) -> ResumeOut:
    """Same resume id, version + 1. Ownership is checked before the file is even read."""
    resume = await _find_or_404(user_id, resume_id)
    content_type, extracted = await _read(content)

    updated = await resume_repository.replace_file(user_id, resume["_id"], file_name, content_type, content, extracted)
    if updated is None:
        raise not_found("Resume")
    stats = await _stats(user_id, updated["_id"])
    return ResumeOut.from_doc(updated, stats.count, stats.best_score)


async def list_page(user_id: ObjectId, params: PageParams) -> dict:
    sort = parse_sort(params.sort, RESUME_SORT_FIELDS, "-createdAt")
    resumes, total = await resume_repository.list_page(user_id, sort, params.skip, params.size)
    stats = await match_repository.stats_by(user_id, "resumeId", [resume["_id"] for resume in resumes])
    items = []
    for resume in resumes:
        resume_stats = stats.get(resume["_id"], match_repository.NO_MATCHES)
        items.append(ResumeOut.from_doc(resume, resume_stats.count, resume_stats.best_score))
    return to_page(items, total, params)


async def get(user_id: ObjectId, resume_id: str) -> ResumeOut:
    resume = await _find_or_404(user_id, resume_id)
    stats = await _stats(user_id, resume["_id"])
    return ResumeOut.from_doc(resume, stats.count, stats.best_score)


async def get_for_download(user_id: ObjectId, resume_id: str) -> dict:
    resume = await resume_repository.find_with_file(user_id, parse_object_id(resume_id, "Resume"))
    if resume is None:
        raise not_found("Resume")
    return resume


async def delete(user_id: ObjectId, resume_id: str) -> None:
    """The resume (its file and text) and all its matches go together, or not at all."""
    resume = await _find_or_404(user_id, resume_id)

    async def work(session) -> None:
        await match_repository.delete_for_resume(user_id, resume["_id"], session)
        if not await resume_repository.delete(user_id, resume["_id"], session):
            raise not_found("Resume")

    await run_in_transaction(work)


async def delete_all(user_id: ObjectId) -> None:
    """Every resume and every match of this user. Jobs and the account stay."""

    async def work(session) -> None:
        await match_repository.delete_all_for_user(user_id, session)
        await resume_repository.delete_all_for_user(user_id, session)

    await run_in_transaction(work)
