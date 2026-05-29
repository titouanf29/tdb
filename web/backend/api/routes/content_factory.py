"""
Content Factory — admin-only routes for generating short-form video content packs.
"""
import io
import json
import os
import uuid
import zipfile
from datetime import datetime, timezone
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..database import execute_query, execute_write
from .admin import get_admin_user

router = APIRouter()

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
MISTRAL_MODEL = "mistral-small-latest"

CONTENT_LIBRARY = [
    {"topic": "RSI",                      "category": "indicator"},
    {"topic": "MACD",                     "category": "indicator"},
    {"topic": "EMA",                      "category": "indicator"},
    {"topic": "Bollinger Bands",          "category": "indicator"},
    {"topic": "Volume",                   "category": "indicator"},
    {"topic": "Stochastique",             "category": "indicator"},
    {"topic": "ATR",                      "category": "indicator"},
    {"topic": "Ichimoku",                 "category": "indicator"},
    {"topic": "Support & Résistance",     "category": "concept"},
    {"topic": "Chandelier Japonais",      "category": "concept"},
    {"topic": "Tendance",                 "category": "concept"},
    {"topic": "Risk Management",          "category": "concept"},
    {"topic": "Take Profit / Stop Loss",  "category": "concept"},
    {"topic": "Scalping",                 "category": "strategy"},
    {"topic": "Swing Trading",            "category": "strategy"},
    {"topic": "Day Trading",              "category": "strategy"},
]

CATEGORY_LABELS = {
    "indicator": "Indicateur",
    "concept":   "Concept",
    "strategy":  "Stratégie",
    "tip":       "Conseil",
}


# ── Pydantic models ───────────────────────────────────────────────────────────

class GenerateScriptRequest(BaseModel):
    topic: str
    category: str = "indicator"


class CreatePieceRequest(BaseModel):
    title: str
    topic: str
    category: str = "indicator"
    status: str = "draft"
    script: Optional[str] = None
    hook: Optional[str] = None
    call_to_action: Optional[str] = None
    hashtags_tiktok: Optional[List[str]] = None
    hashtags_youtube: Optional[List[str]] = None
    hashtags_instagram: Optional[List[str]] = None
    description_tiktok: Optional[str] = None
    description_youtube: Optional[str] = None
    description_instagram: Optional[str] = None
    site_page_url: Optional[str] = None


class UpdatePieceRequest(BaseModel):
    title: Optional[str] = None
    topic: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    script: Optional[str] = None
    hook: Optional[str] = None
    call_to_action: Optional[str] = None
    hashtags_tiktok: Optional[List[str]] = None
    hashtags_youtube: Optional[List[str]] = None
    hashtags_instagram: Optional[List[str]] = None
    description_tiktok: Optional[str] = None
    description_youtube: Optional[str] = None
    description_instagram: Optional[str] = None
    site_page_url: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _deserialize_piece(row: dict) -> dict:
    piece = dict(row)
    for key in ("hashtags_tiktok", "hashtags_youtube", "hashtags_instagram"):
        val = piece.get(key)
        if val:
            try:
                piece[key] = json.loads(val)
            except Exception:
                piece[key] = []
        else:
            piece[key] = []
    return piece


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("/pieces")
async def list_pieces(current_user: dict = Depends(get_admin_user)):
    rows = await execute_query(
        "SELECT * FROM content_pieces ORDER BY created_at DESC"
    )
    return {"pieces": [_deserialize_piece(r) for r in (rows or [])]}


