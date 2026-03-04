#!/usr/bin/env python3
"""Quick connectivity test for Keywords Everywhere API.

Usage:
    # With env var:
    KEYWORDS_EVERYWHERE_API_KEY=your-key python3 test_keywords_everywhere.py

    # Or with .env file in data_sources/config/.env:
    python3 test_keywords_everywhere.py
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from keywords_everywhere import KeywordsEverywhere, KeywordsEverywhereError


def main():
    try:
        ke = KeywordsEverywhere()
    except KeywordsEverywhereError as e:
        print(f"Setup error: {e}")
        sys.exit(1)

    # 1. Check credits
    print("==> Checking credits...")
    try:
        credits_info = ke.get_credits()
        print(f"    Credits: {json.dumps(credits_info, indent=2)}")
    except KeywordsEverywhereError as e:
        print(f"    Error: {e}")
        sys.exit(1)

    # 2. Test keyword lookup
    test_keywords = ["seo tools", "keyword research"]
    print(f"\n==> Looking up: {test_keywords}")
    try:
        result = ke.get_keyword_data(test_keywords)
        for item in result.get("data", []):
            kw = item.get("keyword", "")
            vol = item.get("vol", "N/A")
            cpc = item.get("cpc", {}).get("value", "N/A")
            comp = item.get("competition", "N/A")
            print(f"    {kw}: vol={vol}, cpc={cpc}, competition={comp}")
    except KeywordsEverywhereError as e:
        print(f"    Error: {e}")

    # 3. Test related keywords
    print(f"\n==> Related keywords for: {test_keywords[0]}")
    try:
        related = ke.get_related_keywords(test_keywords[0])
        for item in related.get("data", [])[:5]:
            print(f"    - {item.get('keyword', '')} (vol={item.get('vol', 'N/A')})")
    except KeywordsEverywhereError as e:
        print(f"    Error: {e}")

    print(f"\n==> Total API requests made: {ke._request_count}")
    print("Done.")


if __name__ == "__main__":
    main()
