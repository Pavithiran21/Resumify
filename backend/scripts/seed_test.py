"""
The seeded accounts of a Playwright run, on resumify_test only (any other database is refused).
It empties the database first, so every run starts from the same data. Every account uses
E2E_PASSWORD from backend/.env.test (written by scripts.make_env test, new for every run).

Most tests make their own fresh account through the API; these are only for what a test can't
make itself, and the tests never change them:
  meera@e2e.resumify.test     Meera's story (the same as the demo): two resumes, three jobs and
                              four matches, Northwind 56 on version 1 and 69 on version 2
  arjun@e2e.resumify.test     another user with his own resume, job and match (privacy tests)
  locked@e2e.resumify.test    a demo account (isDemo), whose password can't change; only a seed
                              can make one
  limits-*@e2e.resumify.test  empty accounts for the rate-limits pass, which can't spend its
                              10 sign-ups an hour on making accounts

The match model must be reachable (the stand-in: node e2e/mocks/llm-stub.js), because Meera's and Arjun's
matches run the real pipeline.

Usage (from backend/):
  $env:ENV_FILE='.env.test'; .venv\\Scripts\\python.exe -m scripts.seed_test
"""

import asyncio
import os

from app.core import database
from app.core.security import hash_password
from app.repositories import user_repository
from scripts.make_env import BACKEND_ROOT, read_env
from scripts.seed_demo import print_summary
from scripts.seed_helpers import create_job_seeker, create_other_user

ALLOWED_DATABASE = "resumify_test"
EMPTY_ACCOUNTS = [
    ("Lena Locked", "locked@e2e.resumify.test", True),
    ("Limits A", "limits-a@e2e.resumify.test", False),
    ("Limits B", "limits-b@e2e.resumify.test", False),
    ("Limits C", "limits-c@e2e.resumify.test", False),
    ("Limits Match", "limits-match@e2e.resumify.test", False),
    ("Limits Upload", "limits-upload@e2e.resumify.test", False),
]


def e2e_password() -> str:
    # E2E_PASSWORD is not a backend setting, so it is read straight from the file make_env wrote.
    if os.environ.get("ENV_FILE") != ".env.test":
        raise SystemExit("Set ENV_FILE=.env.test: seed_test seeds the test database only.")
    password = read_env(BACKEND_ROOT / ".env.test").get("E2E_PASSWORD", "")
    if len(password) < 8:
        raise SystemExit("backend/.env.test has no E2E_PASSWORD. Run scripts.make_env test first.")
    return password


async def main() -> None:
    password = e2e_password()
    await database.connect()
    try:
        name = database.get_db().name
        if name != ALLOWED_DATABASE:
            raise SystemExit(f"seed_test only runs on {ALLOWED_DATABASE}, not on {name}.")

        for collection in await database.get_db().list_collection_names():
            await database.get_db()[collection].delete_many({})
        await database.ensure_indexes()

        summaries = [
            await create_job_seeker("Meera Iyer", "meera@e2e.resumify.test", password, is_demo=False),
            await create_other_user("Arjun Mehta", "arjun@e2e.resumify.test", password, is_demo=False),
        ]
        password_hash = await hash_password(password)
        for account_name, email, is_demo in EMPTY_ACCOUNTS:
            await user_repository.create(account_name, email, password_hash, is_demo=is_demo)
        print_summary(name, summaries)
        print(f"{name}: {len(EMPTY_ACCOUNTS)} empty accounts (locked@ is a demo account)")
    finally:
        await database.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
