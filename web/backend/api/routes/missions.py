"""
Missions & Quests API — adaptive educational system
"""
import json
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..database import execute_query, execute_write
from .auth import get_current_user

router = APIRouter()

# ─── Mission Definitions ──────────────────────────────────────────────────────

MISSIONS = [
    # ── Débutant ──────────────────────────────────────────────────────────────
    {
        "id": "first_login",
        "title": "Premier pas",
        "description": "Connectez-vous pour la première fois",
        "icon": "👋",
        "xp": 50,
        "category": "onboarding",
        "level": "beginner",
        "target": 1,
        "action": "login",
        "badge": "first_step",
    },
    {
        "id": "complete_lesson_1",
        "title": "Premier cours",
        "description": "Terminez votre premier cours dans la section Formation",
        "icon": "📚",
        "xp": 100,
        "category": "learn",
        "level": "beginner",
        "target": 1,
        "action": "lesson_complete",
        "badge": None,
    },
    {
        "id": "complete_3_lessons",
        "title": "Élève assidu",
        "description": "Terminez 3 cours dans la section Formation",
        "icon": "🎓",
        "xp": 250,
        "category": "learn",
        "level": "beginner",
        "target": 3,
        "action": "lesson_complete",
        "badge": "diligent_student",
    },
    {
        "id": "first_quiz",
        "title": "Premier quiz",
        "description": "Réussissez votre premier quiz avec ≥ 70%",
        "icon": "✅",
        "xp": 150,
        "category": "learn",
        "level": "beginner",
        "target": 1,
        "action": "quiz_pass",
        "badge": None,
    },
    {
        "id": "first_analysis",
        "title": "Analyste débutant",
        "description": "Analysez votre premier actif dans la section Analyse",
        "icon": "📈",
        "xp": 100,
        "category": "analysis",
        "level": "beginner",
        "target": 1,
        "action": "analysis_open",
        "badge": None,
    },
    {
        "id": "first_scanner",
        "title": "Chasseur d'opportunités",
        "description": "Lancez votre premier scan de marché",
        "icon": "🔍",
        "xp": 100,
        "category": "scanner",
        "level": "beginner",
        "target": 1,
        "action": "scanner_run",
        "badge": None,
    },
    {
        "id": "first_ai_chat",
        "title": "Dialogue avec l'IA",
        "description": "Posez votre première question à l'assistant IA",
        "icon": "🤖",
        "xp": 75,
        "category": "ai",
        "level": "beginner",
        "target": 1,
        "action": "ai_chat",
        "badge": None,
    },
    # ── Intermédiaire ─────────────────────────────────────────────────────────
    {
        "id": "complete_10_lessons",
        "title": "Formation complète",
        "description": "Terminez 10 cours dans la section Formation",
        "icon": "🏆",
        "xp": 500,
        "category": "learn",
        "level": "intermediate",
        "target": 10,
        "action": "lesson_complete",
        "badge": "training_complete",
    },
    {
        "id": "streak_7",
        "title": "Persévérance",
        "description": "Connectez-vous 7 jours consécutifs",
        "icon": "🔥",
        "xp": 300,
        "category": "streak",
        "level": "intermediate",
        "target": 7,
        "action": "daily_login",
        "badge": "streak_7",
    },
    {
        "id": "first_wallet_position",
        "title": "Premier trade",
        "description": "Ouvrez votre première position dans le Wallet",
        "icon": "💼",
        "xp": 200,
        "category": "wallet",
        "level": "intermediate",
        "target": 1,
        "action": "position_open",
        "badge": None,
    },
]

# ── Missions quotidiennes — se réinitialisent chaque jour (UTC) ──────────────
DAILY_MISSIONS = [
    {
        "id": "daily_analysis",
        "title": "Analyse du jour",
        "description": "Analysez un actif aujourd'hui",
        "icon": "📊",
        "xp": 25,
        "category": "daily",
        "level": "beginner",
        "target": 1,
        "action": "analysis_open",
        "badge": None,
        "daily": True,
    },
    {
        "id": "daily_lesson",
        "title": "Leçon du jour",
        "description": "Terminez une leçon aujourd'hui",
        "icon": "📖",
        "xp": 40,
        "category": "daily",
        "level": "beginner",
        "target": 1,
        "action": "lesson_complete",
        "badge": None,
        "daily": True,
    },
    {
        "id": "daily_scan",
        "title": "Scan du jour",
        "description": "Lancez un scan de marché aujourd'hui",
        "icon": "🔎",
        "xp": 20,
        "category": "daily",
        "level": "beginner",
        "target": 1,
        "action": "scanner_run",
        "badge": None,
        "daily": True,
    },
]

