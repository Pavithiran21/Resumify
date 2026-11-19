from datetime import datetime
from typing import Literal

from app.schemas.common import ApiModel
from app.schemas.fields import ResourceId

Verdict = Literal["perfect", "good", "fair", "weak"]
SkillStatus = Literal["matched", "missing"]


class MatchIn(ApiModel):
    resume_id: ResourceId
    job_id: ResourceId


class CountOut(ApiModel):
    matched: int
    total: int


class ExperienceOut(ApiModel):
    # None: the resume doesn't show its years, or the job asks for none.
    resume_years: int | None
    required_years: int | None
    met: bool | None


class BreakdownOut(ApiModel):
    skills: CountOut
    keywords: CountOut
    experience: ExperienceOut


class SkillOut(ApiModel):
    name: str
    status: SkillStatus
    # "text": the resume names it word for word; "ai": the model found it in other words and
    # quoted the resume (the quote was checked); None for a missing skill.
    matched_by: Literal["text", "ai"] | None
    job_quote: str
    resume_quote: str | None
    reason: str


class KeywordsOut(ApiModel):
    matched: list[str]
    missing: list[str]


class MatchSummaryOut(ApiModel):
    """A match in a list: the skills, keywords and suggestions are left out."""

    id: str
    resume_id: str
    resume_file_name: str
    resume_version: int
    job_id: str
    job_title: str
    job_company: str | None
    run_number: int
    score: int
    verdict: Verdict
    created_at: datetime

    @classmethod
    def from_doc(cls, match: dict) -> "MatchSummaryOut":
        return cls(
            id=str(match["_id"]),
            resume_id=str(match["resumeId"]),
            resume_file_name=match["resumeFileName"],
            resume_version=match["resumeVersion"],
            job_id=str(match["jobId"]),
            job_title=match["jobTitle"],
            job_company=match.get("jobCompany"),
            run_number=match["runNumber"],
            score=match["score"],
            verdict=match["verdict"],
            created_at=match["createdAt"],
        )


class MatchOut(MatchSummaryOut):
    # How many runs this resume and job have now, for "run 2 of 2".
    run_count: int
    summary: str
    breakdown: BreakdownOut
    skills: list[SkillOut]
    keywords: KeywordsOut
    suggestions: list[str]
    model: str
    # True when the AI answer of an earlier run with exactly the same inputs was reused.
    assessment_reused: bool

    @classmethod
    def from_doc(cls, match: dict, run_count: int) -> "MatchOut":
        summary = MatchSummaryOut.from_doc(match)
        return cls(
            **summary.model_dump(),
            run_count=run_count,
            summary=match["summary"],
            breakdown=match["breakdown"],
            skills=match["skills"],
            keywords=match["keywords"],
            suggestions=match["suggestions"],
            model=match["model"],
            assessment_reused=match["assessmentReused"],
        )


class RunOut(ApiModel):
    id: str
    run_number: int
    resume_version: int
    score: int
    verdict: Verdict
    skills: CountOut
    keywords: CountOut
    created_at: datetime

    @classmethod
    def from_doc(cls, match: dict) -> "RunOut":
        return cls(
            id=str(match["_id"]),
            run_number=match["runNumber"],
            resume_version=match["resumeVersion"],
            score=match["score"],
            verdict=match["verdict"],
            skills=match["breakdown"]["skills"],
            keywords=match["breakdown"]["keywords"],
            created_at=match["createdAt"],
        )


class SkillChangeOut(ApiModel):
    name: str
    # None: the skill wasn't part of that run (for example an extra skill the model found only once).
    first: SkillStatus | None
    second: SkillStatus | None


class CompareOut(ApiModel):
    """Two runs of the same resume and job: first is always the older run."""

    resume_file_name: str
    job_title: str
    job_company: str | None
    first: RunOut
    second: RunOut
    score_change: int
    skill_changes: list[SkillChangeOut]
    still_missing: list[str]
