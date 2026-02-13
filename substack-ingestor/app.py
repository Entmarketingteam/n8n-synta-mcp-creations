"""
Flask app for Substack → Airtable ingestion.
POST /scrape: accepts record_id and url; runs scraper in background and updates Airtable.
Secrets: SUBSTACK_EMAIL, SUBSTACK_PASSWORD, AIRTABLE_API_KEY, AIRTABLE_BASE_ID (from Doppler).
"""

import os
import logging
from threading import Thread

from flask import Flask, request, jsonify

from scraper import scrape_substack_article

# Airtable: table name for the ingestion base (configurable via env)
AIRTABLE_TABLE_NAME = os.environ.get("AIRTABLE_TABLE_NAME", "Substack Articles")

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _get_env(name: str) -> str:
    v = os.environ.get(name)
    if not v or not str(v).strip():
        raise ValueError(f"Missing required env: {name}")
    return str(v).strip()


def _run_scrape_and_update(record_id: str, url: str) -> None:
    """Background task: scrape Substack, then update Airtable record."""
    try:
        email = _get_env("SUBSTACK_EMAIL")
        password = _get_env("SUBSTACK_PASSWORD")
        api_key = _get_env("AIRTABLE_API_KEY")
        base_id = _get_env("AIRTABLE_BASE_ID")
    except ValueError as e:
        logger.error("Config: %s", e)
        _update_airtable_record(record_id, "", "", "Error", str(e))
        return

    try:
        from pyairtable import Api
        api = Api(api_key)
        table = api.table(base_id, AIRTABLE_TABLE_NAME)
    except Exception as e:
        logger.exception("Airtable init: %s", e)
        _update_airtable_record(record_id, "", "", "Error", f"Airtable init: {e}")
        return

    markdown, author_or_pub, err = scrape_substack_article(url, email, password)
    if err:
        logger.warning("Scrape failed for %s: %s", url, err)
        _update_airtable_record(record_id, "", author_or_pub, "Error", err)
        return

    _update_airtable_record(record_id, markdown, author_or_pub, "Done", None, table=table)


def _update_airtable_record(
    record_id: str,
    content: str,
    author_or_pub: str,
    status: str,
    error_detail: str | None,
    *,
    table=None,
) -> None:
    """Update Airtable record: Content, Status, optionally Author/Pub and error note."""
    if table is None:
        try:
            from pyairtable import Api
            api = Api(_get_env("AIRTABLE_API_KEY"))
            table = api.table(_get_env("AIRTABLE_BASE_ID"), AIRTABLE_TABLE_NAME)
        except Exception as e:
            logger.exception("Airtable update failed (no table): %s", e)
            return

    fields = {
        "Content": content if status != "Error" else (error_detail or "Scrape failed"),
        "Status": status,
    }
    if author_or_pub:
        fields["Author/Pub"] = author_or_pub

    try:
        table.update(record_id, fields)
        logger.info("Updated Airtable record %s -> Status=%s", record_id, status)
    except Exception as e:
        logger.exception("Airtable update failed: %s", e)


@app.route("/health", methods=["GET"])
def health():
    """Liveness/readiness for Railway."""
    return jsonify({"status": "ok"})


@app.route("/scrape", methods=["POST"])
def scrape():
    """
    Request body: { "record_id": "recXXX", "url": "https://...substack.com/..." }
    Responds immediately; runs scraper in background and updates Airtable when done.
    """
    data = request.get_json(silent=True) or {}
    record_id = (data.get("record_id") or "").strip()
    url = (data.get("url") or "").strip()

    if not record_id:
        return jsonify({"ok": False, "error": "Missing record_id"}), 400
    if not url:
        return jsonify({"ok": False, "error": "Missing url"}), 400

    thread = Thread(target=_run_scrape_and_update, args=(record_id, url))
    thread.daemon = True
    thread.start()

    return jsonify({
        "ok": True,
        "message": "Scrape started; Airtable will be updated when complete.",
        "record_id": record_id,
    }), 202