@router.post("/pieces")
async def create_piece(body: CreatePieceRequest, current_user: dict = Depends(get_admin_user)):
    now = datetime.now(timezone.utc).isoformat()
    piece_id = str(uuid.uuid4())
    await execute_write(
        """INSERT INTO content_pieces
           (id, title, topic, category, status, script, hook, call_to_action,
            hashtags_tiktok, hashtags_youtube, hashtags_instagram,
            description_tiktok, description_youtube, description_instagram,
            site_page_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            piece_id,
            body.title,
            body.topic,
            body.category,
            body.status,
            body.script,
            body.hook,
            body.call_to_action,
            json.dumps(body.hashtags_tiktok or []),
            json.dumps(body.hashtags_youtube or []),
            json.dumps(body.hashtags_instagram or []),
            body.description_tiktok,
            body.description_youtube,
            body.description_instagram,
            body.site_page_url,
            now,
            now,
        ),
    )
    rows = await execute_query("SELECT * FROM content_pieces WHERE id = ?", (piece_id,))
    return {"piece": _deserialize_piece(rows[0]) if rows else {"id": piece_id}}


@router.get("/pieces/{piece_id}")
async def get_piece(piece_id: str, current_user: dict = Depends(get_admin_user)):
    rows = await execute_query("SELECT * FROM content_pieces WHERE id = ?", (piece_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Piece not found")
    return {"piece": _deserialize_piece(rows[0])}


@router.put("/pieces/{piece_id}")
async def update_piece(
    piece_id: str,
    body: UpdatePieceRequest,
    current_user: dict = Depends(get_admin_user),
):
    if not await execute_query("SELECT id FROM content_pieces WHERE id = ?", (piece_id,)):
        raise HTTPException(status_code=404, detail="Piece not found")

    now = datetime.now(timezone.utc).isoformat()
    updates: list[str] = []
    params: list = []

    def _add(value, col: str, transform=None):
        if value is not None:
            updates.append(f"{col} = ?")
            params.append(transform(value) if transform else value)

    _add(body.title,             "title")
    _add(body.topic,             "topic")
    _add(body.category,          "category")
    _add(body.status,            "status")
    _add(body.script,            "script")
    _add(body.hook,              "hook")
    _add(body.call_to_action,    "call_to_action")
    _add(body.hashtags_tiktok,   "hashtags_tiktok",   json.dumps)
    _add(body.hashtags_youtube,  "hashtags_youtube",  json.dumps)
    _add(body.hashtags_instagram,"hashtags_instagram",json.dumps)
    _add(body.description_tiktok,   "description_tiktok")
    _add(body.description_youtube,  "description_youtube")
    _add(body.description_instagram,"description_instagram")
    _add(body.site_page_url,     "site_page_url")

    updates.append("updated_at = ?")
    params.append(now)
    params.append(piece_id)

    if updates:
        await execute_write(
            "UPDATE content_pieces SET " + ", ".join(updates) + " WHERE id = ?",
            tuple(params),
        )
    return {"success": True}


@router.delete("/pieces/{piece_id}")
async def delete_piece(piece_id: str, current_user: dict = Depends(get_admin_user)):
    await execute_write("DELETE FROM content_pieces WHERE id = ?", (piece_id,))
    return {"success": True}


@router.get("/library")
async def get_library(current_user: dict = Depends(get_admin_user)):
    return {"library": CONTENT_LIBRARY}


# ── Script generation ─────────────────────────────────────────────────────────

_FALLBACK_TEMPLATES: dict[str, dict] = {
    "RSI": {
        "hook": "Tu utilises le RSI mais tu sais pas vraiment ce qu'il te dit ?",
        "script": (
            "[HOOK]\n"
            "\"Tu utilises le RSI mais tu sais pas vraiment ce qu'il te dit ?\"\n\n"
            "[PROBLÈME]\n"
            "\"La plupart des débutants regardent juste si c'est au-dessus de 70 "
            "ou en-dessous de 30. C'est une erreur.\"\n\n"
            "[DÉFINITION]\n"
            "\"Le RSI, c'est le Relative Strength Index. Il mesure la force d'une "
            "tendance sur une échelle de 0 à 100.\"\n\n"
            "[COMMENT]\n"
            "\"Au-dessus de 70 : le marché est suracheté, attention à une correction. "
            "En-dessous de 30 : survendu, potentiel rebond. "
            "Mais le plus important c'est la divergence.\"\n\n"
            "[EXEMPLE]\n"
            "\"Sur ce graphique, le prix monte mais le RSI baisse — "
            "c'est une divergence baissière. Signal d'alerte fort.\"\n\n"
            "[CTA]\n"
            "\"Apprends à maîtriser tous les indicateurs sur captentdb.fr — le lien est en bio.\""
        ),
        "cta": "Apprends à maîtriser tous les indicateurs sur captentdb.fr — le lien est en bio.",
        "hashtags_tiktok":    ["#trading", "#rsi", "#indicateurtechnique", "#apprendreàtrader", "#tradingdebutant", "#financeperso", "#bourse", "#crypto", "#forex", "#captentdb"],
        "hashtags_youtube":   ["rsi", "trading", "indicateur technique", "apprendre trading", "bourse", "finance", "captentdb", "debutant"],
        "hashtags_instagram": ["#trading", "#rsi", "#bourse", "#crypto", "#finance", "#trader", "#captentdb", "#investissement"],
        "description_tiktok":    "💡 RSI expliqué en 45 secondes pour les débutants.\nBien plus que juste suracheté/survendu !\n\n📚 Apprends gratuitement sur captentdb.fr\n\n#trading #rsi #captentdb",
        "description_youtube":   "RSI expliqué en 45 secondes | Indicateur trading débutant. Apprends sur captentdb.fr",
        "description_instagram": "💡 Le RSI expliqué en 45 secondes ! Tu utilisais cet indicateur correctement ? 📈 Lien en bio 👆\n#trading #rsi #captentdb",
    },
    "MACD": {
        "hook": "Le MACD te donne des faux signaux ? Voici pourquoi.",
        "script": (
            "[HOOK]\n\"Le MACD te donne des faux signaux ? Voici pourquoi.\"\n\n"
            "[PROBLÈME]\n\"Beaucoup de traders réagissent à chaque croisement. Grosse erreur — sans contexte, c'est du bruit.\"\n\n"
            "[DÉFINITION]\n\"Le MACD mesure la différence entre deux moyennes mobiles. Quand les lignes se croisent, le momentum change.\"\n\n"
            "[COMMENT]\n\"Attends la confirmation : croisement + histogramme qui s'étend + prix au-dessus ou en-dessous d'un support clé.\"\n\n"
            "[EXEMPLE]\n\"Ici le MACD croise à la hausse ET le prix rebondit sur son support — c'est le signal d'entrée idéal.\"\n\n"
            "[CTA]\n\"Maîtrise tous les indicateurs sur captentdb.fr — le lien est en bio.\""
        ),
        "cta": "Maîtrise tous les indicateurs sur captentdb.fr — le lien est en bio.",
        "hashtags_tiktok":    ["#trading", "#macd", "#indicateurtechnique", "#analysetechnique", "#tradingdebutant", "#bourse", "#crypto", "#finance", "#captentdb", "#motdujour"],
        "hashtags_youtube":   ["macd", "trading", "indicateur technique", "analyse technique", "bourse", "finance", "captentdb", "momentum"],
        "hashtags_instagram": ["#trading", "#macd", "#bourse", "#analysetechnique", "#finance", "#trader", "#captentdb", "#investissement"],
        "description_tiktok":    "💡 MACD expliqué en 45 secondes !\nComment éviter les faux signaux 📊\n\n📚 Apprends gratuitement sur captentdb.fr\n\n#trading #macd #captentdb",
        "description_youtube":   "MACD expliqué en 45 secondes | Eviter les faux signaux. Apprends sur captentdb.fr",
        "description_instagram": "💡 Le MACD expliqué en 45 secondes ! Finis les faux signaux 📈 Lien en bio 👆\n#trading #macd #captentdb",
    },
}


def _get_fallback(topic: str) -> dict:
    if topic in _FALLBACK_TEMPLATES:
        return _FALLBACK_TEMPLATES[topic]
    slug = topic.lower().replace(" ", "").replace("&", "et").replace("/", "")
    return {
        "hook":  f"Tu connais vraiment {topic} ou tu penses juste le connaître ?",
        "script": (
            f"[HOOK]\n\"Tu connais vraiment {topic} ou tu penses juste le connaître ?\"\n\n"
            f"[PROBLÈME]\n\"La plupart des traders n'utilisent pas {topic} correctement. Ils ratent les meilleurs signaux.\"\n\n"
            f"[DÉFINITION]\n\"{topic} est l'un des outils fondamentaux de l'analyse technique. Bien compris, il transforme votre trading.\"\n\n"
            f"[COMMENT]\n\"La clé c'est de l'utiliser en confluence avec d'autres indicateurs. Cherchez toujours la confirmation.\"\n\n"
            f"[EXEMPLE]\n\"Sur ce graphique, {topic} nous donne un signal clair que beaucoup auraient manqué. Voyez la différence.\"\n\n"
            f"[CTA]\n\"Apprends à maîtriser {topic} et tous les indicateurs sur captentdb.fr — le lien est en bio.\""
        ),
        "cta": f"Apprends à maîtriser {topic} sur captentdb.fr — le lien est en bio.",
        "hashtags_tiktok":    ["#trading", f"#{slug}", "#indicateurtechnique", "#apprendreàtrader", "#tradingdebutant", "#bourse", "#crypto", "#finance", "#captentdb", "#motdujour"],
        "hashtags_youtube":   ["trading", slug, "indicateur technique", "apprendre trading", "bourse", "finance", "captentdb", "analyse technique"],
        "hashtags_instagram": ["#trading", f"#{slug}", "#bourse", "#finance", "#trader", "#captentdb", "#investissement", "#analysetechnique"],
        "description_tiktok":    f"💡 {topic} expliqué en 45 secondes !\n\n📚 Apprends gratuitement sur captentdb.fr\n\n#trading #{slug} #captentdb",
        "description_youtube":   f"{topic} expliqué en 45 secondes | Trading débutant. Apprends sur captentdb.fr",
        "description_instagram": f"💡 {topic} expliqué en 45 secondes ! 📈 Lien en bio 👆\n#trading #{slug} #captentdb",
    }


def _build_generation_prompt(topic: str, category: str) -> tuple[str, str]:
    system = "Tu es un expert en création de contenu vidéo court. Réponds UNIQUEMENT en JSON valide, aucun texte hors JSON."
    user = (
        f"Tu es un expert en création de contenu vidéo court (TikTok / YouTube Shorts) "
        f"dans le domaine du trading financier.\n\n"
        f"Génère un script complet de 45 secondes sur : **{topic}** (catégorie: {category}).\n\n"
        f"STRUCTURE IMPOSÉE :\n"
        f"[HOOK] 3s — question ou affirmation choc\n"
        f"[PROBLÈME] 5s — erreur fréquente des débutants\n"
        f"[DÉFINITION] 10s — définition simple de {topic}\n"
        f"[COMMENT] 15s — comment l'utiliser concrètement avec des chiffres\n"
        f"[EXEMPLE] 10s — exemple visuel sur un graphique\n"
        f"[CTA] 5s — doit mentionner captentdb.fr et 'le lien est en bio'\n\n"
        f"Génère aussi les métadonnées pour les 3 plateformes.\n\n"
        f"Réponds UNIQUEMENT en JSON valide avec ces champs :\n"
        f"hook, script (avec les balises [HOOK] etc.), cta, "
        f"description_tiktok, description_youtube, description_instagram, "
        f"hashtags_tiktok (array), hashtags_youtube (array), hashtags_instagram (array)"
    )
    return system, user


def _patch_cta(result: dict) -> dict:
    cta: str = result.get("cta", "")
    if "captentdb.fr" not in cta:
        result["cta"] = cta.rstrip(".") + " — captentdb.fr"
    return result


@router.post("/generate-script")
async def generate_script(
    body: GenerateScriptRequest,
    current_user: dict = Depends(get_admin_user),
):
    system_msg, user_msg = _build_generation_prompt(body.topic, body.category)
    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user",   "content": user_msg},
    ]

    # ── 1. Try Groq ──────────────────────────────────────────────────────────
    groq_key = os.getenv("GROQ_API_KEY", "")
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    GROQ_API_URL,
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": GROQ_MODEL,
                        "messages": messages,
                        "temperature": 0.75,
                        "max_tokens": 2048,
                        "response_format": {"type": "json_object"},
                    },
                )
            if resp.status_code == 200:
                result = json.loads(resp.json()["choices"][0]["message"]["content"])
                return {"success": True, "generated": _patch_cta(result), "source": "groq"}
            print(f"[ContentFactory] Groq returned {resp.status_code}, trying Mistral")
        except Exception as exc:
            print(f"[ContentFactory] Groq error: {exc}, trying Mistral")

    # ── 2. Try Mistral ───────────────────────────────────────────────────────
    mistral_key = os.getenv("MISTRAL_API_KEY", "")
    if mistral_key:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    MISTRAL_API_URL,
                    headers={"Authorization": f"Bearer {mistral_key}", "Content-Type": "application/json"},
                    json={
                        "model": MISTRAL_MODEL,
                        "messages": messages,
                        "temperature": 0.75,
                        "max_tokens": 2048,
                        "response_format": {"type": "json_object"},
                    },
                )
            if resp.status_code == 200:
                result = json.loads(resp.json()["choices"][0]["message"]["content"])
                return {"success": True, "generated": _patch_cta(result), "source": "mistral"}
            print(f"[ContentFactory] Mistral returned {resp.status_code}, falling back to template")
        except Exception as exc:
            print(f"[ContentFactory] Mistral error: {exc}, falling back to template")

    # ── 3. Template fallback ─────────────────────────────────────────────────
    return {"success": True, "generated": _get_fallback(body.topic), "source": "template"}


# ── ZIP export ────────────────────────────────────────────────────────────────

def _fmt_srt_time(t: float) -> str:
    h  = int(t // 3600)
    m  = int((t % 3600) // 60)
    s  = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _generate_srt(script: str) -> str:
    words = script.replace("\n", " ").split()
    if not words:
        return "1\n00:00:00,000 --> 00:00:45,000\n[Ajouter sous-titres]\n"
    wps             = 2.5   # ~150 wpm speaking rate
    chunk_size      = 5     # max words per subtitle line
    segments: list[str] = []
    current_start   = 0.0

    for i in range(0, len(words), chunk_size):
        chunk    = words[i : i + chunk_size]
        duration = len(chunk) / wps
        end      = current_start + duration
        segments.append(
            f"{len(segments) + 1}\n"
            f"{_fmt_srt_time(current_start)} --> {_fmt_srt_time(end)}\n"
            f"{' '.join(chunk)}\n"
        )
        current_start = end

    return "\n".join(segments)


def _readme(topic: str) -> str:
    return (
        f"📱 INSTRUCTIONS DE PUBLICATION — {topic.upper()}\n\n"
        f"ÉTAPE 1 — Générer la voix off\n"
        f"→ Va sur elevenlabs.io\n"
        f"→ Colle le contenu de script.txt\n"
        f"→ Choisis une voix (recommandé : \"Rachel\" ou \"Antoni\")\n"
        f"→ Télécharge l'audio en MP3\n\n"
        f"ÉTAPE 2 — Assembler dans CapCut\n"
        f"→ Nouveau projet 9:16\n"
        f"→ Ajoute l'audio MP3 généré\n"
        f"→ Ajoute les sous-titres depuis sous-titres.srt\n"
        f"→ Durée totale cible : 45 secondes\n\n"
        f"ÉTAPE 3 — Publier\n"
        f"→ TikTok    : colle description_tiktok.txt\n"
        f"→ YouTube   : colle description_youtube.txt\n"
        f"→ Instagram : colle description_instagram.txt\n\n"
        f"⏱ Temps estimé total : 15 minutes\n\n"
        f"💡 CONSEIL : Publie entre 18h et 20h pour le meilleur engagement.\n"
    )


@router.get("/export/{piece_id}")
async def export_piece(piece_id: str, current_user: dict = Depends(get_admin_user)):
    rows = await execute_query("SELECT * FROM content_pieces WHERE id = ?", (piece_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="Piece not found")

    p = _deserialize_piece(rows[0])
    topic  = p.get("topic", "Trading")
    script = p.get("script") or ""
    cta    = p.get("call_to_action") or ""

    sections_text = (
        f"=== SCRIPT DÉCOUPÉ PAR SECTION — {topic.upper()} ===\n\n"
        f"{script}\n\n"
        f"--- TIMING ESTIMÉ ---\n"
        f"[HOOK]        0:00 - 0:03  (3 sec)\n"
        f"[PROBLÈME]    0:03 - 0:08  (5 sec)\n"
        f"[DÉFINITION]  0:08 - 0:18 (10 sec)\n"
        f"[COMMENT]     0:18 - 0:33 (15 sec)\n"
        f"[EXEMPLE]     0:33 - 0:43 (10 sec)\n"
        f"[CTA]         0:43 - 0:48  (5 sec)\n"
    ) if script else "Script non encore généré."

    tags_tt = " ".join(p["hashtags_tiktok"])  if p["hashtags_tiktok"]  else "#trading #captentdb"
    tags_yt = ", ".join(p["hashtags_youtube"]) if p["hashtags_youtube"] else "trading, captentdb"
    tags_ig = " ".join(p["hashtags_instagram"])if p["hashtags_instagram"]else "#trading #captentdb"

    desc_tt = p.get("description_tiktok")    or f"💡 {topic} expliqué en 45 secondes !\n\n📚 captentdb.fr\n\n{tags_tt}"
    desc_yt = (
        f"Titre : {p.get('title', topic + ' expliqué en 45 secondes')}\n\n"
        f"Description :\n{p.get('description_youtube') or f'{topic} expliqué en 45 secondes. Apprends sur captentdb.fr'}\n\n"
        f"Tags : {tags_yt}\n"
    )
    desc_ig = p.get("description_instagram") or f"💡 {topic} en 45 secondes ! 📈 Lien en bio 👆\n{tags_ig}"

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("script.txt",              script or "Script non généré.")
        zf.writestr("script_sections.txt",     sections_text)
        zf.writestr("sous-titres.srt",         _generate_srt(script))
        zf.writestr("description_tiktok.txt",  desc_tt)
        zf.writestr("description_youtube.txt", desc_yt)
        zf.writestr("description_instagram.txt", desc_ig)
        zf.writestr("README.txt",              _readme(topic))
    buf.seek(0)

    safe_topic = topic.replace(" ", "_").replace("/", "_").replace("&", "et")
    filename   = f"captentdb_{safe_topic}_{datetime.now().strftime('%Y%m%d')}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
