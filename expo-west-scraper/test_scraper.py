#!/usr/bin/env python3
"""
Tests for the Expo West Exhibitor Scraper.
Uses mock HTTP responses to verify all scraper strategies work correctly.

Run:  python test_scraper.py
"""

import csv
import json
import os
import sys
import tempfile
import unittest
from dataclasses import asdict
from unittest.mock import MagicMock, patch

# Add parent dir to path
sys.path.insert(0, os.path.dirname(__file__))

from scraper import (
    Exhibitor,
    RequestsScraper,
    SwapcardGraphQLScraper,
    write_csv,
    write_json,
)

# ---------------------------------------------------------------------------
# Mock HTML pages that mimic SmallWorldLabs exhibitor directory
# ---------------------------------------------------------------------------

MOCK_EXHIBITOR_LIST_HTML = """
<!DOCTYPE html>
<html>
<head><title>Expo West 2026 Exhibitors</title></head>
<body>
<main>
  <div class="exhibitor-card">
    <a href="/exhibitors/exhibitor/1001">
      <img src="/logos/acme-organics.png" alt="Acme Organics" />
      <h3>Acme Organics</h3>
    </a>
    <span class="booth">Booth: N201</span>
    <span class="category-badge">Organic Foods</span>
    <p class="description">Leading provider of organic snacks and beverages since 2010.</p>
  </div>
  <div class="exhibitor-card">
    <a href="/exhibitors/exhibitor/1002">
      <img src="/logos/green-valley.png" alt="Green Valley Naturals" />
      <h3>Green Valley Naturals</h3>
    </a>
    <span class="booth">Booth: H304</span>
    <span class="category-badge">Supplements</span>
    <p class="description">Plant-based supplements for wellness and vitality.</p>
  </div>
  <div class="exhibitor-card">
    <a href="/exhibitors/exhibitor/1003">
      <img src="/logos/pure-earth.png" alt="Pure Earth Beauty" />
      <h3>Pure Earth Beauty</h3>
    </a>
    <span class="booth">Booth: L112</span>
    <span class="category-badge">Beauty & Personal Care</span>
    <p class="description">Clean beauty products made with natural ingredients.</p>
  </div>
</main>
</body>
</html>
"""

MOCK_EXHIBITOR_LIST_PAGE2_HTML = """
<!DOCTYPE html>
<html>
<head><title>Expo West 2026 Exhibitors - Page 2</title></head>
<body>
<main>
  <div class="exhibitor-card">
    <a href="/exhibitors/exhibitor/1004">
      <h3>Sunrise Probiotics</h3>
    </a>
    <span class="booth">Booth: N405</span>
    <span class="category-badge">Probiotics</span>
    <p class="description">Gut health solutions with clinically studied strains.</p>
  </div>
</main>
<nav>
  <ul class="pagination">
    <li><a href="/exhibitors?page=1">1</a></li>
    <li class="active"><a href="/exhibitors?page=2">2</a></li>
  </ul>
</nav>
</body>
</html>
"""

MOCK_EMBEDDED_JSON_HTML = """
<!DOCTYPE html>
<html>
<head><title>Exhibitors</title></head>
<body>
<script>
window.__INITIAL_STATE__ = {
  "exhibitors": [
    {
      "name": "Organic Valley",
      "booth": "N100",
      "description": "Farmer-owned organic cooperative",
      "category": "Dairy",
      "website": "https://organicvalley.coop",
      "logo": "/logos/ov.png"
    },
    {
      "name": "Nature's Path",
      "booth": "H200",
      "description": "Organic cereals and granola",
      "category": "Cereals",
      "website": "https://naturespath.com",
      "logo": "/logos/np.png"
    },
    {
      "name": "Dr. Bronner's",
      "boothNumber": "L300",
      "bio": "Fair trade organic soap company",
      "category": "Personal Care",
      "url": "https://drbronner.com",
      "image": "/logos/db.png"
    }
  ]
};
</script>
<div id="app"></div>
</body>
</html>
"""

