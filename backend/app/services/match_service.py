from bson import ObjectId

from app.core import matching
from app.core.config import get_settings
from app.core.database import parse_object_id, run_in_transaction
from app.core.dates import utc_now
from app.core.errors import AppError, field_error, not_found
from app.core.pagination import PageParams, parse_sort, to_page
from app.repositories import job_repository, match_repository, resume_repository
from app.schemas.assessment import AiAssessment
from app.schemas.matches import CompareOut, MatchIn, MatchOut, MatchSummaryOut, RunOut
from app.services import match_assessment

MATCH_SORT_FIELDS = ["createdAt", "score"]


async def _load_inputs(user_id: ObjectId, data: MatchIn) -> tuple[dict, dict]:
    # Both are filtered by owner: another user's resume or job is simply "not found".
    resume = await resume_repository.find_with_text(user_id, parse_object_id(data.resume_id, "Resume"))
    if resume is None:
        raise not_found("Resume")
    job = await job_repository.find(user_id, parse_object_id(data.job_id, "Job"))
    if job is None:
        raise not_found("Job")
    return resume, job


async def _get_assessment(user_id: ObjectId, resume: dict, job: dict, analysis: matching.Analysis, input_hash: str) -> tuple[AiAssessment, str, bool]:
    """
    The AI answer for these inputs: the stored one if this user already ran exactly these
    inputs (no model call, same score), otherwise a new one. Returns (answer, model, reused).
    """
    earlier = await match_repository.find_assessment(user_id, input_hash)
    if earlier is not None:
        return AiAssessment.model_validate(earlier["assessment"]), earlier["model"], True

    assessment = await match_assessment.assess(job["title"], job["description"], resume["text"], analysis)
    return assessment, get_settings().llm_model, False


def _match_document(user_id, resume, job, result: matching.MatchResult, assessment, model, reused, input_hash) -> dict:
    experience_met = None
    if result.required_years is not None and result.resume_years is not None:
        experience_met = result.resume_years >= result.required_years

    return {
        "userId": user_id,
        "resumeId": resume["_id"],
        "resumeVersion": resume["version"],
        "resumeFileName": resume["fileName"],
        "jobId": job["_id"],
        "jobTitle": job["title"],
        "jobCompany": job.get("company"),
        "score": result.score,
        "verdict": result.verdict,
        "summary": result.summary,
        "breakdown": {
            "skills": {"matched": result.skills_matched, "total": len(result.skills)},
            "keywords": {"matched": len(result.keywords_matched), "total": len(result.keywords_matched) + len(result.keywords_missing)},
            "experience": {"resumeYears": result.resume_years, "requiredYears": result.required_years, "met": experience_met},
        },
        "skills": result.skills,
        "keywords": {"matched": result.keywords_matched, "missing": result.keywords_missing},
        "suggestions": result.suggestions,
        "model": model,
        "promptVersion": matching.PROMPT_VERSION,
        "inputHash": input_hash,
        # The checked AI answer, kept so a run with the same inputs can reuse it.
        "assessment": assessment.model_dump(),
        "assessmentReused": reused,
    }


async def _save(user_id: ObjectId, resume: dict, job: dict, match: dict) -> dict:
    """
    Saves the match in one transaction with a write to its resume and its job (see BACKEND.md,
    "Saving a match safely"). A match is never saved for a resume or job that was deleted, or
    for a resume that got a new version, while the model was working; and the run number is
    counted inside the same transaction, so two runs saved together can't both be "run 2".
    """

    async def work(session) -> dict:
        now = utc_now()
        if not await resume_repository.mark_matched(user_id, resume["_id"], resume["version"], now, session):
            if await resume_repository.find_details(user_id, resume["_id"], session) is None:
                raise not_found("Resume")
            raise AppError(409, "RESUME_CHANGED", "A new version of this resume was uploaded while the match was running. Run it again.")
        if not await job_repository.mark_matched(user_id, job["_id"], now, session):
            raise not_found("Job")

        earlier_runs = await match_repository.count_runs(user_id, resume["_id"], job["_id"], session)
        document = {**match, "runNumber": earlier_runs + 1, "createdAt": now}
        return await match_repository.insert(document, session)

    return await run_in_transaction(work)


async def run_match(user_id: ObjectId, data: MatchIn) -> MatchOut:
    resume, job = await _load_inputs(user_id, data)

    # Step 1, in code: skills, keywords and years found in the texts.
    analysis = matching.analyse(job["description"], resume["text"], utc_now().year, job["title"], job.get("company"))
    settings = get_settings()
    input_hash = matching.input_hash(settings.llm_base_url, settings.llm_model, job["title"], job["description"], resume["text"])

    # Step 2, the AI model (or its stored answer for these exact inputs).
    assessment, model, reused = await _get_assessment(user_id, resume, job, analysis, input_hash)

    # Steps 3 and 4, in code: check the answer against the texts, merge, score.
    result = matching.combine(analysis, assessment, job["description"], resume["text"])

    saved = await _save(user_id, resume, job, _match_document(user_id, resume, job, result, assessment, model, reused, input_hash))
    return MatchOut.from_doc(saved, run_count=saved["runNumber"])


async def _find_or_404(user_id: ObjectId, match_id: str) -> dict:
    match = await match_repository.find(user_id, parse_object_id(match_id, "Match"))
    if match is None:
        raise not_found("Match")
    return match


async def get(user_id: ObjectId, match_id: str) -> MatchOut:
    match = await _find_or_404(user_id, match_id)
    run_count = await match_repository.count_runs(user_id, match["resumeId"], match["jobId"])
    return MatchOut.from_doc(match, run_count)


async def list_page(user_id: ObjectId, params: PageParams, resume_id: str | None, job_id: str | None) -> dict:
    """Newest first. resumeId and jobId narrow it to one resume and/or job (the Compare picker uses both)."""
    filters = {}
    if resume_id:
        filters["resumeId"] = parse_object_id(resume_id, "Resume")
    if job_id:
        filters["jobId"] = parse_object_id(job_id, "Job")

    sort = parse_sort(params.sort, MATCH_SORT_FIELDS, "-createdAt")
    matches, total = await match_repository.list_page(user_id, filters, sort, params.skip, params.size)
    return to_page([MatchSummaryOut.from_doc(match) for match in matches], total, params)


async def compare(user_id: ObjectId, first_id: str, second_id: str) -> CompareOut:
    if first_id == second_id:
        raise field_error(400, "VALIDATION_FAILED", "second", "Pick two different runs.")

    first = await _find_or_404(user_id, first_id)
    second = await _find_or_404(user_id, second_id)
    if first["resumeId"] != second["resumeId"] or first["jobId"] != second["jobId"]:
        raise AppError(422, "NOT_SAME_INPUTS", "Compare two runs of the same resume against the same job.")

    older, newer = sorted([first, second], key=lambda match: match["runNumber"])
    skill_changes, still_missing = matching.compare_skills(older["skills"], newer["skills"])
    return CompareOut(
        resume_file_name=newer["resumeFileName"],
        job_title=newer["jobTitle"],
        job_company=newer.get("jobCompany"),
        first=RunOut.from_doc(older),
        second=RunOut.from_doc(newer),
        score_change=newer["score"] - older["score"],
        skill_changes=skill_changes,
        still_missing=still_missing,
    )
