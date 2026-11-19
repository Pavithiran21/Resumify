import hashlib
import secrets
from datetime import timedelta

import bcrypt
import jwt
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.dates import utc_now

ACCESS_TOKEN_TTL = timedelta(minutes=15)
REFRESH_TOKEN_TTL = timedelta(days=7)
RESET_TOKEN_TTL = timedelta(minutes=30)
BCRYPT_ROUNDS = 12


async def hash_password(password: str) -> str:
    # bcrypt is slow on purpose (about a quarter of a second), so it runs in a worker thread
    # and doesn't hold up every other request on the event loop.
    hashed = await run_in_threadpool(bcrypt.hashpw, password.encode(), bcrypt.gensalt(BCRYPT_ROUNDS))
    return hashed.decode()


async def password_matches(password: str, password_hash: str) -> bool:
    return await run_in_threadpool(bcrypt.checkpw, password.encode(), password_hash.encode())


def make_dummy_hash() -> str:
    # Compared against when the email is unknown, so a failed login takes the same time
    # whether or not the account exists.
    return bcrypt.hashpw(b"no-such-user-dummy-password", bcrypt.gensalt(BCRYPT_ROUNDS)).decode()


DUMMY_PASSWORD_HASH = make_dummy_hash()


def sign_access_token(user_id: str) -> str:
    now = utc_now()
    claims = {"sub": user_id, "iat": now, "exp": now + ACCESS_TOKEN_TTL}
    return jwt.encode(claims, get_settings().jwt_secret, algorithm="HS256")


def verify_access_token(token: str) -> str:
    """Returns the user id; raises jwt.ExpiredSignatureError or jwt.InvalidTokenError otherwise."""
    # Fixing the algorithm stops a forged token from choosing a weaker one (for example "none").
    claims = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"], options={"require": ["sub", "exp"]})
    return claims["sub"]


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_opaque_token() -> tuple[str, str]:
    """
    Refresh and password-reset tokens are 32 random bytes. Only their SHA-256 hash is stored,
    so someone who reads the database cannot use them. A fast hash is fine here (unlike for
    passwords) because 256 random bits cannot be guessed. Returns (token, token_hash).
    """
    token = secrets.token_urlsafe(32)
    return token, hash_token(token)