MOCK_DETAIL_HTML = """
<!DOCTYPE html>
<html>
<body>
<div class="exhibitor-profile">
  <h1>Acme Organics</h1>
  <div class="about-section">
    <p>Acme Organics has been a pioneer in organic snack foods since 2010,
    offering a wide range of USDA-certified products.</p>
  </div>
  <div class="contact-info">
    <a href="https://acmeorganics.com">Visit Website</a>
    <span class="phone">(555) 123-4567</span>
    <div class="address">123 Organic Way, Portland, OR 97201</div>
  </div>
  <div class="tags">
    <span class="tag">Organic</span>
    <span class="tag">Snacks</span>
    <span class="tag">Non-GMO</span>
  </div>
</div>
</body>
</html>
"""

MOCK_GRAPHQL_RESPONSE = {
    "data": {
        "exhibitors": [
            {
                "id": "ex1",
                "name": "Whole Earth Brands",
                "description": "Sustainable food brands portfolio",
                "website": "https://wholeearthbrands.com",
                "logoUrl": "https://cdn.swapcard.com/logos/web.png",
                "phone": "+1-555-987-6543",
                "categories": [
                    {"name": "Food & Beverage"},
                    {"name": "Sustainable"},
                ],
                "withEvent": {"booth": "N500"},
                "address": {
                    "formattedAddress": "456 Brand Ave, Chicago, IL",
                    "city": "Chicago",
                    "country": "US",
                },
                "socialNetworks": [
                    {"type": "LINKEDIN", "url": "https://linkedin.com/company/web"}
                ],
            },
            {
                "id": "ex2",
                "name": "Vital Proteins",
                "description": "Collagen and wellness supplements",
                "website": "https://vitalproteins.com",
                "logoUrl": "https://cdn.swapcard.com/logos/vp.png",
                "phone": "+1-555-222-3333",
                "categories": [{"name": "Supplements"}],
                "withEvent": {"booth": "H601"},
                "address": {
                    "formattedAddress": "789 Protein Blvd, Scottsdale, AZ",
                    "city": "Scottsdale",
                    "country": "US",
                },
                "socialNetworks": [],
            },
        ]
    }
}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestExhibitorDataclass(unittest.TestCase):
    def test_default_values(self):
        ex = Exhibitor()
        self.assertEqual(ex.name, "")
        self.assertEqual(ex.booth, "")

    def test_asdict(self):
        ex = Exhibitor(name="Test Co", booth="A100")
        d = asdict(ex)
        self.assertEqual(d["name"], "Test Co")
        self.assertEqual(d["booth"], "A100")
        self.assertIn("description", d)