ALL_MISSIONS = MISSIONS + DAILY_MISSIONS

BADGES = {
    "first_step": {"icon": "🌟", "name": "Premier pas", "color": "#638CFF"},
    "diligent_student": {"icon": "📖", "name": "Élève assidu", "color": "#00D4AA"},
    "training_complete": {"icon": "🏆", "name": "Formation complète", "color": "#FFD700"},
    "streak_7": {"icon": "🔥", "name": "7 jours de suite", "color": "#FF4757"},
}

XP_PER_LEVEL = 500


def _xp_to_level(xp: int) -> int:
    return max(1, xp // XP_PER_LEVEL + 1)


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_or_create_progress(user_id: int) -> dict:
    rows = await execute_query(
        "SELECT * FROM user_progress WHERE user_id = ?", (user_id,)
    )
    if rows:
        r = rows[0]
        return {
            "user_id": r["user_id"],
            "xp": r["xp"],
            "level": r["level"],
            "badges": json.loads(r["badges"]),
            "streak_days": r["streak_days"],
            "last_activity_date": r["last_activity_date"],
        }
    now = datetime.now(timezone.utc).isoformat()
    # ON CONFLICT DO NOTHING : deux appels concurrents pour un utilisateur qui
    # n'a pas encore de ligne passent tous les deux le SELECT ci-dessus, et le
    # second faisait remonter une IntegrityError en 500. Cela arrive dès qu'un
    # utilisateur a deux onglets ouverts. Supporté par SQLite (3.24+) et par
    # PostgreSQL ; _to_pg ne réécrit que les « ? », la clause passe telle quelle.
    await execute_write(
        "INSERT INTO user_progress (user_id, xp, level, badges, streak_days, updated_at) "
        "VALUES (?, 0, 1, '[]', 0, ?) ON CONFLICT (user_id) DO NOTHING",
        (user_id, now),
    )
    return {"user_id": user_id, "xp": 0, "level": 1, "badges": [], "streak_days": 0, "last_activity_date": None}


async def _get_user_missions(user_id: int) -> List[dict]:
    rows = await execute_query(
        "SELECT * FROM user_missions WHERE user_id = ?", (user_id,)
    )
    return [dict(r) for r in rows]


def _completed_today(um: Optional[dict], today: str) -> bool:
    """True if this user-mission row was completed today (UTC)."""
    if not um or um.get("status") != "completed" or not um.get("completed_at"):
        return False
    return str(um["completed_at"])[:10] == today


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/missions")
async def list_missions(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    today = datetime.now(timezone.utc).date().isoformat()
    user_mission_rows = await _get_user_missions(user_id)
    user_map = {r["mission_id"]: r for r in user_mission_rows}

    result = []
    for m in ALL_MISSIONS:
        um = user_map.get(m["id"])
        # A daily mission completed on a previous day resets to not_started
        if m.get("daily") and um and um.get("status") == "completed" and not _completed_today(um, today):
            um = None
        result.append({
            **m,
            "status": um["status"] if um else "not_started",
            "progress": um["progress"] if um else 0,
            "completed_at": um["completed_at"] if um else None,
        })

    return {"missions": result}


@router.get("/progress")
async def get_progress(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    progress = await _get_or_create_progress(user_id)
    xp_for_next = (progress["level"]) * XP_PER_LEVEL
    xp_current_level = (progress["level"] - 1) * XP_PER_LEVEL
    return {
        **progress,
        "xp_for_next_level": xp_for_next,
        "xp_in_current_level": progress["xp"] - xp_current_level,
        "badges_detail": [BADGES.get(b) for b in progress["badges"] if b in BADGES],
    }


class ProgressAction(BaseModel):
    action: str  # e.g. "lesson_complete", "quiz_pass", "scanner_run"
    value: int = 1  # amount to increment


@router.post("/progress/action")
async def record_action(body: ProgressAction, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).date().isoformat()

    progress = await _get_or_create_progress(user_id)
    user_missions = await _get_user_missions(user_id)
    user_map = {r["mission_id"]: r for r in user_missions}

    xp_gained = 0
    completed = []
    new_badges = []

    for m in ALL_MISSIONS:
        if m["action"] != body.action:
            continue

        um = user_map.get(m["id"])
        if um and um["status"] == "completed":
            # Daily missions can be re-completed once per day
            if not (m.get("daily") and not _completed_today(um, today)):
                continue
            um = {**um, "progress": 0}

        current_progress = (um["progress"] if um else 0) + body.value
        if current_progress >= m["target"]:
            # Complete the mission
            xp_gained += m["xp"]
            completed.append(m["id"])
            if um:
                await execute_write(
                    "UPDATE user_missions SET status='completed', progress=?, completed_at=?, xp_earned=? WHERE user_id=? AND mission_id=?",
                    (m["target"], now, m["xp"], user_id, m["id"]),
                )
            else:
                await execute_write(
                    "INSERT INTO user_missions (user_id, mission_id, status, progress, completed_at, xp_earned, created_at) VALUES (?,?,?,?,?,?,?)",
                    (user_id, m["id"], "completed", m["target"], now, m["xp"], now),
                )
            if m.get("badge"):
                badges = progress["badges"]
                if m["badge"] not in badges:
                    badges.append(m["badge"])
                    new_badges.append(m["badge"])
                    progress["badges"] = badges
        else:
            # Update progress
            if um:
                await execute_write(
                    "UPDATE user_missions SET status='active', progress=? WHERE user_id=? AND mission_id=?",
                    (current_progress, user_id, m["id"]),
                )
            else:
                await execute_write(
                    "INSERT INTO user_missions (user_id, mission_id, status, progress, created_at) VALUES (?,?,?,?,?)",
                    (user_id, m["id"], "active", current_progress, now),
                )

    # Update streak for daily_login action
    streak = progress["streak_days"]
    last_date = progress.get("last_activity_date")
    if body.action == "daily_login":
        if last_date == today:
            pass  # already counted today
        elif last_date and (datetime.fromisoformat(today) - datetime.fromisoformat(last_date)).days == 1:
            streak += 1
        else:
            streak = 1
        progress["last_activity_date"] = today
        progress["streak_days"] = streak

    # Update XP and level
    new_xp = progress["xp"] + xp_gained
    new_level = _xp_to_level(new_xp)
    new_badges_json = json.dumps(progress["badges"])

    await execute_write(
        "UPDATE user_progress SET xp=?, level=?, badges=?, streak_days=?, last_activity_date=?, updated_at=? WHERE user_id=?",
        (new_xp, new_level, new_badges_json, streak, progress.get("last_activity_date"), now, user_id),
    )

    return {
        "xp_gained": xp_gained,
        "missions_completed": completed,
        "new_badges": [BADGES.get(b) for b in new_badges if b in BADGES],
        "new_xp": new_xp,
        "new_level": new_level,
        # Pour le message de réussite : le titre lisible, pas l'identifiant,
        # et le passage de niveau que le client ne peut pas déduire seul.
        "mission_titles": [m["title"] for m in ALL_MISSIONS if m["id"] in completed],
        "level_up": new_level > _xp_to_level(progress["xp"]),
    }


# ─── Lesson progress ──────────────────────────────────────────────────────────
#
# Which lessons a user has finished used to live in localStorage under
# "tdb_learn_progress". Everything else about their learning — XP, level,
# badges, streak — was already on the server, so the one part that was not was
# the part that says where they are in the course. Open the site on a phone
# after working through six lessons on a laptop and the course starts again
# from zero, having also silently re-awarded nothing, because the missions that
# did fire were recorded server-side. Half-persisted progress is worse than
# none: it looks like data loss to the user and it is.
#
# A lesson_key is "moduleId/lessonId". The frontend owns the catalogue, so the
# server stores keys without validating them against a list it would then have
# to keep in sync — a stale key costs one orphan row, a duplicated catalogue
# costs a permanent divergence.


class LessonDone(BaseModel):
    # Percentage, 0-100. Absent when the lesson has no quiz.
    quiz_score: Optional[int] = None


class LessonImport(BaseModel):
    """One-off migration of whatever a browser still holds locally."""
    completed: List[str] = []
    quiz_scores: dict = {}


@router.get("/lessons")
async def get_lessons(current_user: dict = Depends(get_current_user)):
    rows = await execute_query(
        "SELECT lesson_key, quiz_score, completed_at FROM user_lessons WHERE user_id=?",
        (current_user["id"],),
    )
    return {
        "lessons": {
            r["lesson_key"]: {
                "quiz_score": r["quiz_score"],
                "completed_at": r["completed_at"],
            }
            for r in rows
        }
    }


@router.post("/lessons/{module_id}/{lesson_id}")
async def complete_lesson(
    module_id: str,
    lesson_id: str,
    body: LessonDone,
    current_user: dict = Depends(get_current_user),
):
    """Mark a lesson finished, and award the XP that goes with it.

    Idempotent on the lesson row, deliberately not on the XP: re-finishing a
    lesson keeps the best quiz score and records no second completion, so the
    mission counters cannot be farmed by reopening the same lesson.
    """
    user_id = current_user["id"]
    key = f"{module_id}/{lesson_id}"
    now = datetime.now(timezone.utc).isoformat()

    existing = await execute_query(
        "SELECT quiz_score FROM user_lessons WHERE user_id=? AND lesson_key=?",
        (user_id, key),
    )
    score = body.quiz_score

    if existing:
        # Keep the best attempt. A re-read that skips the quiz must not erase
        # the score from the attempt that passed it.
        previous = existing[0]["quiz_score"]
        best = max([v for v in (previous, score) if v is not None], default=None)
        if best != previous:
            await execute_write(
                "UPDATE user_lessons SET quiz_score=? WHERE user_id=? AND lesson_key=?",
                (best, user_id, key),
            )
        return {"already_completed": True, "quiz_score": best, "xp_gained": 0}

    await execute_write(
        "INSERT INTO user_lessons (user_id, lesson_key, quiz_score, completed_at) VALUES (?,?,?,?) "
        "ON CONFLICT (user_id, lesson_key) DO NOTHING",
        (user_id, key, score, now),
    )

    # The missions engine is the single source of XP, so a first completion
    # goes through it rather than touching user_progress here.
    reward = await record_action(ProgressAction(action="lesson_complete"), current_user)
    if score is not None and score >= 70:
        quiz_reward = await record_action(ProgressAction(action="quiz_pass"), current_user)
        reward = {
            **quiz_reward,
            "xp_gained": reward["xp_gained"] + quiz_reward["xp_gained"],
            "missions_completed": reward["missions_completed"] + quiz_reward["missions_completed"],
            "new_badges": reward["new_badges"] + quiz_reward["new_badges"],
            "mission_titles": reward["mission_titles"] + quiz_reward["mission_titles"],
            "level_up": reward["level_up"] or quiz_reward["level_up"],
        }

    return {"already_completed": False, "quiz_score": score, **reward}


@router.post("/lessons/import")
async def import_lessons(
    body: LessonImport,
    current_user: dict = Depends(get_current_user),
):
    """Adopt a browser's local progress, once.

    Silent about XP on purpose. These lessons were finished before the server
    tracked them; the missions they triggered were already recorded at the
    time, so replaying them through the missions engine would pay twice for
    the same work. This only restores the map of where the user got to.
    """
    user_id = current_user["id"]
    now = datetime.now(timezone.utc).isoformat()

    existing = await execute_query(
        "SELECT lesson_key FROM user_lessons WHERE user_id=?", (user_id,)
    )
    known = {r["lesson_key"] for r in existing}

    added = 0
    for key in body.completed[:500]:
        if not isinstance(key, str) or "/" not in key or key in known:
            continue
        raw = body.quiz_scores.get(key)
        score = int(raw) if isinstance(raw, (int, float)) else None
        if score is not None:
            score = max(0, min(100, score))
        await execute_write(
            "INSERT INTO user_lessons (user_id, lesson_key, quiz_score, completed_at) VALUES (?,?,?,?) "
            "ON CONFLICT (user_id, lesson_key) DO NOTHING",
            (user_id, key, score, now),
        )
        known.add(key)
        added += 1

    return {"imported": added}
