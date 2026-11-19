from html import escape
from pathlib import Path

from app.core.mailer import InlineImage, send_email

# The logo tile, the same mark as the app's, as a PNG: email clients don't show SVG. It travels
# inside the email, so it shows without an image server.
_LOGO = InlineImage(
    cid="resumify-logo",
    file_name="resumify-logo.png",
    data=(Path(__file__).resolve().parents[1] / "assets" / "email-logo.png").read_bytes(),
)

# Brand colours from UI-UX.md (the light theme, 8 Nov 2026): a lilac-grey page, a white card,
# dark text, the system font and a solid job-site blue button.
_FONT = "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"
_TEMPLATE = """\
<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f6f4fa;font-family:{font};color:#2b2638;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4fa;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;border:1px solid #e7e3ef;overflow:hidden;">
        <tr><td style="padding:22px 28px;border-bottom:1px solid #e7e3ef;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:10px;vertical-align:middle;"><img src="cid:resumify-logo" width="36" height="36" alt="" style="display:block;border:0;"></td>
            <td style="vertical-align:middle;"><span style="font-size:21px;font-weight:700;color:#15111f;">Resum</span><span style="font-size:21px;font-weight:700;color:#0a66c2;">ify</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px;">
          {body}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #e7e3ef;font-size:12px;color:#6e6880;">
          Resumify · Your resumes stay private.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


async def send_password_reset_email(user: dict, reset_link: str) -> None:
    name = escape(user["name"])
    link = escape(reset_link, quote=True)
    body = f"""\
<h1 style="margin:0 0 12px;font-size:22px;color:#15111f;">Set a new password</h1>
<p style="margin:0 0 16px;line-height:1.55;color:#2b2638;">Hi {name}, we got a request to reset the password of your Resumify account.</p>
<p style="margin:0 0 24px;"><a href="{link}" style="display:inline-block;background-color:#0a66c2;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px;">Reset password</a></p>
<p style="margin:0 0 8px;line-height:1.55;font-size:14px;color:#5f5a6e;">The link works once and expires in 30 minutes. If you didn't ask for it, ignore this email: your password stays the same.</p>
<p style="margin:0;font-size:12px;color:#6e6880;word-break:break-all;">{link}</p>"""

    text = (
        f"Hi {user['name']},\n\n"
        "We got a request to reset the password of your Resumify account.\n"
        f"Set a new password here: {reset_link}\n\n"
        "The link works once and expires in 30 minutes. If you didn't ask for it, ignore this email.\n"
    )
    await send_email(user["email"], "Reset your Resumify password", text, _TEMPLATE.format(font=_FONT, body=body), images=[_LOGO])
