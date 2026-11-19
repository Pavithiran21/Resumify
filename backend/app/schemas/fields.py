import re
from typing import Annotated

from pydantic import AfterValidator, Field
from pydantic_core import PydanticCustomError

from app.core.text_extraction import clean_text

# Field rules shared by the request schemas. Messages match UI-UX.md.

# The pattern browsers use for <input type="email">, with at least one dot in the domain.
EMAIL_PATTERN = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)
RESET_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")

JOB_DESCRIPTION_MIN = 300
JOB_DESCRIPTION_MAX = 20_000


def required_text(message: str, max_length: int):
    def check(value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise PydanticCustomError("blank", message)
        if len(value) > max_length:
            raise PydanticCustomError("too_long", f"Use at most {max_length} characters.")
        return value

    return AfterValidator(check)


def optional_text(max_length: int):
    # A blank optional field is stored as "not set" (None), not as "".
    def check(value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = " ".join(value.split())
        if len(value) > max_length:
            raise PydanticCustomError("too_long", f"Use at most {max_length} characters.")
        return value

    return AfterValidator(check)


def check_email(value: str) -> str:
    value = value.strip().lower()
    if len(value) > 254 or not EMAIL_PATTERN.match(value):
        raise PydanticCustomError("email", "Enter a valid email, like name@example.com.")
    return value


def check_new_password(value: str) -> str:
    if len(value) < 8 or not any(character.isdigit() for character in value):
        raise PydanticCustomError("password_weak", "Use at least 8 characters, with a number.")
    # bcrypt only uses the first 72 bytes, so longer passwords are refused rather than silently cut.
    if len(value.encode()) > 72:
        raise PydanticCustomError("password_long", "Use at most 72 characters.")
    return value


def check_current_password(value: str) -> str:
    if not value or len(value) > 200:
        raise PydanticCustomError("password_blank", "Enter your password.")
    return value


def check_reset_token(value: str) -> str:
    if not RESET_TOKEN_PATTERN.match(value):
        raise PydanticCustomError("reset_token", "This link is not valid.")
    return value


def check_job_description(value: str) -> str:
    # The same clean-up as text read from an uploaded file, so the length limits mean the same.
    value = clean_text(value)
    if not value:
        raise PydanticCustomError("blank", "Paste the job description.")
    if len(value) < JOB_DESCRIPTION_MIN:
        raise PydanticCustomError(
            "too_short", "This looks short. Paste the full description (at least 300 characters) for a fair match."
        )
    if len(value) > JOB_DESCRIPTION_MAX:
        raise PydanticCustomError("too_long", "This is too long. Keep it under 20,000 characters.")
    return value


PersonName = Annotated[str, required_text("Enter your name.", 80)]
Email = Annotated[str, AfterValidator(check_email)]
NewPassword = Annotated[str, AfterValidator(check_new_password)]
CurrentPassword = Annotated[str, AfterValidator(check_current_password)]
ResetToken = Annotated[str, AfterValidator(check_reset_token)]

JobTitle = Annotated[str, required_text("Enter the job title.", 120)]
CompanyName = Annotated[str | None, optional_text(120)]
# The raw size is capped before the clean-up runs, so a huge body is refused cheaply.
JobDescription = Annotated[str, Field(max_length=60_000), AfterValidator(check_job_description)]
# An id from the URL or body; the service turns it into an ObjectId (anything else is "not found").
ResourceId = Annotated[str, Field(min_length=1, max_length=24)]
