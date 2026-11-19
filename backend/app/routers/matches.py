from bson import ObjectId
from fastapi import APIRouter, Depends, Query

from app.core.auth import current_user_id
from app.core.pagination import Page, PageParams
from app.core.rate_limit import MATCH_RUNS_PER_USER, per_user
from app.schemas.matches import CompareOut, MatchIn, MatchOut, MatchSummaryOut
from app.services import match_service

router = APIRouter(prefix="/api/matches", tags=["matches"])

match_limit = per_user(MATCH_RUNS_PER_USER, "match-runs", "You've run 20 matches this hour. Please wait a while and try again.")


@router.get("", response_model=Page[MatchSummaryOut])
async def list_matches(
    params: PageParams = Depends(),
    resume_id: str | None = Query(None, alias="resumeId", max_length=24),
    job_id: str | None = Query(None, alias="jobId", max_length=24),
    user_id: ObjectId = Depends(current_user_id),
):
    return await match_service.list_page(user_id, params, resume_id, job_id)


@router.post("", status_code=201, response_model=MatchOut, dependencies=[Depends(match_limit)])
async def run_match(data: MatchIn, user_id: ObjectId = Depends(current_user_id)):
    """Runs a match of one of the user's resumes against one of their jobs and saves it."""
    return await match_service.run_match(user_id, data)


# Declared before /{match_id}, so "compare" is never read as a match id.
@router.get("/compare", response_model=CompareOut)
async def compare_runs(
    first: str = Query(..., max_length=24),
    second: str = Query(..., max_length=24),
    user_id: ObjectId = Depends(current_user_id),
):
    return await match_service.compare(user_id, first, second)


@router.get("/{match_id}", response_model=MatchOut)
async def get_match(match_id: str, user_id: ObjectId = Depends(current_user_id)):
    return await match_service.get(user_id, match_id)
