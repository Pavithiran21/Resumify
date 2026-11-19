from datetime import datetime

from app.core.matching import verdict_for
from app.schemas.common import ApiModel
from app.schemas.fields import CompanyName, JobDescription, JobTitle
from app.schemas.matches import Verdict


class JobIn(ApiModel):
    title: JobTitle
    company: CompanyName = None
    description: JobDescription


class JobSummaryOut(ApiModel):
    """A job in a list: the description is left out."""

    id: str
    title: str
    company: str | None
    character_count: int
    match_count: int
    # The best score of the job's matches and its verdict (the list's score ring); None before the first match.
    best_score: int | None
    best_verdict: Verdict | None
    created_at: datetime

    @classmethod
    def from_doc(cls, job: dict, match_count: int, best_score: int | None = None) -> "JobSummaryOut":
        return cls(
            id=str(job["_id"]),
            title=job["title"],
            company=job.get("company"),
            character_count=job["characterCount"],
            match_count=match_count,
            best_score=best_score,
            best_verdict=None if best_score is None else verdict_for(best_score),
            created_at=job["createdAt"],
        )


class JobOut(JobSummaryOut):
    description: str

    @classmethod
    def from_doc(cls, job: dict, match_count: int, best_score: int | None = None) -> "JobOut":
        summary = JobSummaryOut.from_doc(job, match_count, best_score)
        return cls(**summary.model_dump(), description=job["description"])


class ExtractedTextOut(ApiModel):
    """The text read from an uploaded job file. Nothing is stored: the file is gone after the request."""

    text: str
    character_count: int
