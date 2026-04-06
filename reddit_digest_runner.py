"""
Run Reddit Digest on a schedule (4x/day by default) or once.
"""
from __future__ import annotations

import os
import time
from datetime import datetime

import pytz

import importlib.util
import sys
from pathlib import Path


def _load_run_once():
    base_dir = Path(__file__).resolve().parent
    module_path = base_dir / "services" / "reddit_digest.py"
    spec = importlib.util.spec_from_file_location("reddit_digest", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load reddit_digest module.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module.run_once


def _parse_hours(raw: str) -> list[int]:
    if not raw:
        return [8, 12, 16, 20]
    hours = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            hour = int(part)
            if 0 <= hour <= 23:
                hours.append(hour)
        except ValueError:
            continue
    return hours or [8, 12, 16, 20]


def main() -> None:
    run_once = _load_run_once()
    if os.getenv("RUN_ONCE", "").lower() == "true":
        path = run_once()
        print(f"[REDDIT_DIGEST] Digest written to {path}")
        return

    # Import scheduler only when needed to avoid extra dependency for RUN_ONCE.
    from apscheduler.schedulers.blocking import BlockingScheduler

    tz_name = os.getenv("DIGEST_TIMEZONE", "Europe/Paris")
    timezone = pytz.timezone(tz_name)
    minute = int(os.getenv("DIGEST_MINUTE", "0"))
    hours = _parse_hours(os.getenv("DIGEST_HOURS", ""))

    scheduler = BlockingScheduler(timezone=timezone)
    for hour in hours:
        scheduler.add_job(
            run_once,
            "cron",
            hour=hour,
            minute=minute,
            id=f"reddit_digest_{hour:02d}{minute:02d}",
            replace_existing=True,
        )

    print(
        f"[REDDIT_DIGEST] Scheduler started at {datetime.now(timezone).isoformat()} "
        f"for hours={hours} minute={minute} tz={tz_name}"
    )
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("[REDDIT_DIGEST] Scheduler stopped.")


if __name__ == "__main__":
    main()
