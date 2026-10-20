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
import html as _html
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
# Les guillemets et espaces collés avec la clé font refuser une clé juste.
BREVO_API_KEY  = os.getenv("BREVO_API_KEY", "").strip().strip("'\"").strip()
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
EMAIL_FROM     = (os.getenv("EMAIL_FROM") or os.getenv("SMTP_FROM")
                  or (f"CaptenTDB <{SMTP_USER}>" if SMTP_USER else ""))
SMTP_FROM      = EMAIL_FROM  # ancien nom, conservé
def adresse_site() -> str:
    """L'adresse publique du site, pour les liens envoyés (e-mails, Stripe).

    FRONTEND_URL sert aussi de liste d'origines autorisées (CORS), séparées
    par des virgules. Telle quelle dans un lien, une liste donnait
    « https://captentdb.fr,https://… /reset-password » : la PREMIÈRE adresse
    est celle du site."""
    brut = os.getenv("FRONTEND_URL", "") or "http://localhost:3000"
    return (brut.split(",")[0].strip() or "http://localhost:3000").rstrip("/")


FRONTEND_URL   = adresse_site()

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
        # « Clé refusée » recouvrait trois causes qui ne se règlent pas de la
        # même façon : on lit la réponse de Brevo pour dire laquelle.
        try:
            raison = str((r.json() or {}).get("message") or texte)
        except ValueError:
            raison = texte
        bas = raison.lower()
        if BREVO_API_KEY.startswith("xsmtpsib-"):
            raise EchecEnvoi("C'est la clé SMTP de Brevo, pas une clé API.",
                             "Dans Brevo : SMTP & API → onglet « Clés API » → Générer une clé (elle commence par "
                             "xkeysib-), puis remplacez BREVO_API_KEY sur Railway.")
        if "ip" in bas and ("unrecogni" in bas or "authori" in bas or "not allowed" in bas):
            raise EchecEnvoi(f"Brevo bloque l'adresse IP du serveur ({raison}).",
                             "Dans Brevo : Paramètres → Sécurité → « IP autorisées » : désactivez le blocage des IP "
                             "inconnues (l'adresse du serveur Railway change), ou ajoutez l'adresse indiquée.")
        if "not enabled" in bas or "disabled" in bas or "suspend" in bas:
            raise EchecEnvoi(f"Le compte ou la clé Brevo n'est pas activé ({raison}).",
                             "Terminez l'activation du compte Brevo (e-mail de confirmation, profil), "
                             "ou réactivez la clé dans SMTP & API → Clés API.")
        raise EchecEnvoi(f"Clé API Brevo refusée ({raison}).",
                         "Vérifiez BREVO_API_KEY sur Railway : la clé API entière (elle commence par xkeysib-), "
                         "sans guillemets ni espace, et pas le mot de passe SMTP.")
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


# ── Gabarit ────────────────────────────────────────────────────────────────
#
# L'IDENTITÉ DU SITE, JUSQUE DANS LA BOÎTE DE RÉCEPTION (web/docs/identite.md).
# Les e-mails partaient en violet sur fond noir avec un émoji 📈 en guise de
# logo : rien de CaptenTDB. Ils reprennent maintenant le ciel clair, la
# feuille blanche, le logo, les titres en serif, l'étiquette italique au trait
# ambre et le bouton à l'encre avec son point ambre.
#
# Écrit pour les messageries, pas pour un navigateur : mise en page en
# tableaux, styles en ligne (Gmail et Outlook ignorent une partie des
# feuilles de style), logo en PNG (le SVG n'y est pas affiché), polices de
# repli Georgia et Arial quand Fraunces et Plus Jakarta Sans ne chargent pas.

_ENCRE = "#0B1726"
_ENCRE_2 = "#3A4A5C"
_ENCRE_3 = "#6B7A8C"
_AMBRE = "#E5A83A"
_AMBRE_FONCE = "#C98A1E"
_CIEL = "#E6EDF4"
_FILET = "#DCE3EB"
_SERIF = "Fraunces, Georgia, 'Times New Roman', serif"
_SANS = "'Plus Jakarta Sans', Arial, Helvetica, sans-serif"


def _esc(v) -> str:
    return _html.escape(str(v or ""))


