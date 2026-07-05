"""Optional Slack notification when new posts are ingested.

Uses the same SLACK_BOT_TOKEN / SLACK_CHANNEL_ID convention as the
creator-metrics staleness guard. No-ops silently if Slack is not configured,
so the watcher never fails just because notifications are off.
"""
from __future__ import annotations

import requests

import config
from substack_client import Post


def post_new(posts: list[Post]) -> None:
    if not config.SLACK_ENABLED or not posts:
        return
    lines = ["\U0001F4EC *New Substack posts ingested:*"]
    for p in posts[:20]:
        link = f"<{p.url}|{p.title}>" if p.url else p.title
        lines.append(f"• {link} — _{p.publication}_")
    if len(posts) > 20:
        lines.append(f"…and {len(posts) - 20} more")
    _send("\n".join(lines))


def post_error(publication: str, error: str) -> None:
    if not config.SLACK_ENABLED:
        return
    _send(
        f"🔴 Substack Watch: *{publication}* has failed "
        f"{config.ALERT_AFTER_FAILURES}+ cycles in a row.\n"
        f"Last error: `{error}`\n"
        f"_Retries + backoff already exhausted. Will auto-recover and notify "
        f"when the feed is healthy again._"
    )


def post_recovered(publication: str) -> None:
    if not config.SLACK_ENABLED:
        return
    _send(f"✅ Substack Watch recovered: *{publication}* is healthy again.")


def _send(text: str) -> None:
    try:
        requests.post(
            "https://slack.com/api/chat.postMessage",
            headers={"Authorization": f"Bearer {config.SLACK_BOT_TOKEN}"},
            json={"channel": config.SLACK_CHANNEL_ID, "text": text},
            timeout=config.HTTP_TIMEOUT_SECONDS,
        )
    except requests.RequestException:
        # Notifications are best-effort; never crash the watch cycle over Slack.
        pass
