"""
Gives backend/.env a long-lived Ethereal inbox for mail to .test addresses (DEMO_SMTP_*), so a
password reset for dev@resumify.test or any other .test account on the development stack lands
in Ethereal and never goes through Brevo. Replaces only the four DEMO_SMTP_* lines; every other
line of backend/.env stays as it is. Tests and demos get their own inboxes from scripts.make_env.

Usage (from backend/): .venv\\Scripts\\python.exe -m scripts.demo_inbox
"""

from scripts.make_env import BACKEND_ROOT, create_ethereal_account

KEYS = ("DEMO_SMTP_HOST", "DEMO_SMTP_PORT", "DEMO_SMTP_USER", "DEMO_SMTP_PASS")
COMMENT = "# Mail to .test addresses (demo and dev accounts) goes to this Ethereal inbox, never Brevo."


def main() -> None:
    path = BACKEND_ROOT / ".env"
    account = create_ethereal_account()
    values = {
        "DEMO_SMTP_HOST": account["smtp"]["host"],
        "DEMO_SMTP_PORT": str(account["smtp"]["port"]),
        "DEMO_SMTP_USER": account["user"],
        "DEMO_SMTP_PASS": account["pass"],
    }

    kept = [
        line
        for line in path.read_text(encoding="utf-8-sig").splitlines()
        if line.strip() != COMMENT and line.split("=", 1)[0].strip() not in KEYS
    ]
    while kept and not kept[-1].strip():
        kept.pop()
    kept += ["", COMMENT] + [f"{key}={values[key]}" for key in KEYS]
    path.write_text("\n".join(kept) + "\n", encoding="utf-8", newline="\n")

    # The throwaway inbox address is printed so it can be opened; the password is not.
    print(f"backend/.env: DEMO_SMTP_* now point at the Ethereal inbox {account['user']}")


if __name__ == "__main__":
    main()
