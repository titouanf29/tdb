"""
Service d'e-mails — envoi des messages transactionnels.

TROIS VOIES, choisies automatiquement selon les variables présentes :

  BREVO_API_KEY   API HTTPS de Brevo (300 e-mails/jour gratuits)
  RESEND_API_KEY  API HTTPS de Resend
  SMTP_HOST + SMTP_USER + SMTP_PASSWORD   SMTP classique (ports 587 / 465)

  EMAIL_FROM      l'expéditeur, « CaptenTDB <adresse@exemple.fr> »
                  (SMTP_FROM est encore lu, pour compatibilité)
  FRONTEND_URL    https://captentdb.fr — les liens des e-mails en dépendent

POURQUOI LES API. Railway bloque le SMTP sortant (ports 25, 465, 587, 2525)
sur les forfaits Free, Trial et Hobby : seul le forfait Pro l'autorise. Une
configuration SMTP parfaitement correcte y échoue donc en silence — la
connexion est coupée avant d'atteindre le serveur de messagerie. Les API
passent par HTTPS, qui n'est jamais bloqué.
"""
import os
import re
import ssl
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
import httpx

logger = logging.getLogger(__name__)

SMTP_HOST      = os.getenv("SMTP_HOST", "")
SMTP_PORT      = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER      = os.getenv("SMTP_USER", "")
SMTP_PASSWORD  = os.getenv("SMTP_PASSWORD", "")
BREVO_API_KEY  = os.getenv("BREVO_API_KEY", "").strip()
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
EMAIL_FROM     = (os.getenv("EMAIL_FROM") or os.getenv("SMTP_FROM")
                  or (f"CaptenTDB <{SMTP_USER}>" if SMTP_USER else ""))
SMTP_FROM      = EMAIL_FROM  # ancien nom, conservé
FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://localhost:3000")

DELAI_S = 15  # au-delà, un envoi est considéré comme perdu — pas de requête pendue


def fournisseur() -> str:
    """La voie d'envoi retenue : 'brevo', 'resend', 'smtp' ou 'aucun'.
    Les API passent avant le SMTP : si une clé est posée, c'est qu'on veut
    contourner un SMTP bloqué."""
    if BREVO_API_KEY:
        return "brevo"
    if RESEND_API_KEY:
        return "resend"
    if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
        return "smtp"
    return "aucun"


EMAIL_ENABLED = fournisseur() != "aucun"


class EchecEnvoi(Exception):
    """Un envoi raté, avec une phrase qu'un humain peut comprendre et un conseil."""

    def __init__(self, message: str, conseil: str = ""):
        super().__init__(message)
        self.message = message
        self.conseil = conseil


def _expediteur() -> tuple[str, str]:
    """(nom, adresse) depuis « Nom <adresse> » ou une adresse nue."""
    m = re.match(r"^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$", EMAIL_FROM or "")
    if m:
        return (m.group(1).strip().strip('"') or "CaptenTDB", m.group(2))
    return ("CaptenTDB", (EMAIL_FROM or "").strip())


async def _via_brevo(to: str, subject: str, html: str) -> None:
    nom, adresse = _expediteur()
    if not adresse:
        raise EchecEnvoi("Aucun expéditeur défini.", "Ajoutez EMAIL_FROM, par exemple « CaptenTDB <vous@exemple.fr> ».")
    try:
        async with httpx.AsyncClient(timeout=DELAI_S) as c:
            r = await c.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={"api-key": BREVO_API_KEY, "accept": "application/json"},
                json={"sender": {"name": nom, "email": adresse},
                      "to": [{"email": to}], "subject": subject, "htmlContent": html},
            )
    except httpx.HTTPError as exc:
        raise EchecEnvoi(f"Brevo injoignable ({type(exc).__name__}).", "Réessayez dans quelques minutes.")
    if r.status_code < 300:
        return
    texte = r.text[:300]
    if r.status_code == 401:
        raise EchecEnvoi("Clé API Brevo refusée.",
                         "Vérifiez BREVO_API_KEY : une clé API (menu SMTP & API → Clés API), pas le mot de passe SMTP.")
    if "sender" in texte.lower():
        raise EchecEnvoi(f"Brevo refuse l'expéditeur « {adresse} ».",
                         "Ajoutez et validez cette adresse dans Brevo (Expéditeurs, domaines et IP dédiées → Expéditeurs).")
    raise EchecEnvoi(f"Brevo a répondu {r.status_code} : {texte}")


