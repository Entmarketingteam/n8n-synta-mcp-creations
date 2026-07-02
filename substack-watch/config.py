"""Configuration for the Substack Watch cloud service.

All values come from environment variables (injected by Doppler on Railway).
Nothing is hardcoded and no secrets live in this file. See .env.example.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def _clean(value: str | None) -> str:
    return (value or "").strip()


# --- Polling ---------------------------------------------------------------
# How often the background scheduler runs a watch cycle.
POLL_INTERVAL_MINUTES = int(os.environ.get("POLL_INTERVAL_MINUTES", "30"))

# Web server port (Railway sets PORT automatically).
PORT = int(os.environ.get("PORT", "8080"))

# Optional shared secret to protect POST /watch (set WATCH_TOKEN to require it).
WATCH_TOKEN = _clean(os.environ.get("WATCH_TOKEN"))


# --- Publications to watch -------------------------------------------------
# Two ways to configure, checked in order:
#   1. SUBSTACK_PUBLICATIONS env — comma-separated slugs or full feed URLs
#      e.g. "arbitrage-andy, https://example.substack.com/feed"
#   2. publications.json next to this file — a JSON list of the same.
def load_publications() -> list[str]:
    raw = _clean(os.environ.get("SUBSTACK_PUBLICATIONS"))
    if raw:
        return [p.strip() for p in raw.split(",") if p.strip()]

    pub_file = BASE_DIR / "publications.json"
    if pub_file.exists():
        try:
            data = json.loads(pub_file.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return [str(p).strip() for p in data if str(p).strip()]
        except (json.JSONDecodeError, OSError):
            pass
    return []


def feed_url(publication: str) -> str:
    """Normalize a slug or URL into a Substack RSS feed URL."""
    pub = publication.strip()
    if pub.startswith("http://") or pub.startswith("https://"):
        return pub if pub.rstrip("/").endswith("/feed") else pub.rstrip("/") + "/feed"
    # bare slug -> {slug}.substack.com/feed
    return f"https://{pub}.substack.com/feed"


# --- Airtable (state + content sink; optional) -----------------------------
AIRTABLE_API_KEY = _clean(os.environ.get("AIRTABLE_API_KEY"))
AIRTABLE_BASE_ID = _clean(os.environ.get("AIRTABLE_BASE_ID"))
AIRTABLE_TABLE_NAME = _clean(os.environ.get("AIRTABLE_TABLE_NAME")) or "Substack Posts"
AIRTABLE_ENABLED = bool(AIRTABLE_API_KEY and AIRTABLE_BASE_ID)

# --- Local state fallback (used when Airtable is not configured) ------------
STATE_DIR = Path(_clean(os.environ.get("STATE_DIR")) or (BASE_DIR / "state"))
OUTPUT_DIR = Path(_clean(os.environ.get("OUTPUT_DIR")) or (BASE_DIR / "output"))

# --- Slack notifications (optional) ----------------------------------------
SLACK_BOT_TOKEN = _clean(os.environ.get("SLACK_BOT_TOKEN"))
SLACK_CHANNEL_ID = _clean(os.environ.get("SLACK_CHANNEL_ID"))
SLACK_ENABLED = bool(SLACK_BOT_TOKEN and SLACK_CHANNEL_ID)

# --- Paywall bypass (optional) ---------------------------------------------
# If a publication's full text is paywalled, RSS still gives the summary. To
# fetch full content, provide a logged-in Substack cookie string. Server-IP
# friendly, no browser needed. Leave empty to use RSS content only.
SUBSTACK_COOKIE = _clean(os.environ.get("SUBSTACK_COOKIE"))

# --- Resilience / self-healing ---------------------------------------------
# Internal retries with exponential backoff on every network call (feed fetch,
# Airtable, Slack). Matches the repo's 2s/4s/8s/16s git-retry convention.
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", "4"))
RETRY_BASE_DELAY_SECONDS = float(os.environ.get("RETRY_BASE_DELAY_SECONDS", "2"))

# Alert debouncing: only page Slack after a publication has failed this many
# consecutive *cycles* (each cycle already exhausts MAX_RETRIES). Transient
# blips stay silent and self-heal; you're only alerted on sustained failure,
# then once more when it recovers. This kills the broke/recovered flapping.
ALERT_AFTER_FAILURES = int(os.environ.get("ALERT_AFTER_FAILURES", "3"))

# Network
HTTP_TIMEOUT_SECONDS = int(os.environ.get("HTTP_TIMEOUT_SECONDS", "30"))
USER_AGENT = _clean(os.environ.get("USER_AGENT")) or (
    "Mozilla/5.0 (compatible; ENT-SubstackWatch/1.0; +https://entagency.co)"
)