def _p(texte: str, taille: int = 15, couleur: str = _ENCRE_2, marge: str = "0 0 16px") -> str:
    return (f'<p style="margin:{marge};font-family:{_SANS};font-size:{taille}px;line-height:1.6;'
            f'color:{couleur};">{texte}</p>')


def _fort(texte: str) -> str:
    return f'<strong style="color:{_ENCRE};font-weight:600;">{texte}</strong>'


def _bouton(url: str, texte: str) -> str:
    """Le bouton du site : encre, point ambre, flèche ambre."""
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr><td bgcolor="{_ENCRE}" style="border-radius:12px;">
    <a href="{url}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:{_SANS};
       font-size:15px;font-weight:600;color:#F6F2EA;text-decoration:none;border-radius:12px;">
      <span style="color:{_AMBRE};">&#9679;</span>&nbsp;&nbsp;{texte}&nbsp;&nbsp;<span style="color:{_AMBRE};">&#8594;</span>
    </a>
  </td></tr>
</table>"""


def _lien_secours(url: str) -> str:
    return (_p("Si le bouton ne s'ouvre pas, copiez ce lien dans votre navigateur :", 13, _ENCRE_3, "0 0 6px")
            + f'<p style="margin:0 0 8px;font-family:{_SANS};font-size:12px;line-height:1.5;word-break:break-all;">'
              f'<a href="{url}" style="color:{_ENCRE_2};text-decoration:underline;">{url}</a></p>')


def _gabarit(etiquette: str, titre: str, contenu: str, apercu: str = "") -> str:
    """La lettre complète. `etiquette` : la petite ligne en italique au-dessus
    du titre ; `apercu` : la phrase que la messagerie affiche à côté de l'objet."""
    site = adresse_site()
    logo = f"{site}/icons/icon-192.png"
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <title>{_esc(titre)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,400&family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:{_CIEL};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:{_CIEL};">{_esc(apercu)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{_CIEL}" style="background:{_CIEL};">
    <tr><td align="center" style="padding:36px 14px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <!-- Le logo et le nom, comme en tête du site. -->
        <tr><td style="padding:0 6px 18px;">
          <a href="{site}" target="_blank" style="text-decoration:none;">
            <img src="{logo}" width="40" height="40" alt="CaptenTDB" style="vertical-align:middle;border:0;border-radius:10px;">
            <span style="vertical-align:middle;margin-left:10px;font-family:{_SERIF};font-size:22px;font-weight:600;color:{_ENCRE};">CaptenTDB</span>
          </a>
        </td></tr>
        <!-- La feuille. -->
        <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:18px;border:1px solid {_FILET};padding:36px 34px 30px;">
          <p style="margin:0 0 10px;font-family:{_SERIF};font-style:italic;font-size:16px;color:{_ENCRE_3};">
            <span style="display:inline-block;width:22px;height:2px;background:{_AMBRE};vertical-align:middle;margin-right:8px;"></span>{_esc(etiquette)}
          </p>
          <h1 style="margin:0 0 18px;font-family:{_SERIF};font-size:26px;line-height:1.2;font-weight:500;color:{_ENCRE};">{_esc(titre)}</h1>
          {contenu}
        </td></tr>
        <!-- Le colophon. -->
        <tr><td style="padding:22px 8px 0;">
          <p style="margin:0 0 8px;font-family:{_SERIF};font-style:italic;font-size:14px;line-height:1.55;color:{_ENCRE_2};">
            Imaginé et construit en France. Les cours sont réels, l'argent ne l'est pas.
          </p>
          <p style="margin:0;font-family:{_SANS};font-size:12px;line-height:1.55;color:{_ENCRE_3};">
            CaptenTDB est un simulateur éducatif : aucun conseil en investissement, aucun fonds collecté.
            Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.
            <a href="{site}" style="color:{_ENCRE_3};">{site.replace("https://", "")}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _base_template(content: str) -> str:
    """Ancien point d'entrée (e-mail de test de l'administration)."""
    return _gabarit("Message de CaptenTDB", "CaptenTDB", content)


async def send_verification_email(to: str, username: str, token: str) -> None:
    """Le lien qui confirme l'adresse du compte."""
    url = f"{adresse_site()}/verify-email?token={token}"
    html = _gabarit(
        "Bienvenue à bord", "Confirmez votre adresse e-mail",
        _p(f"Bonjour {_fort(_esc(username))},")
        + _p("Merci de rejoindre CaptenTDB. Votre espace est déjà ouvert ; un clic suffit pour confirmer "
             f"que cette adresse est bien la vôtre. Le lien reste valable {_fort('24 heures')}.")
        + _bouton(url, "Confirmer mon adresse")
        + _lien_secours(url)
        + _p("Votre adresse ne sert qu'à votre compte : vous reconnecter, récupérer votre mot de passe, "
             "et le reçu si vous prenez Premium. Pas de newsletter, pas de publicité, et elle n'est jamais "
             "vendue ni cédée.", 13, _ENCRE_3, "16px 0 0")
        + _p("Vous n'avez pas créé de compte ? Ignorez simplement cet e-mail.", 13, _ENCRE_3, "8px 0 0"),
        apercu="Un clic pour confirmer votre adresse. Pas de newsletter, pas de publicité.",
    )
    await _send(to, "Confirmez votre adresse e-mail · CaptenTDB", html)


async def send_password_reset_email(to: str, username: str, token: str) -> None:
    """Le lien de réinitialisation du mot de passe."""
    url = f"{adresse_site()}/reset-password?token={token}"
    html = _gabarit(
        "Mot de passe oublié", "Choisissez un nouveau mot de passe",
        _p(f"Bonjour {_fort(_esc(username))},")
        + _p("Vous avez demandé à changer de mot de passe. Le lien ci-dessous vous y mène ; il reste "
             f"valable {_fort('1 heure')} et ne sert qu'une fois.")
        + _bouton(url, "Choisir un nouveau mot de passe")
        + _lien_secours(url)
        + _p("Vous n'avez rien demandé ? Ignorez cet e-mail : votre mot de passe ne change pas, "
             "et personne ne peut l'utiliser sans ce lien.", 13, _ENCRE_3, "16px 0 0"),
        apercu="Le lien pour choisir un nouveau mot de passe, valable une heure.",
    )
    await _send(to, "Votre nouveau mot de passe · CaptenTDB", html)


async def send_confirmation_abonnement(to: str, username: str, prix: str, fin_retractation: str,
                                       editeur_ligne: str) -> None:
    """La confirmation du contrat sur un support durable, exigée à la vente à
    distance (code de la consommation, art. L.221-13) : ce qui a été acheté,
    à quel prix, comment résilier, et le droit de rétractation avec son
    formulaire. Stripe envoie le reçu ; ceci est le contrat."""
    site = adresse_site()
    html = _gabarit(
        "Premium", "Votre abonnement Premium est actif",
        _p(f"Bonjour {_fort(_esc(username))},")
        + _p(f"Merci ! Votre abonnement {_fort('CaptenTDB Premium')} est activé : {_fort(_esc(prix) + ' par mois')}, "
             "renouvelé automatiquement chaque mois.")
        + _p(f"{_fort('Résilier')} : à tout moment depuis la page Premium (« Résilier mon abonnement »). "
             "L'accès reste ouvert jusqu'à la fin du mois payé, et plus rien n'est prélevé ensuite.")
        + _p(f"{_fort('Changer d’avis')} : vous pouvez vous rétracter jusqu'au {_fort(_esc(fin_retractation))} "
             "(14 jours), sans motif : bouton « Me rétracter » sur la page Premium, ou par simple écrit. "
             "Vous êtes alors remboursé en entier.")
        + _bouton(f"{site}/premium", "Gérer mon abonnement")
        + _p(f'Conditions générales de vente : <a href="{site}/cgv" style="color:{_ENCRE_2};">{site}/cgv</a>',
             13, _ENCRE_3)
        + f'<div style="border-top:1px solid {_FILET};margin:20px 0 14px;"></div>'
        + _p("Modèle de formulaire de rétractation (à n'utiliser que si vous souhaitez vous rétracter) : "
             f"« À l'attention de {_esc(editeur_ligne)}. Je vous notifie par la présente ma rétractation du "
             "contrat portant sur l'abonnement CaptenTDB Premium, souscrit le [date]. Nom, adresse e-mail "
             "du compte, date. »", 12, _ENCRE_3, "0 0 10px")
        + _p(_esc(editeur_ligne), 12, _ENCRE_3, "0"),
        apercu="Votre abonnement est actif : comment le gérer, le résilier ou vous rétracter.",
    )
    await _send(to, "Votre abonnement Premium · CaptenTDB", html)
