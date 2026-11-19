import re

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

# The JSON shape the AI model must answer with (see app/services/match_assessment.py). It is
# checked like any untrusted input: the wrong shape or types make the whole answer invalid,
# while text that is merely too long is cut, and items without a name are dropped.

CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")

MAX_SKILLS = 80
MAX_EXTRA_SKILLS = 10
MAX_SUGGESTIONS = 5


def plain_text(value: str | None, max_length: int) -> str:
    """One line of plain text: no control characters, single spaces, at most max_length characters."""
    if not value:
        return ""
    value = " ".join(CONTROL_CHARACTERS.sub(" ", value).split())
    return value[:max_length].strip()


class AiModel(BaseModel):
    # extra="ignore": anything else the model adds is dropped, never stored.
    model_config = ConfigDict(
        alias_generator=to_camel, validate_by_name=True, validate_by_alias=True, serialize_by_alias=True, extra="ignore"
    )


class AiSkill(AiModel):
    name: str
    in_resume: bool = False
    resume_quote: str | None = None
    reason: str = ""

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return plain_text(value, 60)

    @field_validator("resume_quote")
    @classmethod
    def clean_quote(cls, value: str | None) -> str | None:
        return plain_text(value, 400) or None

    @field_validator("reason")
    @classmethod
    def clean_reason(cls, value: str) -> str:
        return plain_text(value, 300)


class AiExtraSkill(AiSkill):
    job_quote: str = ""

    @field_validator("job_quote")
    @classmethod
    def clean_job_quote(cls, value: str) -> str:
        return plain_text(value, 400)


class AiAssessment(AiModel):
    summary: str = ""
    skills: list[AiSkill] = []
    extra_skills: list[AiExtraSkill] = []
    experience_years: float | None = None
    suggestions: list[str] = []

    @field_validator("summary")
    @classmethod
    def clean_summary(cls, value: str) -> str:
        return plain_text(value, 300)

    @field_validator("skills")
    @classmethod
    def named_skills(cls, value: list[AiSkill]) -> list[AiSkill]:
        return [skill for skill in value if skill.name][:MAX_SKILLS]

    @field_validator("extra_skills")
    @classmethod
    def named_extra_skills(cls, value: list[AiExtraSkill]) -> list[AiExtraSkill]:
        return [skill for skill in value if skill.name][:MAX_EXTRA_SKILLS]

    @field_validator("experience_years")
    @classmethod
    def sensible_years(cls, value: float | None) -> float | None:
        # A number outside a working life is treated as "the model couldn't tell".
        if value is None or value < 0 or value > 60:
            return None
        return value

    @field_validator("suggestions")
    @classmethod
    def clean_suggestions(cls, value: list[str]) -> list[str]:
        cleaned = [plain_text(item, 240) for item in value]
        return [item for item in cleaned if item][:MAX_SUGGESTIONS]
