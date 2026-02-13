"""
Substack scraper: login with credentials, fetch article HTML, extract body, convert to Markdown.
Uses requests + BeautifulSoup for speed; session cookies bypass paywall for paid content.
"""

import re
import logging
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
import html2text

logger = logging.getLogger(__name__)

# Substack login endpoints (try in order)
LOGIN_URL = "https://substack.com/api/v1/login"
EMAIL_LOGIN_URL = "https://substack.com/api/v1/email-login"

# Headers to look like a browser; Substack may check User-Agent
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Selectors for article body (Substack uses various wrappers)
ARTICLE_BODY_SELECTORS = [
    "[data-testid='post-content']",
    ".post-content",
    ".body",
    ".available-content",
    ".markup",
    "article .body",
    ".post",
    "[class*='post-body']",
    "[class*='Body']",
    ".single-post",
]


def login(session: requests.Session, email: str, password: str) -> bool:
    """
    Log into Substack; session will hold cookies (e.g. substack.sid) for authenticated requests.
    Tries /api/v1/login then /api/v1/email-login with JSON or form body.
    """
    session.headers.update(DEFAULT_HEADERS)
    session.headers["Origin"] = "https://substack.com"
    session.headers["Referer"] = "https://substack.com/"

    # Try JSON login first (common for SPA)
    for url in (LOGIN_URL, EMAIL_LOGIN_URL):
        for payload, content_type in (
            ({"email": email, "password": password}, "application/json"),
            ({"email": email, "password": password}, None),  # session may send form
        ):
            headers = {}
            if content_type:
                headers["Content-Type"] = content_type
            try:
                if content_type == "application/json":
                    r = session.post(url, json=payload, timeout=15)
                else:
                    r = session.post(url, data=payload, timeout=15)
            except requests.RequestException as e:
                logger.warning("Login request failed %s: %s", url, e)
                continue
            if r.status_code == 200:
                # Check for Set-Cookie or success indicator
                if session.cookies.get("substack.sid") or "connect.sid" in str(session.cookies):
                    logger.info("Login succeeded via %s", url)
                    return True
                # Some APIs return { "success": true } or similar
                try:
                    data = r.json()
                    if data.get("success") or data.get("user") or data.get("token"):
                        return True
                except Exception:
                    pass
    return False


def extract_article_html(soup: BeautifulSoup) -> str:
    """Find main article body in parsed HTML; return inner HTML string."""
    for selector in ARTICLE_BODY_SELECTORS:
        node = soup.select_one(selector)
        if node:
            return str(node)
    # Fallback: first article or main content
    article = soup.find("article") or soup.find("main")
    if article:
        return str(article)
    # Last resort: body
    body = soup.find("body")
    if body:
        return str(body)
    return ""


def html_to_markdown(html: str) -> str:
    """Convert article HTML to clean Markdown (headers, bold, lists preserved)."""
    if not html or not html.strip():
        return ""
    h2t = html2text.HTML2Text()
    h2t.ignore_links = False
    h2t.ignore_images = False
    h2t.body_width = 0  # no wrap
    h2t.ignore_emphasis = False
    h2t.ignore_tables = False
    md = h2t.handle(html)
    # Normalize excessive newlines
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    return md


def scrape_substack_article(url: str, email: str, password: str) -> tuple[str, str, str | None]:
    """
    Log in to Substack, fetch the article URL, extract body, convert to Markdown.
    Returns (markdown_content, author_or_pub, error_message). error_message is None on success.
    """
    if not url or not url.strip():
        return "", "", "Missing URL"
    url = url.strip()
    if "substack.com" not in url:
        return "", "", "URL must be a Substack article"

    session = requests.Session()
    if not login(session, email, password):
        return "", "", "Substack login failed (check SUBSTACK_EMAIL and SUBSTACK_PASSWORD)"

    try:
        r = session.get(url, timeout=30, headers=DEFAULT_HEADERS)
        r.raise_for_status()
    except requests.RequestException as e:
        logger.exception("Fetch failed for %s: %s", url, e)
        return "", "", f"Fetch failed: {e}"

    soup = BeautifulSoup(r.text, "html.parser")
    author_or_pub = extract_author_or_publication(r.text, url)

    # Remove noise: nav, footer, subscribe CTA, scripts
    for tag in soup.find_all(["script", "style", "nav", "footer", "aside"]):
        tag.decompose()
    for tag in soup.find_all(class_=re.compile(r"subscribe|paywall|cta|newsletter-signup", re.I)):
        tag.decompose()

    article_html = extract_article_html(soup)
    if not article_html:
        return "", author_or_pub, "Could not find article body in page (selectors may have changed)"

    markdown = html_to_markdown(article_html)
    if not markdown.strip():
        return "", author_or_pub, "Article body converted to empty Markdown"

    return markdown, author_or_pub, None


def extract_author_or_publication(html: str, url: str) -> str:
    """Optional: extract author or publication name for Airtable metadata."""
    soup = BeautifulSoup(html, "html.parser")
    # Common Substack patterns
    for selector in (
        "[data-testid='publication-name']",
        ".publication-name",
        ".post-author",
        "meta[property='og:site_name']",
        "meta[name='author']",
    ):
        el = soup.select_one(selector)
        if el:
            if el.name == "meta":
                return (el.get("content") or "").strip()
            return (el.get_text() or "").strip()
    # From URL: subdomain is often the publication
    try:
        host = urlparse(url).netloc
        if host.endswith(".substack.com"):
            return host.replace(".substack.com", "").strip() or "Substack"
    except Exception:
        pass
    return ""
