from email.message import EmailMessage
import smtplib

from backend.config import get_settings


def send_shortlist_email(recipient: str, candidates: list[dict]) -> dict:
    settings = get_settings()
    subject = f"Shortlisted candidates ({len(candidates)})"
    lines = ["Shortlisted candidates", ""]
    for index, candidate in enumerate(candidates, start=1):
        lines.append(f"{index}. {candidate['name']} - score {candidate['score']} - {candidate['decision']}")
        lines.append(f"   {candidate['summary']}")
        lines.append("")
    body = "\n".join(lines).strip() + "\n"

    if settings.smtp_host:
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.email_from
        message["To"] = recipient
        message.set_content(body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
            smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
        return {"sent": True, "mode": "smtp", "message": "Email sent through SMTP."}

    settings.outbox_path.parent.mkdir(parents=True, exist_ok=True)
    with settings.outbox_path.open("a", encoding="utf-8") as handle:
        handle.write(f"To: {recipient}\nSubject: {subject}\n\n{body}\n{'=' * 72}\n")
    return {
        "sent": False,
        "mode": "outbox",
        "message": f"SMTP is not configured. Message written to {settings.outbox_path}.",
    }
