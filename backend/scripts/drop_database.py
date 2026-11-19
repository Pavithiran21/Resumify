"""
Drops resumify_test or resumify_demo on the Atlas cluster, then checks that it is gone.
Any other name is refused, so the development database can never be dropped by a script.
Used by scripts/e2e.ps1 (a fresh test database for every pass) and demo-up/demo-down.

Usage (from backend/):
  .venv\\Scripts\\python.exe -m scripts.drop_database resumify_test
  .venv\\Scripts\\python.exe -m scripts.drop_database resumify_demo
"""

import argparse
import asyncio

from pymongo import AsyncMongoClient

from scripts.make_env import BACKEND_ROOT, read_env, with_database

ALLOWED = ("resumify_test", "resumify_demo")


async def drop(name: str) -> None:
    uri = with_database(read_env(BACKEND_ROOT / ".env")["MONGODB_URI"], name)
    client = AsyncMongoClient(uri, serverSelectionTimeoutMS=10000)
    try:
        await client.drop_database(name)
        if name in await client.list_database_names():
            raise SystemExit(f"{name} still exists after the drop.")
        print(f"{name}: dropped and confirmed gone")
    finally:
        await client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("name")
    args = parser.parse_args()
    if args.name not in ALLOWED:
        raise SystemExit(f"drop_database only drops {' or '.join(ALLOWED)}, not {args.name}.")
    asyncio.run(drop(args.name))


if __name__ == "__main__":
    main()