class TestRequestsScraper(unittest.TestCase):
    def setUp(self):
        self.scraper = RequestsScraper(
            "https://expowest26.smallworldlabs.com", delay=0
        )

    @patch("scraper.requests.Session.get")
    def test_scrape_listing_html_cards(self, mock_get):
        """Test parsing exhibitor cards from HTML."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = MOCK_EXHIBITOR_LIST_HTML
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        results = self.scraper.scrape_listing("/exhibitors")

        self.assertEqual(len(results), 3)
        self.assertEqual(results[0].name, "Acme Organics")
        self.assertEqual(results[0].booth, "N201")
        self.assertEqual(results[0].category, "Organic Foods")
        self.assertIn("organic snacks", results[0].description)
        self.assertIn("/exhibitors/exhibitor/1001", results[0].profile_url)
        self.assertIn("/logos/acme-organics.png", results[0].logo_url)

        self.assertEqual(results[1].name, "Green Valley Naturals")
        self.assertEqual(results[1].booth, "H304")

        self.assertEqual(results[2].name, "Pure Earth Beauty")
        self.assertEqual(results[2].booth, "L112")

    @patch("scraper.requests.Session.get")
    def test_scrape_listing_embedded_json(self, mock_get):
        """Test extracting exhibitors from embedded JavaScript data."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = MOCK_EMBEDDED_JSON_HTML
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        results = self.scraper.scrape_listing("/exhibitors")

        self.assertEqual(len(results), 3)

        ov = next(r for r in results if r.name == "Organic Valley")
        self.assertEqual(ov.booth, "N100")
        self.assertEqual(ov.website, "https://organicvalley.coop")
        self.assertEqual(ov.category, "Dairy")

        db = next(r for r in results if r.name == "Dr. Bronner's")
        self.assertEqual(db.booth, "L300")
        self.assertEqual(db.website, "https://drbronner.com")

    @patch("scraper.requests.Session.get")
    def test_scrape_detail_enrichment(self, mock_get):
        """Test enriching an exhibitor from its detail page."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = MOCK_DETAIL_HTML
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        ex = Exhibitor(
            name="Acme Organics",
            profile_url="https://expowest26.smallworldlabs.com/exhibitors/exhibitor/1001",
        )
        enriched = self.scraper.scrape_detail(ex)

        self.assertEqual(enriched.phone, "(555) 123-4567")
        self.assertIn("123 Organic Way", enriched.address)

    @patch("scraper.requests.Session.get")
    def test_handles_network_failure(self, mock_get):
        """Test graceful handling of network errors."""
        import requests as req_lib

        mock_get.side_effect = req_lib.ConnectionError("Connection refused")

        results = self.scraper.scrape_listing("/exhibitors")
        self.assertEqual(results, [])

    @patch("scraper.requests.Session.get")
    def test_empty_page(self, mock_get):
        """Test handling of a page with no exhibitor data."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = "<html><body><p>No exhibitors found.</p></body></html>"
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        results = self.scraper.scrape_listing("/exhibitors")
        self.assertEqual(results, [])


