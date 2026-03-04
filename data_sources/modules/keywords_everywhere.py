"""
Keywords Everywhere API Client
==============================
Provides keyword research data: search volume, CPC, competition,
related keywords, People Also Search For, domain/URL keyword rankings,
traffic estimates, and backlink data.

API docs: https://api.keywordseverywhere.com/docs/
Requires: KEYWORDS_EVERYWHERE_API_KEY in environment or config/.env

Credit costs vary by endpoint — check your dashboard at
https://keywordseverywhere.com/ke-api-dashboard.html
"""

import json
import logging
import os
import time
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

# Try to use diskcache if available (same pattern as dataforseo.py)
try:
    import diskcache

    _CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "cache", "keywords_everywhere")
    _cache = diskcache.Cache(_CACHE_DIR)
except ImportError:
    _cache = None

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Load env
# ---------------------------------------------------------------------------
_env_path = os.path.join(os.path.dirname(__file__), "..", "config", ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)

BASE_URL = "https://api.keywordseverywhere.com/v1"

# Default settings
DEFAULT_COUNTRY = "us"
DEFAULT_CURRENCY = "USD"
DEFAULT_DATA_SOURCE = "gkp"  # gkp = Google Keyword Planner, cli = Clickstream


class KeywordsEverywhereError(Exception):
    """Raised when the Keywords Everywhere API returns an error."""


