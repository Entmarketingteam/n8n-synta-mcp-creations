"""Substack RSS client — fetch a publication's feed and normalize posts.

Uses the *public* Substack RSS endpoint (`{pub}.substack.com/feed`), which is
served to any IP with no login, no browser, and no WAF challenge. This is the
whole point of the cloud rebuild: detecting new posts no longer needs the Mac,
Firecrawl, or the agent-server bridge.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any
from xml.etree import ElementTree as ET

import html2text
import requests

import config
from retry import retry_call

# RSS/Atom namespaces Substack uses.
_NS = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
}


@dataclass
class Post:
    guid: str
    title: str
    url: str
    published: str
    author: str
    publication: str
    html: str = ""
    markdown: str = field(default="", repr=False)

    def to_dict(self) -> dict[str, Any]:
        return {
            "guid": self.guid,
            "title": self.title,
            "url": self.url,
            "published": self.published,
            "author": self.author,
            "publication": self.publication,
            "markdown": self.markdown,
        }


_md = html2text.HTML2Text()
_md.body_width = 0  # don't hard-wrap
_md.ignore_images = False
_md.ignore_links = False


def html_to_markdown(html: str) -> str:
    if not html:
        return ""
    return _md.handle(html).strip()


def _text(el: Any) -> str:
    return (el.text or "").strip() if el is not None else ""


def _entry_html(item: Any) -> str:
    # Substack puts full HTML in <content:encoded> for free posts, and a summary
    # in <description>. Prefer the richest available.
    encoded = item.find("content:encoded", _NS)
    if encoded is not None and (encoded.text or "").strip():
        return encoded.text
    return _text(item.find("description"))


def parse_feed(xml: str, publication_slug: str) -> list[Post]:
    """Parse raw RSS XML into Post objects (pure function — easy to test)."""
    root = ET.fromstring(xml)
    channel = root.find("channel")
    if channel is None:
        return []
    pub_name = _text(channel.find("title")) or publication_slug

    posts: list[Post] = []
    for item in channel.findall("item"):
        link = _text(item.find("link"))
        guid = _text(item.find("guid")) or link or _text(item.find("title"))
        if not guid:
            continue
        author = _text(item.find("dc:creator", _NS)) or pub_name
        html = _entry_html(item)
        posts.append(
            Post(
                guid=guid,
                title=_text(item.find("title")) or "Untitled",
                url=link,
                published=_text(item.find("pubDate")),
                author=author,
                publication=pub_name,
                html=html,
                markdown=html_to_markdown(html),
            )
        )
    return posts


def fetch_feed(publication: str) -> list[Post]:
    """Fetch and parse a publication's RSS feed, with retries + backoff.

    Only raises after MAX_RETRIES attempts, so a single network blip never
    surfaces as a failure to the caller.
    """
    url = config.feed_url(publication)
    headers = {"User-Agent": config.USER_AGENT, "Accept": "application/rss+xml, */*"}
    if config.SUBSTACK_COOKIE:
        headers["Cookie"] = config.SUBSTACK_COOKIE

    def _get() -> str:
        resp = requests.get(url, headers=headers, timeout=config.HTTP_TIMEOUT_SECONDS)
        resp.raise_for_status()
        return resp.text

    xml = retry_call(
        _get,
        attempts=config.MAX_RETRIES,
        base_delay=config.RETRY_BASE_DELAY_SECONDS,
        exceptions=(requests.RequestException,),
    )
    return parse_feed(xml, _slug_from(publication))


def _slug_from(publication: str) -> str:
    pub = publication.strip()
    m = re.search(r"https?://([^./]+)\.substack\.com", pub)
    if m:
        return m.group(1)
    return pub.replace("https://", "").replace("http://", "").split(".")[0]
