"""Core watch cycle: for each publication, fetch RSS, ingest new posts.

Self-healing behavior:
  * Each feed fetch already retries with exponential backoff (see
    substack_client.fetch_feed), so transient network errors are absorbed.
  * A per-publication FailureTracker debounces alerts: Slack is only paged
    after ALERT_AFTER_FAILURES consecutive failing cycles, and exactly one
    "recovered" is sent when it heals. Transient blips are silent.
  * Per-publication failures are isolated — one dead feed can't abort the
    others (the Mac job exited 1 on the first error; this one never does).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import config
import notify
from health import FailureTracker
from substack_client import Post, fetch_feed


@dataclass
class WatchResult:
    publications: int = 0
    checked: int = 0
    new_posts: list[Post] = field(default_factory=list)
    errors: list[dict[str, str]] = field(default_factory=list)
    alerted: list[str] = field(default_factory=list)
    recovered: list[str] = field(default_factory=list)

    @property
    def new_count(self) -> int:
        return len(self.new_posts)

    def summary(self) -> dict:
        return {
            "publications": self.publications,
            "checked": self.checked,
            "new": self.new_count,
            "errors": self.errors,
            "alerted": self.alerted,
            "recovered": self.recovered,
            "new_posts": [
                {"title": p.title, "publication": p.publication, "url": p.url}
                for p in self.new_posts
            ],
        }


def run_cycle(store=None, tracker: FailureTracker | None = None) -> WatchResult:
    from store import get_store  # local import so tests can inject a fake store

    store = store or get_store()
    tracker = tracker or FailureTracker()
    result = WatchResult()
    publications = config.load_publications()
    result.publications = len(publications)

    for pub in publications:
        try:
            posts = fetch_feed(pub)  # already retried with backoff internally
        except Exception as exc:  # noqa: BLE001 — isolate per-feed failure
            result.errors.append({"publication": pub, "error": str(exc)})
            # Debounced: only page after sustained failure, and only once.
            if tracker.record_failure(pub):
                result.alerted.append(pub)
                notify.post_error(pub, str(exc))
            continue

        # Feed is healthy this cycle — clear failure state, page once if we
        # had previously alerted that it was down.
        if tracker.record_success(pub):
            result.recovered.append(pub)
            notify.post_recovered(pub)

        for post in posts:
            result.checked += 1
            if store.seen(post.guid):
                continue
            try:
                store.save(post)
            except Exception as exc:  # noqa: BLE001 — don't lose the whole cycle
                result.errors.append({"publication": pub, "error": f"save: {exc}"})
                continue
            result.new_posts.append(post)

    if result.new_posts:
        notify.post_new(result.new_posts)
    return result
