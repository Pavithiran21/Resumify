import logging
from dataclasses import dataclass
from email.message import EmailMessage

import aiosmtplib

from app.core.config import get_settings

logger = logging.getLogger("resumify.mail")

# RFC 2606 reserves .test: such an address can never receive real mail (demo and test accounts).
RESERVED_DOMAIN_SUFFIX = ".test"


@dataclass
class SmtpServer:
    host: str
    port: int
    user: str
    password: str


@dataclass
class InlineImage:
    """An image sent inside the email (shown by <img src="cid:...">), so no image server is needed."""

    cid: str
    file_name: str
    data: bytes
    subtype: str = "png"


def _server_for(recipient: str) -> SmtpServer | None:
    """
    Brevo (SMTP_*) for real addresses; the Ethereal inbox (DEMO_SMTP_*) for .test addresses, so
    no real email is ever sent to an address that can't exist. None: a .test address with no
    DEMO_SMTP_* inbox set, which is skipped rather than sent through Brevo.
    """
    settings = get_settings()
    domain = recipient.rsplit("@", 1)[-1].lower()
    if domain.endswith(RESERVED_DOMAIN_SUFFIX):
        if not settings.demo_smtp_host:
            return None
        return SmtpServer(settings.demo_smtp_host, settings.demo_smtp_port, settings.demo_smtp_user, settings.demo_smtp_pass)
    return SmtpServer(settings.smtp_host, settings.smtp_port, settings.smtp_user, settings.smtp_pass)


async def send_email(to: str, subject: str, text: str, html: str, images: list[InlineImage] | None = None) -> None:
    """
    Sends one email through the SMTP server picked for the recipient (see _server_for). Only
    .env changes between Brevo and Ethereal, never this code. images are attached to the HTML
    part (multipart/related), where the HTML refers to each one as cid:<its cid>.
    """
    server = _server_for(to)
    if server is None:
        # No address in the log: it is personal data.
        logger.warning("Email to a .test address not sent: DEMO_SMTP_HOST is not set")
        return

    message = EmailMessage()
    message["From"] = get_settings().smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    html_part = message.get_payload()[1]
    for image in images or []:
        # "inline": shown in the HTML, not offered as a separate attachment.
        html_part.add_related(
            image.data, maintype="image", subtype=image.subtype, cid=f"<{image.cid}>", disposition="inline", filename=image.file_name
        )

    # Port 465 speaks TLS from the start; 587 (Brevo, Ethereal) upgrades with STARTTLS.
    await aiosmtplib.send(
        message,
        hostname=server.host,
        port=server.port,
        username=server.user,
        password=server.password,
        use_tls=server.port == 465,
        start_tls=server.port == 587,
        timeout=20,
    )
