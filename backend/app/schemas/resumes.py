from datetime import datetime

from app.core.matching import verdict_for
from app.schemas.common import ApiModel
from app.schemas.matches import Verdict


class ResumeOut(ApiModel):
    """A resume's details. The file bytes and the extracted text are never part of it."""

    id: str
    file_name: str
    content_type: str
    size: int
    page_count: int | None
    word_count: int
    version: int
    match_count: int
    # The best score of the resume's matches and its verdict (the list's score ring); None before the first match.
    best_score: int | None
    best_verdict: Verdict | None
    created_at: datetime
    # When the current version was uploaded (the same as createdAt for version 1).
    updated_at: datetime
    download_url: str

    @classmethod
    def from_doc(cls, resume: dict, match_count: int, best_score: int | None = None) -> "ResumeOut":
        resume_id = str(resume["_id"])
        return cls(
            id=resume_id,
            file_name=resume["fileName"],
            content_type=resume["contentType"],
            size=resume["size"],
            page_count=resume.get("pageCount"),
            word_count=resume["wordCount"],
            version=resume["version"],
            match_count=match_count,
            best_score=best_score,
            best_verdict=None if best_score is None else verdict_for(best_score),
            created_at=resume["createdAt"],
            updated_at=resume["updatedAt"],
            download_url=f"/api/resumes/{resume_id}/download",
        )
