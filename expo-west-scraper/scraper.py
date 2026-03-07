#!/usr/bin/env python3
"""
Expo West Exhibitor Scraper
============================
Scrapes exhibitor data from Natural Products Expo West via the
SmallWorldLabs / Swapcard exhibitor directory.

Supports both the 2024 archive and 2026 live directory.

Usage:
    python scraper.py                          # Scrape 2026 exhibitors (default)
    python scraper.py --year 2024              # Scrape 2024 archive
    python scraper.py --year 2026 --organic    # Only organic exhibitors
    python scraper.py --output exhibitors.csv  # Custom output file
    python scraper.py --use-playwright         # Use headless browser (slower but more reliable)
"""

import argparse
import csv
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field, asdict
from typing import Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URLS = {
    2024: "https://expowest24.smallworldlabs.com",
    2026: "https://expowest26.smallworldlabs.com",
}

EXHIBITOR_LIST_PATHS = {
    "all": "/exhibitors",
    "organic": "/organic-exhibitors",
    "first_time": "/first-time-exhibitors",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass
class Exhibitor:
    name: str = ""
    booth: str = ""
    description: str = ""
    category: str = ""
    website: str = ""
    phone: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    country: str = ""
    profile_url: str = ""
    logo_url: str = ""
    tags: str = ""


# ---------------------------------------------------------------------------
# Requests-based scraper (fast, works when pages are server-rendered)
# ---------------------------------------------------------------------------


class RequestsScraper:
    """Scrapes exhibitor data using requests + BeautifulSoup."""

    def __init__(self, base_url: str, delay: float = 1.0):
        self.base_url = base_url
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def _get(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch a URL and return parsed HTML."""
        try:
            logger.debug("GET %s", url)
            resp = self.session.get(url, timeout=30)
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "lxml")
        except requests.RequestException as exc:
            logger.warning("Failed to fetch %s: %s", url, exc)
            return None

    def _extract_api_data(self, soup: BeautifulSoup) -> list[dict]:
        """Try to find embedded JSON data or API endpoints in the page."""
        exhibitors = []

        # Strategy 1: Look for JSON-LD or embedded data in script tags
        for script in soup.find_all("script"):
            text = script.string or ""
            # Look for JSON arrays of exhibitor data
            for pattern in [
                r"exhibitors\s*[:=]\s*(\[.*?\])\s*[;,]",
                r"window\.__DATA__\s*=\s*({.*?})\s*;",
                r"window\.__INITIAL_STATE__\s*=\s*({.*?})\s*;",
                r'"items"\s*:\s*(\[.*?\])',
            ]:
                match = re.search(pattern, text, re.DOTALL)
                if match:
                    try:
                        data = json.loads(match.group(1))
                        if isinstance(data, list):
                            exhibitors.extend(data)
                        elif isinstance(data, dict):
                            # Traverse nested structure
                            for key in ("exhibitors", "items", "data", "results"):
                                if key in data and isinstance(data[key], list):
                                    exhibitors.extend(data[key])
                                    break
                    except json.JSONDecodeError:
                        continue

        return exhibitors

    def _parse_exhibitor_card(self, card) -> Optional[Exhibitor]:
        """Parse a single exhibitor card/row from the listing page."""
        ex = Exhibitor()

        # Try common CSS patterns for exhibitor cards
        name_el = (
            card.find("h3")
            or card.find("h4")
            or card.find("h2")
            or card.find(class_=re.compile(r"name|title|company", re.I))
        )
        if name_el:
            ex.name = name_el.get_text(strip=True)

        # Link to profile page
        link = card.find("a", href=True)
        if link:
            ex.profile_url = urljoin(self.base_url, link["href"])
            if not ex.name:
                ex.name = link.get_text(strip=True)

        # Booth number
        booth_el = card.find(string=re.compile(r"booth|stand", re.I))
        if booth_el:
            booth_text = booth_el.strip() if isinstance(booth_el, str) else booth_el.get_text(strip=True)
            booth_match = re.search(r"(?:booth|stand)\s*[:#]?\s*(\S+)", booth_text, re.I)
            if booth_match:
                ex.booth = booth_match.group(1)
        # Also check for booth in dedicated elements
        booth_span = card.find(class_=re.compile(r"booth", re.I))
        if booth_span and not ex.booth:
            ex.booth = booth_span.get_text(strip=True)

        # Category / tags
        cat_el = card.find(class_=re.compile(r"categ|tag|badge|label", re.I))
        if cat_el:
            ex.category = cat_el.get_text(strip=True)

        # Description
        desc_el = card.find(class_=re.compile(r"desc|summary|snippet", re.I))
        if desc_el:
            ex.description = desc_el.get_text(strip=True)[:500]

        # Logo
        img = card.find("img", src=True)
        if img:
            ex.logo_url = urljoin(self.base_url, img["src"])

        return ex if ex.name else None

    def _find_next_page(self, soup: BeautifulSoup, current_url: str) -> Optional[str]:
        """Find the next page link for pagination."""
        # Standard pagination patterns
        for selector in [
            "a.next",
            "a[rel='next']",
            "li.next a",
            ".pagination a.next",
            "a[aria-label='Next']",
            "a[title='Next']",
        ]:
            link = soup.select_one(selector)
            if link and link.get("href"):
                return urljoin(current_url, link["href"])

        # Look for numbered pagination - find current page and get next
        active = soup.select_one(".pagination .active, .page-item.active")
        if active:
            next_sib = active.find_next_sibling()
            if next_sib:
                link = next_sib.find("a", href=True)
                if link:
                    return urljoin(current_url, link["href"])

        return None

    def scrape_listing(self, path: str) -> list[Exhibitor]:
        """Scrape the exhibitor listing pages."""
        url = self.base_url + path
        all_exhibitors: list[Exhibitor] = []
        page_num = 1

        while url:
            logger.info("Scraping page %d: %s", page_num, url)
            soup = self._get(url)
            if not soup:
                break

            # Try embedded API data first
            api_data = self._extract_api_data(soup)
            if api_data:
                logger.info("Found %d exhibitors via embedded data", len(api_data))
                for item in api_data:
                    ex = Exhibitor(
                        name=item.get("name", item.get("title", "")),
                        booth=str(item.get("booth", item.get("boothNumber", ""))),
                        description=item.get("description", item.get("bio", ""))[:500],
                        category=item.get("category", ""),
                        website=item.get("website", item.get("url", "")),
                        profile_url=item.get("profileUrl", item.get("link", "")),
                        logo_url=item.get("logo", item.get("logoUrl", item.get("image", ""))),
                    )
                    if ex.name:
                        all_exhibitors.append(ex)
                # If we found embedded data, likely all on one load
                break

            # Fall back to HTML parsing
            # Try common container patterns
            cards = []
            for selector in [
                ".exhibitor-card",
                ".exhibitor-item",
                ".exhibitor-row",
                ".exhibitor",
                "[data-exhibitor]",
                ".card",
                ".list-item",
                "tr[data-id]",
                ".result-item",
                ".search-result",
            ]:
                cards = soup.select(selector)
                if cards:
                    logger.info("Found %d cards with selector '%s'", len(cards), selector)
                    break

            if not cards:
                # Try finding any repeated structure that looks like listings
                main = soup.find("main") or soup.find(id="content") or soup.find(class_="content") or soup.body
                if main:
                    # Look for repeated div/article/li patterns
                    for tag in ["article", "div", "li"]:
                        candidates = main.find_all(tag, recursive=False)
                        if len(candidates) > 3:
                            cards = candidates
                            break

            for card in cards:
                ex = self._parse_exhibitor_card(card)
                if ex:
                    all_exhibitors.append(ex)

            if not cards and not api_data:
                logger.warning(
                    "No exhibitor cards found on page %d. The page may require "
                    "JavaScript rendering -- try --use-playwright",
                    page_num,
                )
                break

            # Pagination
            next_url = self._find_next_page(soup, url)
            if next_url and next_url != url:
                url = next_url
                page_num += 1
                time.sleep(self.delay)
            else:
                url = None

        return all_exhibitors

    def scrape_detail(self, exhibitor: Exhibitor) -> Exhibitor:
        """Enrich an exhibitor with data from its detail page."""
        if not exhibitor.profile_url:
            return exhibitor

        soup = self._get(exhibitor.profile_url)
        if not soup:
            return exhibitor

        # Try to extract additional fields from the detail page
        # Description
        if not exhibitor.description:
            desc = soup.find(class_=re.compile(r"desc|about|bio|summary", re.I))
            if desc:
                exhibitor.description = desc.get_text(strip=True)[:500]

        # Website
        if not exhibitor.website:
            link = soup.find("a", href=re.compile(r"^https?://(?!expowest|smallworld)", re.I))
            if link:
                exhibitor.website = link["href"]

        # Phone
        if not exhibitor.phone:
            phone_el = soup.find(string=re.compile(r"\(\d{3}\)\s*\d{3}-\d{4}|\+\d"))
            if phone_el:
                exhibitor.phone = phone_el.strip()

        # Address
        if not exhibitor.address:
            addr = soup.find(class_=re.compile(r"address|location", re.I))
            if addr:
                exhibitor.address = addr.get_text(strip=True)

        # Categories / tags
        if not exhibitor.category:
            tags = soup.find_all(class_=re.compile(r"tag|badge|categ|label", re.I))
            if tags:
                exhibitor.tags = ", ".join(t.get_text(strip=True) for t in tags[:10])

        time.sleep(self.delay * 0.5)
        return exhibitor


# ---------------------------------------------------------------------------
# Playwright-based scraper (handles JS-rendered pages)
# ---------------------------------------------------------------------------


class PlaywrightScraper:
    """Scrapes exhibitor data using a headless browser via Playwright."""

    def __init__(self, base_url: str, delay: float = 2.0):
        self.base_url = base_url
        self.delay = delay

    def scrape_listing(self, path: str) -> list[Exhibitor]:
        """Scrape exhibitor listing using Playwright for JS-rendered content."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            logger.error(
                "Playwright not installed. Run:\n"
                "  pip install playwright && python -m playwright install chromium"
            )
            sys.exit(1)

        url = self.base_url + path
        all_exhibitors: list[Exhibitor] = []
        api_responses: list[dict] = []

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=HEADERS["User-Agent"],
                viewport={"width": 1920, "height": 1080},
            )

            page = context.new_page()

            # Intercept API/XHR responses to capture exhibitor data
            def handle_response(response):
                content_type = response.headers.get("content-type", "")
                if "json" in content_type:
                    try:
                        data = response.json()
                        # Check if this response contains exhibitor data
                        if isinstance(data, list) and len(data) > 0:
                            api_responses.append({"url": response.url, "data": data})
                        elif isinstance(data, dict):
                            for key in ("exhibitors", "items", "data", "results", "records"):
                                if key in data and isinstance(data[key], list):
                                    api_responses.append({"url": response.url, "data": data[key]})
                                    break
                    except Exception:
                        pass

            page.on("response", handle_response)

            logger.info("Loading page with Playwright: %s", url)
            page.goto(url, wait_until="networkidle", timeout=60000)

            # Wait for content to render
            page.wait_for_timeout(3000)

            # Check if we captured any API responses with exhibitor data
            if api_responses:
                logger.info(
                    "Captured %d API responses with exhibitor data",
                    len(api_responses),
                )
                for resp in api_responses:
                    for item in resp["data"]:
                        if isinstance(item, dict):
                            ex = Exhibitor(
                                name=item.get("name", item.get("title", item.get("companyName", ""))),
                                booth=str(item.get("booth", item.get("boothNumber", item.get("stand", "")))),
                                description=str(item.get("description", item.get("bio", "")))[:500],
                                category=item.get("category", item.get("type", "")),
                                website=item.get("website", item.get("url", item.get("websiteUrl", ""))),
                                profile_url=item.get("profileUrl", item.get("link", "")),
                                logo_url=item.get("logo", item.get("logoUrl", item.get("image", ""))),
                            )
                            if ex.name:
                                all_exhibitors.append(ex)

            # If no API data captured, parse the rendered HTML
            if not all_exhibitors:
                logger.info("No API data captured, parsing rendered HTML...")
                html = page.content()
                soup = BeautifulSoup(html, "lxml")
                req_scraper = RequestsScraper(self.base_url)
                # Use the HTML parsing logic from RequestsScraper
                cards = []
                for selector in [
                    ".exhibitor-card",
                    ".exhibitor-item",
                    ".exhibitor",
                    "[data-exhibitor]",
                    ".card",
                    ".list-item",
                    ".result-item",
                ]:
                    cards = soup.select(selector)
                    if cards:
                        break

                for card in cards:
                    ex = req_scraper._parse_exhibitor_card(card)
                    if ex:
                        all_exhibitors.append(ex)

            # Handle pagination - try scrolling or clicking "Load More" / "Next"
            if not api_responses:
                max_pages = 100
                for page_num in range(2, max_pages + 1):
                    # Try "Load More" button
                    load_more = page.query_selector(
                        "button:has-text('Load More'), "
                        "button:has-text('Show More'), "
                        "a:has-text('Load More'), "
                        "a:has-text('Next')"
                    )
                    if load_more and load_more.is_visible():
                        logger.info("Clicking load more / next (page %d)", page_num)
                        load_more.click()
                        page.wait_for_timeout(int(self.delay * 1000))
                        page.wait_for_load_state("networkidle")
                    else:
                        # Try infinite scroll
                        prev_height = page.evaluate("document.body.scrollHeight")
                        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                        page.wait_for_timeout(2000)
                        new_height = page.evaluate("document.body.scrollHeight")
                        if new_height == prev_height:
                            break

                    # Parse new content
                    html = page.content()
                    soup = BeautifulSoup(html, "lxml")
                    for selector in [
                        ".exhibitor-card",
                        ".exhibitor-item",
                        ".exhibitor",
                        ".card",
                        ".list-item",
                    ]:
                        cards = soup.select(selector)
                        if cards:
                            break
                    seen_names = {e.name for e in all_exhibitors}
                    new_count = 0
                    req_scraper = RequestsScraper(self.base_url)
                    for card in cards:
                        ex = req_scraper._parse_exhibitor_card(card)
                        if ex and ex.name not in seen_names:
                            all_exhibitors.append(ex)
                            seen_names.add(ex.name)
                            new_count += 1
                    if new_count == 0:
                        break
                    logger.info("Page %d: found %d new exhibitors", page_num, new_count)

            browser.close()

        return all_exhibitors


