"""
Writes backend/.env.test or backend/.env.demo, the file that ENV_FILE layers over
backend/.env. Every run starts from scratch:
  - its own database on the same Atlas cluster (resumify_test or resumify_demo)
  - a new random JWT secret, so every token from an earlier run is rejected with 401
  - brand-new Ethereal inboxes (fake SMTP that never delivers), so no email from an earlier
    run is in them; their logins are also the Ethereal web inbox logins used by Playwright:
      test: two inboxes, SMTP_* for real-looking addresses and DEMO_SMTP_* for .test addresses,
            so the tests can prove which server each email went through (see app/core/mailer.py)
      demo: one inbox for both, so the demo shows a single inbox that starts empty
  - the match model on the local stub (e2e/mocks/llm-stub.js), never Groq: no test or demo spends free
    quota, and the stubbed answers make every result repeatable
  - test only: E2E_PASSWORD, the password of the accounts seeded by scripts.seed_test

Usage (from backend/):
  .venv\\Scripts\\python.exe -m scripts.make_env test [--rate-limits on]
  .venv\\Scripts\\python.exe -m scripts.make_env demo
"""

import argparse
import secrets
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
STUB_LLM_URL = "http://localhost:8080/llm/v1"

KINDS = {
    "test": {"file": ".env.test", "database": "resumify_test", "app_env": "test", "demo_mode": "false"},
    "demo": {"file": ".env.demo", "database": "resumify_demo", "app_env": "development", "demo_mode": "true"},
}


def read_env(path: Path) -> dict[str, str]:
    values = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    return values


def with_database(uri: str, database: str) -> str:
    # The database name is the path of a MongoDB URI: mongodb+srv://host/<database>?options
    parts = urlsplit(uri)
    return urlunsplit((parts.scheme, parts.netloc, f"/{database}", parts.query, parts.fragment))


def create_ethereal_account() -> dict:
    """The same call Nodemailer's createTestAccount() makes."""
    response = httpx.post("https://api.nodemailer.com/user", json={"requestor": "resumify", "version": "1.0.0"}, timeout=30)
    response.raise_for_status()
    account = response.json()
    if account.get("status") != "success":
        raise SystemExit(f"Ethereal did not create an account: {account.get('error', 'unknown error')}")
    return account


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("kind", choices=sorted(KINDS))
    parser.add_argument("--rate-limits", choices=["on", "off"], default=None, help="test: off by default; demo: always on")
    args = parser.parse_args()

    kind = KINDS[args.kind]
    base = read_env(BACKEND_ROOT / ".env")
    account = create_ethereal_account()
    demo_account = create_ethereal_account() if args.kind == "test" else account
    rate_limits = "true" if args.kind == "demo" or args.rate_limits == "on" else "false"

    lines = [
        f"# Written by scripts/make_env.py ({args.kind}). Git-ignored and replaced on every run.",
        f"APP_ENV={kind['app_env']}",
        f"MONGODB_URI={with_database(base['MONGODB_URI'], kind['database'])}",
        f"JWT_SECRET={secrets.token_urlsafe(48)}",
        # backend/.env may hide request lines (LOG_LEVEL=warning); runs keep them, because the check
        # for personal data in the backend log reads them.
        "LOG_LEVEL=info",
        f"RATE_LIMITS_ENABLED={rate_limits}",
        f"DEMO_MODE={kind['demo_mode']}",
        "# The match model is the local stub (e2e/mocks/llm-stub.js), never a real API.",
        f"LLM_BASE_URL={STUB_LLM_URL}",
        "LLM_API_KEY=",
        "LLM_REASONING_EFFORT=",
        "# New, empty Ethereal inboxes: each SMTP login is also that inbox's web login.",
        f"SMTP_HOST={account['smtp']['host']}",
        f"SMTP_PORT={account['smtp']['port']}",
        f"SMTP_USER={account['user']}",
        f"SMTP_PASS={account['pass']}",
        "SMTP_FROM=Resumify <no-reply@resumify.test>",
        f"DEMO_SMTP_HOST={demo_account['smtp']['host']}",
        f"DEMO_SMTP_PORT={demo_account['smtp']['port']}",
        f"DEMO_SMTP_USER={demo_account['user']}",
        f"DEMO_SMTP_PASS={demo_account['pass']}",
    ]
    if args.kind == "test":
        lines.append(f"E2E_PASSWORD=e2e-{secrets.token_urlsafe(12)}")
    lines.append("")

    target = BACKEND_ROOT / kind["file"]
    target.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    # The throwaway inbox addresses are printed so they can be opened; no password or secret is.
    inboxes = account["user"] if demo_account is account else f"{account['user']} (SMTP_*) and {demo_account['user']} (DEMO_SMTP_*)"
    print(f"Wrote backend/{kind['file']}: database {kind['database']}, Ethereal inbox {inboxes}")


if __name__ == "__main__":
    main()