async def _via_resend(to: str, subject: str, html: str) -> None:
    nom, adresse = _expediteur()
    expediteur = f"{nom} <{adresse}>" if adresse else "CaptenTDB <onboarding@resend.dev>"
    try:
        async with httpx.AsyncClient(timeout=DELAI_S) as c:
            r = await c.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                json={"from": expediteur, "to": [to], "subject": subject, "html": html},
            )
    except httpx.HTTPError as exc:
        raise EchecEnvoi(f"Resend injoignable ({type(exc).__name__}).", "Réessayez dans quelques minutes.")
    if r.status_code < 300:
        return
    texte = r.text[:300]
    if r.status_code in (401, 403) and "domain" in texte.lower():
        raise EchecEnvoi("Resend refuse l'expéditeur : le domaine n'est pas vérifié.",
                         "Vérifiez votre domaine dans Resend (Domains), ou envoyez depuis onboarding@resend.dev "
                         "— qui ne peut écrire qu'à l'adresse de votre compte Resend.")
    if r.status_code == 401:
        raise EchecEnvoi("Clé API Resend refusée.", "Vérifiez RESEND_API_KEY.")
    raise EchecEnvoi(f"Resend a répondu {r.status_code} : {texte}")


async def _via_smtp(to: str, subject: str, html: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = EMAIL_FROM
    msg["To"]      = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    kwargs = dict(hostname=SMTP_HOST, port=SMTP_PORT, username=SMTP_USER,
                  password=SMTP_PASSWORD, timeout=DELAI_S)
    try:
        if SMTP_PORT == 465:
            await aiosmtplib.send(msg, **kwargs, use_tls=True, tls_context=ssl.create_default_context())
        else:
            await aiosmtplib.send(msg, **kwargs, start_tls=True)
    except aiosmtplib.SMTPAuthenticationError:
        raise EchecEnvoi("Le serveur SMTP refuse l'identifiant ou le mot de passe.",
                         "Avec Gmail : un « mot de passe d'application » de 16 lettres, pas le mot de passe du compte.")
    except (aiosmtplib.SMTPConnectError, aiosmtplib.SMTPTimeoutError, TimeoutError, OSError) as exc:
        raise EchecEnvoi(
            f"Impossible de joindre {SMTP_HOST}:{SMTP_PORT} ({type(exc).__name__}).",
            "Sur Railway, le SMTP sortant est bloqué sur les forfaits Free, Trial et Hobby. "
            "Utilisez BREVO_API_KEY ou RESEND_API_KEY (API HTTPS), ou passez au forfait Pro.")
    except aiosmtplib.SMTPException as exc:
        raise EchecEnvoi(f"Erreur SMTP : {exc}")


async def envoyer(to: str, subject: str, html: str) -> str:
    """Envoie, ou lève EchecEnvoi avec la raison. Rend la voie utilisée."""
    voie = fournisseur()
    if voie == "brevo":
        await _via_brevo(to, subject, html)
    elif voie == "resend":
        await _via_resend(to, subject, html)
    elif voie == "smtp":
        await _via_smtp(to, subject, html)
    else:
        raise EchecEnvoi("Aucun service d'envoi n'est configuré.",
                         "Ajoutez BREVO_API_KEY (recommandé sur Railway) et EMAIL_FROM.")
    return voie


async def _send(to: str, subject: str, html: str) -> None:
    """L'envoi des e-mails du site : n'échoue jamais bruyamment, mais JOURNALISE
    la raison exacte — c'était le point aveugle : un envoi bloqué ne laissait
    aucune trace compréhensible."""
    if not EMAIL_ENABLED:
        logger.warning("E-mail non configuré — rien n'est envoyé à %s | %s", to, subject)
        return
    try:
        await envoyer(to, subject, html)
    except EchecEnvoi as exc:
        logger.error("Envoi d'e-mail impossible (%s) : %s %s", fournisseur(), exc.message, exc.conseil)
        raise


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
