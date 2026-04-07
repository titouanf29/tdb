"""
Email service - sends transactional emails via SMTP.

Required env vars:
  SMTP_HOST      e.g. smtp.gmail.com
  SMTP_PORT      587 (TLS) or 465 (SSL)
  SMTP_USER      your@email.com
  SMTP_PASSWORD  app password / API key
  SMTP_FROM      "CaptenTDB <noreply@capten.tdb>"
  FRONTEND_URL   https://yourdomain.com
"""
import os
import ssl
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

logger = logging.getLogger(__name__)

SMTP_HOST     = os.getenv("SMTP_HOST", "")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM     = os.getenv("SMTP_FROM", f"CaptenTDB <{SMTP_USER}>")
FRONTEND_URL  = os.getenv("FRONTEND_URL", "http://localhost:3000")

EMAIL_ENABLED = bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


async def _send(to: str, subject: str, html: str) -> None:
    """Low-level async SMTP send."""
    if not EMAIL_ENABLED:
        logger.warning("Email not configured – skipping send to %s | %s", to, subject)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = SMTP_FROM
    msg["To"]      = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    use_tls = SMTP_PORT == 465
    kwargs = dict(
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USER,
        password=SMTP_PASSWORD,
    )
    if use_tls:
        kwargs["tls_context"] = ssl.create_default_context()
        await aiosmtplib.send(msg, **kwargs, use_tls=True)
    else:
        await aiosmtplib.send(msg, **kwargs, start_tls=True)


# ── Templates ──────────────────────────────────────────────────────────────────

def _base_template(content: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0f1117; color: #e2e8f0; margin: 0; padding: 0; }}
    .wrapper {{ max-width: 560px; margin: 40px auto; padding: 0 16px; }}
    .card {{ background: #1a1f2e; border: 1px solid rgba(255,255,255,0.08);
             border-radius: 16px; padding: 40px 36px; }}
    .logo {{ text-align: center; margin-bottom: 32px; }}
    .logo-icon {{ display: inline-flex; align-items: center; justify-content: center;
                  width: 56px; height: 56px; background: rgba(99,102,241,0.2);
                  border-radius: 14px; margin-bottom: 12px; font-size: 28px; }}
    .logo-text {{ font-size: 22px; font-weight: 700; color: #fff; }}
    .logo-text span {{ color: #818cf8; }}
    h2 {{ font-size: 20px; font-weight: 600; color: #fff; margin: 0 0 12px; }}
    p  {{ font-size: 15px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px; }}
    .btn {{ display: inline-block; padding: 14px 32px; background: #6366f1;
            color: #fff !important; text-decoration: none; border-radius: 12px;
            font-weight: 600; font-size: 15px; margin: 8px 0 24px; }}
    .url-box {{ background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px; padding: 12px 16px; font-size: 12px;
                color: #64748b; word-break: break-all; margin-bottom: 24px; }}
    .footer {{ text-align: center; font-size: 12px; color: #475569; margin-top: 24px; }}
    hr {{ border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">
        <div class="logo-icon">📈</div>
        <div class="logo-text">Capten<span>TDB</span></div>
      </div>
      {content}
    </div>
    <div class="footer">
      © 2025 CaptenTDB · Paper Trading uniquement<br>
      Cet email a été envoyé automatiquement, ne pas répondre.
    </div>
  </div>
</body>
</html>"""


async def send_verification_email(to: str, username: str, token: str) -> None:
    """Send account email verification link."""
    url = f"{FRONTEND_URL}/verify-email?token={token}"
    html = _base_template(f"""
      <h2>Vérifiez votre adresse email</h2>
      <p>Bonjour <strong style="color:#e2e8f0">{username}</strong>,</p>
      <p>Merci de vous être inscrit sur CaptenTDB ! Cliquez sur le bouton
         ci-dessous pour activer votre compte. Ce lien expire dans <strong
         style="color:#e2e8f0">24 heures</strong>.</p>
      <div style="text-align:center">
        <a class="btn" href="{url}">Vérifier mon email</a>
      </div>
      <p style="font-size:13px;color:#64748b">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
      <div class="url-box">{url}</div>
      <hr>
      <p style="font-size:13px;color:#64748b;margin:0">
        Si vous n'avez pas créé de compte, ignorez cet email.
      </p>
    """)
    await _send(to, "CaptenTDB – Vérifiez votre adresse email", html)


async def send_password_reset_email(to: str, username: str, token: str) -> None:
    """Send password reset link."""
    url = f"{FRONTEND_URL}/reset-password?token={token}"
    html = _base_template(f"""
      <h2>Réinitialisation du mot de passe</h2>
      <p>Bonjour <strong style="color:#e2e8f0">{username}</strong>,</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez ci-dessous.
         Ce lien expire dans <strong style="color:#e2e8f0">1 heure</strong>.</p>
      <div style="text-align:center">
        <a class="btn" href="{url}">Réinitialiser mon mot de passe</a>
      </div>
      <div class="url-box">{url}</div>
      <hr>
      <p style="font-size:13px;color:#64748b;margin:0">
        Si vous n'avez pas fait cette demande, ignorez cet email.
        Votre mot de passe reste inchangé.
      </p>
    """)
    await _send(to, "CaptenTDB – Réinitialisation du mot de passe", html)
