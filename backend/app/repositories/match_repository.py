from dataclasses import dataclass

from bson import ObjectId
from pymongo import DESCENDING

from app.core.database import get_db

# A list of matches never needs the skills, keywords, suggestions or the stored AI answer.
SUMMARY_ONLY = {"skills": 0, "keywords": 0, "suggestions": 0, "assessment": 0, "summary": 0, "inputHash": 0}


def _matches():
    return get_db().matches


async def insert(match: dict, session) -> dict:
    result = await _matches().insert_one(match, session=session)
    match["_id"] = result.inserted_id
    return match


async def find(user_id: ObjectId, match_id: ObjectId) -> dict | None:
    return await _matches().find_one({"_id": match_id, "userId": user_id}, {"assessment": 0, "inputHash": 0})


async def find_assessment(user_id: ObjectId, input_hash: str) -> dict | None:
    """The newest stored AI answer for exactly these inputs, if this user has run them before."""
    return await _matches().find_one(
        {"userId": user_id, "inputHash": input_hash},
        {"assessment": 1, "model": 1},
        sort=[("createdAt", DESCENDING), ("_id", DESCENDING)],
    )


async def count_runs(user_id: ObjectId, resume_id: ObjectId, job_id: ObjectId, session=None) -> int:
    return await _matches().count_documents({"userId": user_id, "resumeId": resume_id, "jobId": job_id}, session=session)


async def list_page(user_id: ObjectId, filters: dict, sort: list, skip: int, limit: int) -> tuple[list[dict], int]:
    query = {"userId": user_id, **filters}
    cursor = _matches().find(query, SUMMARY_ONLY).sort(sort).skip(skip).limit(limit)
    matches = await cursor.to_list()
    total = await _matches().count_documents(query)
    return matches, total


@dataclass(frozen=True)
class MatchStats:
    """How many matches a resume or a job has, and its best score (None before its first match)."""

    count: int = 0
    best_score: int | None = None


NO_MATCHES = MatchStats()


async def stats_by(user_id: ObjectId, field: str, ids: list[ObjectId]) -> dict[ObjectId, MatchStats]:
    """
    Each resume's (field="resumeId") or job's (field="jobId") match count and best score: one
    grouped query for a whole page. Ids without matches are left out (NO_MATCHES).
    """
    if not ids:
        return {}
    pipeline = [
        {"$match": {"userId": user_id, field: {"$in": ids}}},
        {"$group": {"_id": f"${field}", "count": {"$sum": 1}, "best": {"$max": "$score"}}},
    ]
    cursor = await _matches().aggregate(pipeline)
    return {row["_id"]: MatchStats(row["count"], row["best"]) async for row in cursor}


async def delete_for_resume(user_id: ObjectId, resume_id: ObjectId, session) -> int:
    result = await _matches().delete_many({"userId": user_id, "resumeId": resume_id}, session=session)
    return result.deleted_count


async def delete_for_job(user_id: ObjectId, job_id: ObjectId, session) -> int:
    result = await _matches().delete_many({"userId": user_id, "jobId": job_id}, session=session)
    return result.deleted_count


async def delete_all_for_user(user_id: ObjectId, session=None) -> int:
    result = await _matches().delete_many({"userId": user_id}, session=session)
    return result.deleted_count