# ---------------------------------------------------------------------------
# Swapcard GraphQL scraper (direct API access if token is available)
# ---------------------------------------------------------------------------


class SwapcardGraphQLScraper:
    """
    Scrape exhibitors directly via the Swapcard GraphQL Content API.

    Requires:
      - SWAPCARD_API_TOKEN env var (organizer API key)
      - SWAPCARD_EVENT_ID env var (event ID from the Swapcard dashboard)

    If these are not set, falls back to the HTML-based scrapers.
    """

    ENDPOINT = "https://developer.swapcard.com/event-admin/graphql"

    EXHIBITORS_QUERY = """
    query GetExhibitors($eventId: String!, $page: Int!, $pageSize: Int!) {
        exhibitors(eventId: $eventId, page: $page, pageSize: $pageSize) {
            id
            name
            description
            website
            logoUrl
            socialNetworks {
                type
                url
            }
            categories {
                name
            }
            withEvent {
                booth
            }
            address {
                formattedAddress
                city
                country
            }
            phone
        }
    }
    """

    def __init__(self):
        self.token = os.environ.get("SWAPCARD_API_TOKEN", "")
        self.event_id = os.environ.get("SWAPCARD_EVENT_ID", "")

    @property
    def available(self) -> bool:
        return bool(self.token and self.event_id)

    def scrape_listing(self, path: str = "") -> list[Exhibitor]:
        if not self.available:
            logger.warning("Swapcard API token or event ID not set. Skipping GraphQL scraper.")
            return []

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

        all_exhibitors: list[Exhibitor] = []
        page = 1
        page_size = 100

        while True:
            logger.info("Fetching exhibitors via GraphQL (page %d)...", page)
            payload = {
                "query": self.EXHIBITORS_QUERY,
                "variables": {
                    "eventId": self.event_id,
                    "page": page,
                    "pageSize": page_size,
                },
            }

            try:
                resp = requests.post(
                    self.ENDPOINT, json=payload, headers=headers, timeout=30
                )
                resp.raise_for_status()
                data = resp.json()
            except requests.RequestException as exc:
                logger.error("GraphQL request failed: %s", exc)
                break

            exhibitors_data = data.get("data", {}).get("exhibitors", [])
            if not exhibitors_data:
                break

            for item in exhibitors_data:
                address = item.get("address") or {}
                categories = item.get("categories") or []
                with_event = item.get("withEvent") or {}

                ex = Exhibitor(
                    name=item.get("name", ""),
                    booth=with_event.get("booth", ""),
                    description=(item.get("description") or "")[:500],
                    category=", ".join(c.get("name", "") for c in categories),
                    website=item.get("website", ""),
                    phone=item.get("phone", ""),
                    address=address.get("formattedAddress", ""),
                    city=address.get("city", ""),
                    country=address.get("country", ""),
                    logo_url=item.get("logoUrl", ""),
                )
                if ex.name:
                    all_exhibitors.append(ex)

            if len(exhibitors_data) < page_size:
                break
            page += 1
            time.sleep(0.5)

        return all_exhibitors


