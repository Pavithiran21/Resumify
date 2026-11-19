"""
Shared by seed_dev and seed_demo. Every account is built through the same services the API
uses: real PDF and DOCX files are uploaded and read, and every match runs the full pipeline
(skills dictionary, the model through LLM_BASE_URL, the checks and the score). The match
model must therefore be reachable: the real API, or the stand-in (node e2e/mocks/llm-stub.js).
Afterwards the timestamps are moved back a few days, so the history looks like real use.
"""

from datetime import timedelta

from bson import ObjectId

from app.core.database import get_db
from app.core.dates import utc_now
from app.core.security import hash_password
from app.repositories import job_repository, match_repository, resume_repository, token_repository, user_repository
from app.schemas.jobs import JobIn
from app.schemas.matches import MatchIn
from app.services import job_service, match_service, resume_service
from scripts import sample_data
from scripts.sample_files import make_docx, make_pdf


async def remove_account(email: str) -> bool:
    """Deletes one account and everything it owns (files and text included). Returns whether it existed."""
    user = await user_repository.find_by_email(email)
    if user is None:
        return False
    user_id = user["_id"]

    await match_repository.delete_all_for_user(user_id)
    await job_repository.delete_all_for_user(user_id)
    await resume_repository.delete_all_for_user(user_id)
    await token_repository.delete_all_refresh_tokens(user_id)
    await token_repository.delete_all_reset_tokens(user_id)
    await user_repository.delete(user_id)
    return True


async def _days_ago(collection: str, item_id: str, days: float, *fields: str) -> None:
    when = utc_now() - timedelta(days=days)
    await get_db()[collection].update_one({"_id": ObjectId(item_id)}, {"$set": {field: when for field in fields}})


async def _run(user_id: ObjectId, resume_id: str, job_id: str):
    return await match_service.run_match(user_id, MatchIn(resume_id=resume_id, job_id=job_id))


async def create_job_seeker(name: str, email: str, password: str, is_demo: bool) -> dict:
    """
    Meera's story: two resumes, three saved jobs and four matches. The Northwind job was run on
    version 1 of her main resume and again after she uploaded version 2 (TypeScript and
    accessibility added), so "Compare runs" has something to show.
    """
    user = await user_repository.create(name, email, await hash_password(password), is_demo=is_demo)
    user_id = user["_id"]

    main_resume = await resume_service.upload(user_id, "Meera_Iyer_2026.pdf", make_pdf(sample_data.MEERA_RESUME_V1))
    design_resume = await resume_service.upload(user_id, "Meera_Iyer_Design.docx", make_docx(sample_data.MEERA_DESIGN_RESUME))
    northwind = await job_service.create(user_id, JobIn(**sample_data.NORTHWIND_JOB))
    orbit = await job_service.create(user_id, JobIn(**sample_data.ORBIT_JOB))
    harbor = await job_service.create(user_id, JobIn(**sample_data.HARBOR_JOB))

    first_run = await _run(user_id, main_resume.id, northwind.id)
    design_run = await _run(user_id, design_resume.id, orbit.id)
    await resume_service.upload_new_version(user_id, main_resume.id, "Meera_Iyer_2026.pdf", make_pdf(sample_data.MEERA_RESUME_V2))
    second_run = await _run(user_id, main_resume.id, northwind.id)
    harbor_run = await _run(user_id, main_resume.id, harbor.id)

    # Version 1 uploaded 6 days ago, version 2 yesterday; each match some time after its inputs.
    await _days_ago("resumes", main_resume.id, 6, "createdAt")
    await _days_ago("resumes", main_resume.id, 1.1, "updatedAt")
    await _days_ago("resumes", design_resume.id, 15, "createdAt", "updatedAt")
    await _days_ago("jobs", northwind.id, 6, "createdAt")
    await _days_ago("jobs", orbit.id, 15, "createdAt")
    await _days_ago("jobs", harbor.id, 3, "createdAt")
    await _days_ago("matches", design_run.id, 14.9, "createdAt")
    await _days_ago("matches", first_run.id, 5.9, "createdAt")
    await _days_ago("matches", harbor_run.id, 1.05, "createdAt")
    await _days_ago("matches", second_run.id, 1, "createdAt")

    scores = f"Northwind {first_run.score} -> {second_run.score}, Orbit {design_run.score}, Harbor {harbor_run.score}"
    return {"email": email, "resumes": 2, "jobs": 3, "matches": 4, "scores": scores}


async def create_other_user(name: str, email: str, password: str, is_demo: bool) -> dict:
    """A second account with its own resume, job and match: only there to show that its data is "not found" to Meera."""
    user = await user_repository.create(name, email, await hash_password(password), is_demo=is_demo)
    user_id = user["_id"]

    resume = await resume_service.upload(user_id, "Arjun_Mehta_Backend.pdf", make_pdf(sample_data.ARJUN_RESUME))
    job = await job_service.create(user_id, JobIn(**sample_data.HARBOR_JOB))
    match = await _run(user_id, resume.id, job.id)

    await _days_ago("resumes", resume.id, 4, "createdAt", "updatedAt")
    await _days_ago("jobs", job.id, 4, "createdAt")
    await _days_ago("matches", match.id, 3.9, "createdAt")
    return {"email": email, "resumes": 1, "jobs": 1, "matches": 1, "scores": f"Harbor {match.score}"}