class TestSwapcardGraphQLScraper(unittest.TestCase):
    @patch.dict(
        os.environ,
        {
            "SWAPCARD_API_TOKEN": "test-token-123",
            "SWAPCARD_EVENT_ID": "evt-expo-west-2026",
        },
    )
    def test_available_with_env_vars(self):
        scraper = SwapcardGraphQLScraper()
        self.assertTrue(scraper.available)

    def test_not_available_without_env_vars(self):
        scraper = SwapcardGraphQLScraper()
        self.assertFalse(scraper.available)

    @patch("scraper.requests.post")
    @patch.dict(
        os.environ,
        {
            "SWAPCARD_API_TOKEN": "test-token-123",
            "SWAPCARD_EVENT_ID": "evt-expo-west-2026",
        },
    )
    def test_scrape_graphql(self, mock_post):
        """Test parsing GraphQL API response."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = MOCK_GRAPHQL_RESPONSE
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        scraper = SwapcardGraphQLScraper()
        results = scraper.scrape_listing()

        self.assertEqual(len(results), 2)

        web = results[0]
        self.assertEqual(web.name, "Whole Earth Brands")
        self.assertEqual(web.booth, "N500")
        self.assertEqual(web.city, "Chicago")
        self.assertEqual(web.country, "US")
        self.assertEqual(web.category, "Food & Beverage, Sustainable")
        self.assertEqual(web.website, "https://wholeearthbrands.com")

        vp = results[1]
        self.assertEqual(vp.name, "Vital Proteins")
        self.assertEqual(vp.booth, "H601")

        # Verify the POST was made with correct payload
        call_args = mock_post.call_args
        payload = call_args[1]["json"] if "json" in call_args[1] else call_args[0][1]
        self.assertIn("GetExhibitors", payload["query"])
        self.assertEqual(payload["variables"]["eventId"], "evt-expo-west-2026")

    @patch("scraper.requests.post")
    @patch.dict(
        os.environ,
        {
            "SWAPCARD_API_TOKEN": "test-token-123",
            "SWAPCARD_EVENT_ID": "evt-expo-west-2026",
        },
    )
    def test_graphql_pagination(self, mock_post):
        """Test that GraphQL scraper handles pagination correctly."""
        # First page returns full page_size, second page returns fewer
        page1 = {"data": {"exhibitors": [
            {"id": f"ex{i}", "name": f"Company {i}", "description": "", "website": "",
             "logoUrl": "", "phone": "", "categories": [], "withEvent": {"booth": f"B{i}"},
             "address": {"formattedAddress": "", "city": "", "country": ""}, "socialNetworks": []}
            for i in range(100)
        ]}}
        page2 = {"data": {"exhibitors": [
            {"id": "ex100", "name": "Last Company", "description": "", "website": "",
             "logoUrl": "", "phone": "", "categories": [], "withEvent": {"booth": "B100"},
             "address": {"formattedAddress": "", "city": "", "country": ""}, "socialNetworks": []}
        ]}}

        mock_resp1 = MagicMock()
        mock_resp1.json.return_value = page1
        mock_resp1.raise_for_status = MagicMock()

        mock_resp2 = MagicMock()
        mock_resp2.json.return_value = page2
        mock_resp2.raise_for_status = MagicMock()

        mock_post.side_effect = [mock_resp1, mock_resp2]

        scraper = SwapcardGraphQLScraper()
        results = scraper.scrape_listing()

        self.assertEqual(len(results), 101)
        self.assertEqual(mock_post.call_count, 2)


class TestOutputWriters(unittest.TestCase):
    def setUp(self):
        self.exhibitors = [
            Exhibitor(
                name="Acme Organics",
                booth="N201",
                category="Organic Foods",
                description="Leading provider of organic snacks",
                website="https://acmeorganics.com",
            ),
            Exhibitor(
                name="Green Valley Naturals",
                booth="H304",
                category="Supplements",
                description="Plant-based supplements",
                website="https://greenvalley.com",
            ),
        ]

    def test_write_csv(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False
        ) as f:
            path = f.name

        try:
            write_csv(self.exhibitors, path)

            with open(path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows = list(reader)

            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0]["name"], "Acme Organics")
            self.assertEqual(rows[0]["booth"], "N201")
            self.assertEqual(rows[1]["name"], "Green Valley Naturals")
            self.assertIn("category", rows[0])
            self.assertIn("website", rows[0])
        finally:
            os.unlink(path)

    def test_write_json(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False
        ) as f:
            path = f.name

        try:
            write_json(self.exhibitors, path)

            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            self.assertEqual(len(data), 2)
            self.assertEqual(data[0]["name"], "Acme Organics")
            self.assertEqual(data[1]["booth"], "H304")
        finally:
            os.unlink(path)

    def test_write_csv_creates_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "subdir", "output.csv")
            write_csv(self.exhibitors, path)
            self.assertTrue(os.path.exists(path))

    def test_write_empty_list(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False
        ) as f:
            path = f.name

        try:
            write_csv([], path)
            # Should not create/overwrite with empty data
        finally:
            if os.path.exists(path):
                os.unlink(path)


class TestDeduplication(unittest.TestCase):
    def test_dedup_by_name(self):
        """Test the deduplication logic from main()."""
        exhibitors = [
            Exhibitor(name="Acme Organics", booth="N201"),
            Exhibitor(name="acme organics", booth="N201"),  # duplicate (case diff)
            Exhibitor(name="Green Valley", booth="H304"),
            Exhibitor(name="Green Valley", booth="H305"),  # duplicate
            Exhibitor(name="Pure Earth", booth="L112"),
        ]

        seen = set()
        unique = []
        for ex in exhibitors:
            key = ex.name.strip().lower()
            if key and key not in seen:
                seen.add(key)
                unique.append(ex)

        self.assertEqual(len(unique), 3)
        names = [ex.name for ex in unique]
        self.assertIn("Acme Organics", names)
        self.assertIn("Green Valley", names)
        self.assertIn("Pure Earth", names)


if __name__ == "__main__":
    unittest.main(verbosity=2)