# ---------------------------------------------------------------------------
# CSV output
# ---------------------------------------------------------------------------


def write_csv(exhibitors: list[Exhibitor], output_path: str):
    """Write exhibitor data to CSV."""
    if not exhibitors:
        logger.warning("No exhibitors to write.")
        return

    fieldnames = [
        "name",
        "booth",
        "category",
        "description",
        "website",
        "phone",
        "address",
        "city",
        "state",
        "country",
        "profile_url",
        "logo_url",
        "tags",
    ]

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for ex in exhibitors:
            writer.writerow(asdict(ex))

    logger.info("Wrote %d exhibitors to %s", len(exhibitors), output_path)


def write_json(exhibitors: list[Exhibitor], output_path: str):
    """Write exhibitor data to JSON."""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump([asdict(ex) for ex in exhibitors], f, indent=2, ensure_ascii=False)
    logger.info("Wrote %d exhibitors to %s", len(exhibitors), output_path)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Scrape Natural Products Expo West exhibitor directory"
    )
    parser.add_argument(
        "--year",
        type=int,
        choices=[2024, 2026],
        default=2026,
        help="Which year's directory to scrape (default: 2026)",
    )
    parser.add_argument(
        "--organic",
        action="store_true",
        help="Only scrape organic exhibitors",
    )
    parser.add_argument(
        "--first-time",
        action="store_true",
        help="Only scrape first-time exhibitors",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output file path (default: output/expowest-{year}-exhibitors.csv)",
    )
    parser.add_argument(
        "--format",
        choices=["csv", "json", "both"],
        default="csv",
        help="Output format (default: csv)",
    )
    parser.add_argument(
        "--use-playwright",
        action="store_true",
        help="Use Playwright headless browser (slower but handles JS-rendered pages)",
    )
    parser.add_argument(
        "--use-graphql",
        action="store_true",
        help="Use Swapcard GraphQL API (requires SWAPCARD_API_TOKEN and SWAPCARD_EVENT_ID env vars)",
    )
    parser.add_argument(
        "--enrich",
        action="store_true",
        help="Fetch individual exhibitor detail pages for extra data (slower)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Delay between requests in seconds (default: 1.0)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    base_url = BASE_URLS.get(args.year)
    if not base_url:
        logger.error("Unsupported year: %d", args.year)
        sys.exit(1)

    # Determine which listing path to use
    if args.organic:
        path = EXHIBITOR_LIST_PATHS["organic"]
    elif args.first_time:
        path = EXHIBITOR_LIST_PATHS["first_time"]
    else:
        path = EXHIBITOR_LIST_PATHS["all"]

    # Choose scraper strategy
    exhibitors: list[Exhibitor] = []

    if args.use_graphql:
        gql_scraper = SwapcardGraphQLScraper()
        if gql_scraper.available:
            exhibitors = gql_scraper.scrape_listing(path)
        else:
            logger.error(
                "GraphQL mode requires SWAPCARD_API_TOKEN and SWAPCARD_EVENT_ID env vars."
            )
            sys.exit(1)
    elif args.use_playwright:
        scraper = PlaywrightScraper(base_url, delay=args.delay)
        exhibitors = scraper.scrape_listing(path)
    else:
        scraper = RequestsScraper(base_url, delay=args.delay)
        exhibitors = scraper.scrape_listing(path)

    if not exhibitors:
        logger.warning(
            "No exhibitors found with the current method.\n\n"
            "Tips:\n"
            "  1. Try --use-playwright for JS-rendered pages\n"
            "  2. Try --use-graphql with API credentials\n"
            "  3. Check if the URL is accessible in your browser\n"
        )
        sys.exit(0)

    # Optionally enrich with detail pages
    if args.enrich and not args.use_graphql:
        logger.info("Enriching %d exhibitors from detail pages...", len(exhibitors))
        req_scraper = RequestsScraper(base_url, delay=args.delay)
        for i, ex in enumerate(exhibitors):
            exhibitors[i] = req_scraper.scrape_detail(ex)
            if (i + 1) % 50 == 0:
                logger.info("Enriched %d / %d", i + 1, len(exhibitors))

    # Deduplicate by name
    seen = set()
    unique = []
    for ex in exhibitors:
        key = ex.name.strip().lower()
        if key and key not in seen:
            seen.add(key)
            unique.append(ex)
    exhibitors = unique

    logger.info("Total unique exhibitors: %d", len(exhibitors))

    # Output
    default_stem = f"output/expowest-{args.year}-exhibitors"
    if args.organic:
        default_stem += "-organic"
    elif args.first_time:
        default_stem += "-first-time"

    if args.format in ("csv", "both"):
        csv_path = args.output or f"{default_stem}.csv"
        write_csv(exhibitors, csv_path)

    if args.format in ("json", "both"):
        json_path = (
            args.output.replace(".csv", ".json") if args.output else f"{default_stem}.json"
        )
        write_json(exhibitors, json_path)


if __name__ == "__main__":
    main()
