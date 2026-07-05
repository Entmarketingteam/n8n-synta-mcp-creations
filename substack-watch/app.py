"""Substack Watch — always-on cloud service (Railway).

Replaces the Mac LaunchAgent `com.entagency.substack-watch`. Runs a background
scheduler that polls each configured Substack publication's RSS feed on an
interval and ingests new posts. Exposes:

  GET  /health  -> liveness + last-run heartbeat (for the staleness guard)
  POST /watch   -> run one cycle now (manual trigger or external cron)

Because it runs on a server IP with no browser, no Firecrawl, and no agent
bridge, there is nothing to flap: no Mac sleep, no WAF, no lost session.
"""
from __future__ import annotations

import os
import threading
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask, jsonify, request

import config
from health import FailureTracker
from watcher import run_cycle

app = Flask(__name__)

# In-memory heartbeat — last cycle result, surfaced via /health.
_last_run: dict = {"at": None, "ok": None, "summary": None}
_run_lock = threading.Lock()
# Shared across cycles so failure counts / alert debouncing persist.
_tracker = FailureTracker()


def _do_cycle() -> dict:
    """Run a single watch cycle under a lock so overlapping triggers serialize."""
    with _run_lock:
        result = run_cycle(tracker=_tracker)
        summary = result.summary()
        _last_run.update(
            at=datetime.now(timezone.utc).isoformat(),
            ok=not result.errors,
            summary=summary,
        )
        return summary


@app.get("/health")
def health():
    return jsonify(
        {
            "service": "substack-watch",
            "status": "ok",
            "poll_interval_minutes": config.POLL_INTERVAL_MINUTES,
            "publications": len(config.load_publications()),
            "airtable": config.AIRTABLE_ENABLED,
            "slack": config.SLACK_ENABLED,
            "feed_health": _tracker.snapshot(),
            "last_run": _last_run,
        }
    )


@app.post("/watch")
def watch():
    if config.WATCH_TOKEN:
        token = request.headers.get("X-Watch-Token", "") or request.args.get("token", "")
        if token != config.WATCH_TOKEN:
            return jsonify({"ok": False, "error": "unauthorized"}), 401
    try:
        summary = _do_cycle()
        return jsonify({"ok": True, "summary": summary})
    except Exception as exc:  # noqa: BLE001
        return jsonify({"ok": False, "error": str(exc)}), 500


def _start_scheduler() -> BackgroundScheduler | None:
    # Guard against the reloader / gunicorn workers double-starting the job.
    if os.environ.get("DISABLE_SCHEDULER") == "1":
        return None
    scheduler = BackgroundScheduler(daemon=True, timezone="UTC")
    scheduler.add_job(
        _do_cycle,
        "interval",
        minutes=config.POLL_INTERVAL_MINUTES,
        id="substack-watch-cycle",
        max_instances=1,
        coalesce=True,
        next_run_time=datetime.now(timezone.utc),  # run once on boot
    )
    scheduler.start()
    return scheduler


# Start the scheduler at import time so it runs under gunicorn too.
scheduler = _start_scheduler()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.PORT)