class KeywordsEverywhere:
    """Client for the Keywords Everywhere API.

    Usage:
        from keywords_everywhere import KeywordsEverywhere

        ke = KeywordsEverywhere()  # reads KEYWORDS_EVERYWHERE_API_KEY from env
        data = ke.get_keyword_data(["podcast hosting", "best podcast software"])
        print(data)
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("KEYWORDS_EVERYWHERE_API_KEY", "")
        if not self.api_key:
            raise KeywordsEverywhereError(
                "KEYWORDS_EVERYWHERE_API_KEY not set. "
                "Add it to data_sources/config/.env or set as environment variable."
            )
        self.headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        self._request_count = 0

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        url = f"{BASE_URL}/{endpoint}"
        cache_key = f"ke:get:{endpoint}:{json.dumps(params, sort_keys=True)}"

        if _cache is not None:
            cached = _cache.get(cache_key)
            if cached is not None:
                logger.debug("Cache hit: %s", cache_key)
                return cached

        resp = requests.get(url, headers=self.headers, params=params, timeout=30)
        self._request_count += 1
        data = self._handle_response(resp)

        if _cache is not None:
            _cache.set(cache_key, data, expire=3600)  # 1 hour cache

        return data

    def _post(self, endpoint: str, payload: Dict, cache_ttl: int = 3600) -> Dict:
        url = f"{BASE_URL}/{endpoint}"
        cache_key = f"ke:post:{endpoint}:{json.dumps(payload, sort_keys=True)}"

        if _cache is not None:
            cached = _cache.get(cache_key)
            if cached is not None:
                logger.debug("Cache hit: %s", cache_key)
                return cached

        resp = requests.post(url, headers=self.headers, data=payload, timeout=30)
        self._request_count += 1
        data = self._handle_response(resp)

        if _cache is not None and cache_ttl > 0:
            _cache.set(cache_key, data, expire=cache_ttl)

        return data

    @staticmethod
    def _handle_response(resp: requests.Response) -> Dict:
        if resp.status_code == 429:
            raise KeywordsEverywhereError(
                "Rate limited by Keywords Everywhere API. Wait and retry."
            )
        if resp.status_code == 403:
            raise KeywordsEverywhereError(
                "Invalid API key or insufficient credits."
            )
        if resp.status_code != 200:
            raise KeywordsEverywhereError(
                f"API error {resp.status_code}: {resp.text}"
            )
        try:
            return resp.json()
        except json.JSONDecodeError:
            return {"raw": resp.text}

    @staticmethod
    def _prepare_keywords(keywords: List[str]) -> List[tuple]:
        """Format keywords as form-encoded kw[] array for POST."""
        return [("kw[]", kw.strip()) for kw in keywords if kw.strip()]

    # ------------------------------------------------------------------
    # Account endpoints
    # ------------------------------------------------------------------

    def get_credits(self) -> Dict:
        """Check remaining API credits."""
        return self._get("account/credits")

    def get_countries(self) -> List[Dict]:
        """List supported countries with their codes."""
        return self._get("countries")

    def get_currencies(self) -> List[Dict]:
        """List supported currencies."""
        return self._get("currencies")

    # ------------------------------------------------------------------
    # Keyword research endpoints
    # ------------------------------------------------------------------

    def get_keyword_data(
        self,
        keywords: List[str],
        country: str = DEFAULT_COUNTRY,
        currency: str = DEFAULT_CURRENCY,
        data_source: str = DEFAULT_DATA_SOURCE,
    ) -> Dict:
        """Get search volume, CPC, competition, and trend data for keywords.

        Args:
            keywords: List of keyword strings (max 100 per request).
            country: Two-letter country code (e.g., "us", "uk", "de").
            currency: Currency code (e.g., "USD", "GBP").
            data_source: "gkp" (Google Keyword Planner) or "cli" (Clickstream).

        Returns:
            Dict with "data" list, each item containing:
              - keyword, vol, cpc (dict with value/currency), competition,
                trend (list of monthly volumes)
        """
        if len(keywords) > 100:
            logger.warning("Splitting %d keywords into batches of 100", len(keywords))
            return self._batch_keyword_data(keywords, country, currency, data_source)

        payload = self._prepare_keywords(keywords)
        payload.extend([
            ("country", country),
            ("currency", currency),
            ("dataSource", data_source),
        ])
        return self._post("get_keyword_data", dict(payload))

    def _batch_keyword_data(
        self,
        keywords: List[str],
        country: str,
        currency: str,
        data_source: str,
    ) -> Dict:
        """Process keywords in batches of 100."""
        all_data = []
        for i in range(0, len(keywords), 100):
            batch = keywords[i : i + 100]
            result = self.get_keyword_data(batch, country, currency, data_source)
            if "data" in result:
                all_data.extend(result["data"])
            if i + 100 < len(keywords):
                time.sleep(0.5)  # rate limit courtesy
        return {"data": all_data}

    def get_related_keywords(
        self,
        keyword: str,
        country: str = DEFAULT_COUNTRY,
        currency: str = DEFAULT_CURRENCY,
        data_source: str = DEFAULT_DATA_SOURCE,
    ) -> Dict:
        """Get related keywords for a seed keyword.

        Returns keywords similar to the seed with their metrics.
        """
        payload = {
            "kw[]": keyword,
            "country": country,
            "currency": currency,
            "dataSource": data_source,
        }
        return self._post("get_related_keywords", payload)

    def get_pasf_keywords(
        self,
        keyword: str,
        country: str = DEFAULT_COUNTRY,
        currency: str = DEFAULT_CURRENCY,
        data_source: str = DEFAULT_DATA_SOURCE,
    ) -> Dict:
        """Get 'People Also Search For' keywords.

        Returns PASF suggestions with their search metrics.
        """
        payload = {
            "kw[]": keyword,
            "country": country,
            "currency": currency,
            "dataSource": data_source,
        }
        return self._post("get_pasf_keywords", payload)

    # ------------------------------------------------------------------
    # Domain & URL analysis endpoints
    # ------------------------------------------------------------------

    def get_domain_keywords(
        self,
        domain: str,
        country: str = DEFAULT_COUNTRY,
        currency: str = DEFAULT_CURRENCY,
    ) -> Dict:
        """Get keywords a domain ranks for in organic search."""
        payload = {
            "domain": domain,
            "country": country,
            "currency": currency,
        }
        return self._post("get_domain_keywords", payload)

    def get_url_keywords(
        self,
        url: str,
        country: str = DEFAULT_COUNTRY,
        currency: str = DEFAULT_CURRENCY,
    ) -> Dict:
        """Get keywords a specific URL ranks for."""
        payload = {
            "url": url,
            "country": country,
            "currency": currency,
        }
        return self._post("get_url_keywords", payload)

    def get_domain_traffic(
        self,
        domain: str,
        country: str = DEFAULT_COUNTRY,
        currency: str = DEFAULT_CURRENCY,
    ) -> Dict:
        """Get estimated traffic data for a domain."""
        payload = {
            "domain": domain,
            "country": country,
            "currency": currency,
        }
        return self._post("get_domain_traffic", payload)

    def get_url_traffic(
        self,
        url: str,
        country: str = DEFAULT_COUNTRY,
        currency: str = DEFAULT_CURRENCY,
    ) -> Dict:
        """Get estimated traffic data for a specific URL."""
        payload = {
            "url": url,
            "country": country,
            "currency": currency,
        }
        return self._post("get_url_traffic", payload)

    # ------------------------------------------------------------------
    # Backlink endpoints
    # ------------------------------------------------------------------

    def get_domain_backlinks(self, domain: str) -> Dict:
        """Get full backlink profile for a domain."""
        return self._post("get_domain_backlinks", {"domain": domain})

    def get_unique_domain_backlinks(self, domain: str) -> Dict:
        """Get deduplicated backlink profile for a domain."""
        return self._post("get_unique_domain_backlinks", {"domain": domain})

    def get_page_backlinks(self, url: str) -> Dict:
        """Get backlinks pointing to a specific page."""
        return self._post("get_page_backlinks", {"url": url})

    def get_unique_page_backlinks(self, url: str) -> Dict:
        """Get deduplicated backlinks for a specific page."""
        return self._post("get_unique_page_backlinks", {"url": url})

    # ------------------------------------------------------------------
    # Convenience / analysis methods
    # ------------------------------------------------------------------

    def research_topic(
        self,
        seed_keyword: str,
        country: str = DEFAULT_COUNTRY,
        currency: str = DEFAULT_CURRENCY,
        data_source: str = DEFAULT_DATA_SOURCE,
    ) -> Dict[str, Any]:
        """Full topic research: keyword data + related + PASF.

        Combines three API calls into a single research bundle.
        Returns a dict with 'seed', 'related', and 'pasf' keys.
        """
        seed_data = self.get_keyword_data(
            [seed_keyword], country, currency, data_source
        )
        related = self.get_related_keywords(
            seed_keyword, country, currency, data_source
        )
        pasf = self.get_pasf_keywords(
            seed_keyword, country, currency, data_source
        )
        return {
            "seed": seed_data.get("data", [{}])[0] if seed_data.get("data") else {},
            "related": related.get("data", []),
            "pasf": pasf.get("data", []),
        }

    def competitor_analysis(
        self,
        domains: List[str],
        country: str = DEFAULT_COUNTRY,
        currency: str = DEFAULT_CURRENCY,
    ) -> List[Dict]:
        """Analyze keyword rankings and traffic for competitor domains."""
        results = []
        for domain in domains:
            try:
                keywords = self.get_domain_keywords(domain, country, currency)
                traffic = self.get_domain_traffic(domain, country, currency)
                results.append({
                    "domain": domain,
                    "keywords": keywords.get("data", []),
                    "traffic": traffic.get("data", {}),
                })
            except KeywordsEverywhereError as e:
                logger.warning("Failed to analyze %s: %s", domain, e)
                results.append({"domain": domain, "error": str(e)})
            time.sleep(0.5)  # rate limit courtesy
        return results

    def content_gap_analysis(
        self,
        your_domain: str,
        competitor_domains: List[str],
        country: str = DEFAULT_COUNTRY,
        currency: str = DEFAULT_CURRENCY,
    ) -> Dict[str, Any]:
        """Find keywords competitors rank for that you don't.

        Returns keywords that appear in competitor results but not yours.
        """
        your_kws = self.get_domain_keywords(your_domain, country, currency)
        your_keyword_set = set()
        if "data" in your_kws:
            your_keyword_set = {item.get("keyword", "").lower() for item in your_kws["data"]}

        gaps = []
        for comp in competitor_domains:
            try:
                comp_kws = self.get_domain_keywords(comp, country, currency)
                if "data" in comp_kws:
                    for item in comp_kws["data"]:
                        kw = item.get("keyword", "").lower()
                        if kw and kw not in your_keyword_set:
                            item["found_on"] = comp
                            gaps.append(item)
            except KeywordsEverywhereError as e:
                logger.warning("Failed to get keywords for %s: %s", comp, e)
            time.sleep(0.5)

        # Deduplicate and sort by volume descending
        seen = set()
        unique_gaps = []
        for g in gaps:
            kw = g.get("keyword", "").lower()
            if kw not in seen:
                seen.add(kw)
                unique_gaps.append(g)
        unique_gaps.sort(key=lambda x: x.get("vol", 0), reverse=True)

        return {
            "your_domain": your_domain,
            "your_keyword_count": len(your_keyword_set),
            "gaps_found": len(unique_gaps),
            "gap_keywords": unique_gaps,
        }

    def write_report(self, data: Dict, output_path: str) -> str:
        """Write research data to a markdown report file.

        Args:
            data: Result from research_topic() or content_gap_analysis().
            output_path: Path to write the markdown file.

        Returns:
            The output file path.
        """
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        lines = ["# Keywords Everywhere Research Report\n"]

        if "seed" in data:
            seed = data["seed"]
            lines.append(f"## Seed Keyword: {seed.get('keyword', 'N/A')}\n")
            lines.append(f"- **Volume:** {seed.get('vol', 'N/A')}")
            cpc = seed.get("cpc", {})
            lines.append(f"- **CPC:** {cpc.get('value', 'N/A')} {cpc.get('currency', '')}")
            lines.append(f"- **Competition:** {seed.get('competition', 'N/A')}\n")

            if data.get("related"):
                lines.append("## Related Keywords\n")
                lines.append("| Keyword | Volume | CPC | Competition |")
                lines.append("|---------|--------|-----|-------------|")
                for kw in data["related"][:30]:
                    cpc_val = kw.get("cpc", {}).get("value", "N/A")
                    lines.append(
                        f"| {kw.get('keyword', '')} | {kw.get('vol', '')} "
                        f"| {cpc_val} | {kw.get('competition', '')} |"
                    )
                lines.append("")

            if data.get("pasf"):
                lines.append("## People Also Search For\n")
                lines.append("| Keyword | Volume | CPC | Competition |")
                lines.append("|---------|--------|-----|-------------|")
                for kw in data["pasf"][:20]:
                    cpc_val = kw.get("cpc", {}).get("value", "N/A")
                    lines.append(
                        f"| {kw.get('keyword', '')} | {kw.get('vol', '')} "
                        f"| {cpc_val} | {kw.get('competition', '')} |"
                    )
                lines.append("")

        if "gap_keywords" in data:
            lines.append(f"## Content Gap Analysis\n")
            lines.append(f"- **Your domain:** {data.get('your_domain', '')}")
            lines.append(f"- **Your keywords:** {data.get('your_keyword_count', 0)}")
            lines.append(f"- **Gaps found:** {data.get('gaps_found', 0)}\n")
            lines.append("| Keyword | Volume | CPC | Found On |")
            lines.append("|---------|--------|-----|----------|")
            for kw in data["gap_keywords"][:50]:
                cpc_val = kw.get("cpc", {}).get("value", "N/A")
                lines.append(
                    f"| {kw.get('keyword', '')} | {kw.get('vol', '')} "
                    f"| {cpc_val} | {kw.get('found_on', '')} |"
                )
            lines.append("")

        content = "\n".join(lines)
        with open(output_path, "w") as f:
            f.write(content)

        return output_path


# ---------------------------------------------------------------------------
# CLI entry point for quick testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    ke = KeywordsEverywhere()

    # Check credits
    credits_info = ke.get_credits()
    print(f"Credits remaining: {json.dumps(credits_info, indent=2)}")

    # Quick keyword lookup if args provided
    if len(sys.argv) > 1:
        keywords = sys.argv[1:]
        print(f"\nLooking up: {keywords}")
        result = ke.get_keyword_data(keywords)
        print(json.dumps(result, indent=2))
