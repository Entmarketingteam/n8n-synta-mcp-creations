"""State + content storage.

Two backends, selected automatically:
  * AirtableStore   — when AIRTABLE_API_KEY + AIRTABLE_BASE_ID are set. Dedup by
                      the post GUID and writes Markdown into the table. Mirrors
                      the existing Substack Ingestor's Airtable-first design.
  * LocalStore      — JSON state file + Markdown files on disk. Zero external
                      deps, used for local dry-runs and tests.

Both expose the same tiny interface: seen(guid) / save(post).
"""
from __future__ import annotations

import json
from pathlib import Path

import requests

import config
from retry import retry_call
from substack_client import Post


def _airtable_request(method: str, url: str, headers: dict, **kwargs):
    """One Airtable HTTP call with retries + exponential backoff."""

    def _do():
        r = requests.request(
            method, url, headers=headers, timeout=config.HTTP_TIMEOUT_SECONDS, **kwargs
        )
        r.raise_for_status()
        return r

    return retry_call(
        _do,
        attempts=config.MAX_RETRIES,
        base_delay=config.RETRY_BASE_DELAY_SECONDS,
        exceptions=(requests.RequestException,),
    )


class LocalStore:
    def __init__(self, state_dir: Path, output_dir: Path) -> None:
        self.state_file = Path(state_dir) / "seen.json"
        self.output_dir = Path(output_dir)
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._seen: set[str] = set()
        if self.state_file.exists():
            try:
                self._seen = set(json.loads(self.state_file.read_text("utf-8")))
            except (json.JSONDecodeError, OSError):
                self._seen = set()

    def seen(self, guid: str) -> bool:
        return guid in self._seen

    def save(self, post: Post) -> None:
        safe = "".join(c if c.isalnum() or c in "-_ " else "_" for c in post.title)[:80]
        pub_dir = self.output_dir / post.publication
        pub_dir.mkdir(parents=True, exist_ok=True)
        (pub_dir / f"{safe or post.guid[:16]}.md").write_text(
            f"# {post.title}\n\n"
            f"> {post.publication} — {post.author} — {post.published}\n>\n"
            f"> {post.url}\n\n{post.markdown}\n",
            encoding="utf-8",
        )
        self._seen.add(post.guid)
        self.state_file.write_text(json.dumps(sorted(self._seen)), encoding="utf-8")


class AirtableStore:
    """Airtable-backed store using raw REST (no SDK), matching repo convention."""

    def __init__(self) -> None:
        self.base = config.AIRTABLE_BASE_ID
        self.table = config.AIRTABLE_TABLE_NAME
        self.headers = {
            "Authorization": f"Bearer {config.AIRTABLE_API_KEY}",
            "Content-Type": "application/json",
        }
        self._seen_cache: set[str] | None = None

    @property
    def _url(self) -> str:
        from urllib.parse import quote

        return f"https://api.airtable.com/v0/{self.base}/{quote(self.table)}"

    def _load_seen(self) -> set[str]:
        seen: set[str] = set()
        params = {"fields[]": "GUID", "pageSize": 100}
        offset = None
        while True:
            if offset:
                params["offset"] = offset
            r = _airtable_request("GET", self._url, self.headers, params=params)
            data = r.json()
            for rec in data.get("records", []):
                guid = rec.get("fields", {}).get("GUID")
                if guid:
                    seen.add(guid)
            offset = data.get("offset")
            if not offset:
                break
        return seen

    def seen(self, guid: str) -> bool:
        if self._seen_cache is None:
            self._seen_cache = self._load_seen()
        return guid in self._seen_cache

    def save(self, post: Post) -> None:
        payload = {
            "fields": {
                "GUID": post.guid,
                "Title": post.title,
                "URL": post.url,
                "Publication": post.publication,
                "Author/Pub": post.author,
                "Published": post.published,
                "Content": post.markdown,
                "Status": {"name": "Done"},
            },
            "typecast": True,
        }
        _airtable_request("POST", self._url, self.headers, json=payload)
        if self._seen_cache is not None:
            self._seen_cache.add(post.guid)


def get_store():
    if config.AIRTABLE_ENABLED:
        return AirtableStore()
    return LocalStore(config.STATE_DIR, config.OUTPUT_DIR)
