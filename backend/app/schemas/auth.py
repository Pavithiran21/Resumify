from datetime import datetime

from app.schemas.common import ApiModel
from app.schemas.fields import CurrentPassword, Email, NewPassword, PersonName, ResetToken


class RegisterIn(ApiModel):
    name: PersonName
    email: Email
    password: NewPassword


class LoginIn(ApiModel):
    email: Email
    password: CurrentPassword
    # "Keep me logged in": True keeps the refresh cookie for 7 days; False (the default) makes it
    # a browser-session cookie, so closing the browser logs out.
    remember: bool = False


class ForgotPasswordIn(ApiModel):
    email: Email


class ResetPasswordIn(ApiModel):
    token: ResetToken
    password: NewPassword


class UserOut(ApiModel):
    id: str
    name: str
    email: str
    is_demo: bool
    created_at: datetime

    @classmethod
    def from_doc(cls, user: dict) -> "UserOut":
        return cls(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            is_demo=user.get("isDemo", False),
            created_at=user["createdAt"],
        )


class AuthOut(ApiModel):
    """The access token goes in the body; the refresh token only in the HTTP-only cookie."""

    user: UserOut
    access_token: str


class MessageOut(ApiModel):
    message: str


class ProfileUpdateIn(ApiModel):
    # The name is the only profile field; unknown keys (for example "email") are ignored.
    name: PersonName


class ChangePasswordIn(ApiModel):
    current_password: CurrentPassword
    new_password: NewPassword


class DeleteAccountIn(ApiModel):
    password: CurrentPassword
