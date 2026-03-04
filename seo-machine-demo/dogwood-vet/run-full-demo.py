#!/usr/bin/env python3
"""
SEO Machine — End-to-End Demo for Dogwood Vet Clinic
=====================================================
Runs the complete Keywords Everywhere research pipeline for dogwoodvetclinic.com:

  1. Check API credits
  2. Keyword research (volume, CPC, competition) for vet keywords
  3. Related keywords expansion
  4. People Also Search For (PASF)
  5. Domain keyword rankings for dogwoodvetclinic.com
  6. Domain traffic estimate
  7. Competitor analysis (louvetanimalclinic.com)
  8. Content gap analysis (your domain vs competitor)
  9. Backlink profile check
  10. Generate full markdown report

Usage:
    # Set your API key (from Doppler or directly)
    export KEYWORDS_EVERYWHERE_API_KEY=your-key-here

    # Or use Doppler:
    DOPPLER_TOKEN="dp.st.dev.xxx" doppler run -- python3 run-full-demo.py

    # Run the demo
    python3 run-full-demo.py
"""

import json
import logging
import os
import sys
from datetime import datetime

# Add the data_sources modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "data_sources", "modules"))

from keywords_everywhere import KeywordsEverywhere, KeywordsEverywhereError

# ── Config ────────────────────────────────────────────────────────────────────
DOMAIN = "dogwoodvetclinic.com"
COMPETITOR_DOMAINS = [
    "louvetanimalclinic.com",
    "doerrhoffanimalhospital.com",
    "lyndonanimalclinic.com",
]
COUNTRY = "us"
CURRENCY = "USD"

SEED_KEYWORDS = [
    "veterinarian louisville ky",
    "vet clinic louisville ky",
    "animal hospital louisville ky",
    "emergency vet louisville ky",
    "vet near me louisville",
    "dog dental care louisville ky",
    "pet vaccinations louisville ky",
    "cat vet louisville ky",
    "pet orthopedic surgery louisville ky",
    "senior pet care louisville",
    "puppy vet louisville ky",
    "veterinarian prospect ky",
    "vet near norton commons",
    "vet near st matthews louisville",
]

TOPIC_SEEDS = [
    "veterinarian louisville ky",
    "dog dental cleaning cost",
    "when to take dog to vet",
]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "research")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("demo")


def divider(title: str):
    print(f"\n{'='*70}")
    print(f"  STEP: {title}")
    print(f"{'='*70}\n")


def save_json(data, filename):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)
    log.info("Saved: %s", path)
    return path


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")

    print(r"""
    ┌─────────────────────────────────────────────────────────┐
    │  SEO Machine — Full Pipeline Demo                      │
    │  Domain: dogwoodvetclinic.com                          │
    │  Market: Louisville, KY                                │
    │  Data:   Keywords Everywhere API                       │
    └─────────────────────────────────────────────────────────┘
    """)

    # ── Initialize ────────────────────────────────────────────────────────
    try:
        ke = KeywordsEverywhere()
    except KeywordsEverywhereError as e:
        print(f"\n[ERROR] {e}")
        print("\nTo run this demo, set your API key:")
        print("  export KEYWORDS_EVERYWHERE_API_KEY=your-key")
        print("\nOr pull from Doppler:")
        print('  DOPPLER_TOKEN="dp.st.dev.xxx" doppler run -- python3 run-full-demo.py')
        sys.exit(1)

    results = {}

    # ── Step 1: Credits ───────────────────────────────────────────────────
    divider("1/10 — Check API Credits")
    try:
        credits = ke.get_credits()
        results["credits"] = credits
        print(f"  Credits info: {json.dumps(credits, indent=2)}")
    except KeywordsEverywhereError as e:
        print(f"  Warning: {e}")
        results["credits"] = {"error": str(e)}

    # ── Step 2: Keyword Data ──────────────────────────────────────────────
    divider("2/10 — Keyword Volume, CPC & Competition")
    try:
        kw_data = ke.get_keyword_data(SEED_KEYWORDS, COUNTRY, CURRENCY)
        results["keyword_data"] = kw_data
        save_json(kw_data, f"keyword-data-{timestamp}.json")

        print(f"  {'Keyword':<45} {'Vol':>8} {'CPC':>8} {'Comp':>8}")
        print(f"  {'-'*45} {'-'*8} {'-'*8} {'-'*8}")
        for item in kw_data.get("data", []):
            kw = item.get("keyword", "")[:44]
            vol = item.get("vol", "N/A")
            cpc_val = item.get("cpc", {}).get("value", "N/A")
            comp = item.get("competition", "N/A")
            print(f"  {kw:<45} {str(vol):>8} {str(cpc_val):>8} {str(comp):>8}")
    except KeywordsEverywhereError as e:
        print(f"  Error: {e}")
        results["keyword_data"] = {"error": str(e)}

    # ── Step 3: Related Keywords ──────────────────────────────────────────
    divider("3/10 — Related Keywords Expansion")
    all_related = {}
    for seed in TOPIC_SEEDS:
        try:
            related = ke.get_related_keywords(seed, COUNTRY, CURRENCY)
            related_list = related.get("data", [])
            all_related[seed] = related_list
            print(f"\n  Seed: \"{seed}\" → {len(related_list)} related keywords")
            for item in related_list[:5]:
                print(f"    - {item.get('keyword', '')} (vol={item.get('vol', 'N/A')})")
            if len(related_list) > 5:
                print(f"    ... and {len(related_list)-5} more")
        except KeywordsEverywhereError as e:
            print(f"  Error for '{seed}': {e}")
            all_related[seed] = {"error": str(e)}
    results["related_keywords"] = all_related
    save_json(all_related, f"related-keywords-{timestamp}.json")

    # ── Step 4: PASF ─────────────────────────────────────────────────────
    divider("4/10 — People Also Search For (PASF)")
    all_pasf = {}
    for seed in TOPIC_SEEDS:
        try:
            pasf = ke.get_pasf_keywords(seed, COUNTRY, CURRENCY)
            pasf_list = pasf.get("data", [])
            all_pasf[seed] = pasf_list
            print(f"\n  Seed: \"{seed}\" → {len(pasf_list)} PASF keywords")
            for item in pasf_list[:5]:
                print(f"    - {item.get('keyword', '')} (vol={item.get('vol', 'N/A')})")
            if len(pasf_list) > 5:
                print(f"    ... and {len(pasf_list)-5} more")
        except KeywordsEverywhereError as e:
            print(f"  Error for '{seed}': {e}")
            all_pasf[seed] = {"error": str(e)}
    results["pasf_keywords"] = all_pasf
    save_json(all_pasf, f"pasf-keywords-{timestamp}.json")

    # ── Step 5: Domain Keyword Rankings ───────────────────────────────────
    divider("5/10 — Domain Keyword Rankings (dogwoodvetclinic.com)")
    try:
        domain_kws = ke.get_domain_keywords(DOMAIN, COUNTRY, CURRENCY)
        results["domain_keywords"] = domain_kws
        save_json(domain_kws, f"domain-keywords-{timestamp}.json")
        kw_list = domain_kws.get("data", [])
        print(f"  Found {len(kw_list)} keywords ranking for {DOMAIN}")
        for item in kw_list[:10]:
            print(f"    - {item.get('keyword', '')} (vol={item.get('vol', 'N/A')})")
        if len(kw_list) > 10:
            print(f"    ... and {len(kw_list)-10} more")
    except KeywordsEverywhereError as e:
        print(f"  Error: {e}")
        results["domain_keywords"] = {"error": str(e)}

    # ── Step 6: Domain Traffic ────────────────────────────────────────────
    divider("6/10 — Domain Traffic Estimate")
    try:
        traffic = ke.get_domain_traffic(DOMAIN, COUNTRY, CURRENCY)
        results["domain_traffic"] = traffic
        save_json(traffic, f"domain-traffic-{timestamp}.json")
        print(f"  Traffic data: {json.dumps(traffic, indent=2)}")
    except KeywordsEverywhereError as e:
        print(f"  Error: {e}")
        results["domain_traffic"] = {"error": str(e)}

    # ── Step 7: Competitor Analysis ───────────────────────────────────────
    divider("7/10 — Competitor Analysis")
    try:
        comp_data = ke.competitor_analysis(COMPETITOR_DOMAINS, COUNTRY, CURRENCY)
        results["competitor_analysis"] = comp_data
        save_json(comp_data, f"competitor-analysis-{timestamp}.json")
        for comp in comp_data:
            domain = comp.get("domain", "")
            kw_count = len(comp.get("keywords", []))
            traffic_info = comp.get("traffic", {})
            error = comp.get("error", "")
            if error:
                print(f"  {domain}: Error — {error}")
            else:
                print(f"  {domain}: {kw_count} keywords ranking")
                if traffic_info:
                    print(f"    Traffic: {json.dumps(traffic_info)}")
    except KeywordsEverywhereError as e:
        print(f"  Error: {e}")
        results["competitor_analysis"] = {"error": str(e)}

    # ── Step 8: Content Gap Analysis ──────────────────────────────────────
    divider("8/10 — Content Gap Analysis (You vs. Competitors)")
    try:
        gaps = ke.content_gap_analysis(DOMAIN, COMPETITOR_DOMAINS[:2], COUNTRY, CURRENCY)
        results["content_gaps"] = gaps
        save_json(gaps, f"content-gaps-{timestamp}.json")
        print(f"  Your keywords: {gaps.get('your_keyword_count', 0)}")
        print(f"  Gap keywords found: {gaps.get('gaps_found', 0)}")
        print(f"\n  Top gap opportunities:")
        for item in gaps.get("gap_keywords", [])[:10]:
            print(f"    - {item.get('keyword', '')} (vol={item.get('vol', 'N/A')}, from: {item.get('found_on', '')})")
    except KeywordsEverywhereError as e:
        print(f"  Error: {e}")
        results["content_gaps"] = {"error": str(e)}

    # ── Step 9: Backlinks ─────────────────────────────────────────────────
    divider("9/10 — Backlink Profile")
    try:
        backlinks = ke.get_unique_domain_backlinks(DOMAIN)
        results["backlinks"] = backlinks
        save_json(backlinks, f"backlinks-{timestamp}.json")
        bl_list = backlinks.get("data", [])
        print(f"  Unique referring domains: {len(bl_list)}")
        for item in bl_list[:10]:
            print(f"    - {item.get('source', item.get('domain', ''))}")
    except KeywordsEverywhereError as e:
        print(f"  Error: {e}")
        results["backlinks"] = {"error": str(e)}

    # ── Step 10: Generate Full Report ─────────────────────────────────────
    divider("10/10 — Generate Markdown Report")
    report_path = os.path.join(OUTPUT_DIR, f"dogwood-vet-seo-report-{timestamp}.md")
    report_lines = [
        f"# SEO Research Report — Dogwood Vet Clinic",
        f"**Generated:** {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        f"**Domain:** {DOMAIN}",
        f"**Market:** Louisville, KY",
        f"**Data Source:** Keywords Everywhere API\n",
        "---\n",
    ]

    # Section: Keyword data
    report_lines.append("## 1. Target Keyword Metrics\n")
    if "data" in results.get("keyword_data", {}):
        report_lines.append("| Keyword | Volume | CPC | Competition |")
        report_lines.append("|---------|--------|-----|-------------|")
        for item in results["keyword_data"]["data"]:
            cpc_val = item.get("cpc", {}).get("value", "N/A")
            report_lines.append(
                f"| {item.get('keyword', '')} | {item.get('vol', 'N/A')} "
                f"| ${cpc_val} | {item.get('competition', 'N/A')} |"
            )
        report_lines.append("")

    # Section: Related keywords
    report_lines.append("## 2. Related Keywords (Expansion Opportunities)\n")
    for seed, related_list in results.get("related_keywords", {}).items():
        if isinstance(related_list, list) and related_list:
            report_lines.append(f"### Seed: \"{seed}\"\n")
            report_lines.append("| Keyword | Volume | CPC | Competition |")
            report_lines.append("|---------|--------|-----|-------------|")
            for item in related_list[:15]:
                cpc_val = item.get("cpc", {}).get("value", "N/A")
                report_lines.append(
                    f"| {item.get('keyword', '')} | {item.get('vol', 'N/A')} "
                    f"| ${cpc_val} | {item.get('competition', 'N/A')} |"
                )
            report_lines.append("")

    # Section: PASF
    report_lines.append("## 3. People Also Search For\n")
    for seed, pasf_list in results.get("pasf_keywords", {}).items():
        if isinstance(pasf_list, list) and pasf_list:
            report_lines.append(f"### Seed: \"{seed}\"\n")
            for item in pasf_list[:10]:
                report_lines.append(f"- {item.get('keyword', '')} (vol: {item.get('vol', 'N/A')})")
            report_lines.append("")

    # Section: Domain rankings
    report_lines.append("## 4. Current Domain Rankings\n")
    domain_kw_data = results.get("domain_keywords", {})
    if "data" in domain_kw_data:
        report_lines.append(f"**Total keywords ranking:** {len(domain_kw_data['data'])}\n")
        report_lines.append("| Keyword | Volume | Position |")
        report_lines.append("|---------|--------|----------|")
        for item in domain_kw_data["data"][:25]:
            report_lines.append(
                f"| {item.get('keyword', '')} | {item.get('vol', 'N/A')} "
                f"| {item.get('position', 'N/A')} |"
            )
        report_lines.append("")

    # Section: Traffic
    report_lines.append("## 5. Traffic Estimate\n")
    traffic_data = results.get("domain_traffic", {})
    if traffic_data and "error" not in traffic_data:
        report_lines.append(f"```json\n{json.dumps(traffic_data, indent=2)}\n```\n")

    # Section: Competitor analysis
    report_lines.append("## 6. Competitor Analysis\n")
    for comp in results.get("competitor_analysis", []):
        domain = comp.get("domain", "")
        report_lines.append(f"### {domain}\n")
        if comp.get("error"):
            report_lines.append(f"Error: {comp['error']}\n")
        else:
            kws = comp.get("keywords", [])
            report_lines.append(f"- **Keywords ranking:** {len(kws)}")
            if comp.get("traffic"):
                report_lines.append(f"- **Traffic:** {json.dumps(comp['traffic'])}")
            if kws:
                report_lines.append("\nTop keywords:")
                report_lines.append("| Keyword | Volume |")
                report_lines.append("|---------|--------|")
                for item in kws[:10]:
                    report_lines.append(f"| {item.get('keyword', '')} | {item.get('vol', 'N/A')} |")
            report_lines.append("")

    # Section: Content gaps
    report_lines.append("## 7. Content Gap Opportunities\n")
    gaps_data = results.get("content_gaps", {})
    if "gap_keywords" in gaps_data:
        report_lines.append(f"**Your keyword count:** {gaps_data.get('your_keyword_count', 0)}")
        report_lines.append(f"**Gap keywords found:** {gaps_data.get('gaps_found', 0)}\n")
        report_lines.append("These are keywords your competitors rank for that you don't:\n")
        report_lines.append("| Keyword | Volume | CPC | Competitor |")
        report_lines.append("|---------|--------|-----|------------|")
        for item in gaps_data["gap_keywords"][:30]:
            cpc_val = item.get("cpc", {}).get("value", "N/A")
            report_lines.append(
                f"| {item.get('keyword', '')} | {item.get('vol', 'N/A')} "
                f"| ${cpc_val} | {item.get('found_on', '')} |"
            )
        report_lines.append("")

    # Section: Backlinks
    report_lines.append("## 8. Backlink Profile\n")
    bl_data = results.get("backlinks", {})
    if "data" in bl_data:
        report_lines.append(f"**Unique referring domains:** {len(bl_data['data'])}\n")
        for item in bl_data["data"][:20]:
            source = item.get("source", item.get("domain", "unknown"))
            report_lines.append(f"- {source}")
        report_lines.append("")

    # Section: Recommendations
    report_lines.extend([
        "## 9. Recommended Next Steps\n",
        "Based on this data, here's the prioritized action plan:\n",
        "### Immediate (Week 1-2)",
        "1. **Fix homepage title tag** — currently over-optimized and keyword-stuffed",
        "2. **Create hyper-localized service pages** targeting top gap keywords",
        "3. **Implement LocalBusiness Schema** on all pages\n",
        "### Short-term (Month 1)",
        "4. **Write 3-5 pillar blog posts** targeting Tier 1 keywords with Louisville context",
        "5. **Build neighborhood landing pages** (St. Matthews, Lyndon, Glenview)",
        "6. **Start citation building** on top 50 local directories\n",
        "### Ongoing",
        "7. **Publish 2 blog posts/week** targeting PASF and related keywords",
        "8. **Monitor competitor keyword gains** monthly using this pipeline",
        "9. **Track content gap closure** — re-run gap analysis monthly",
        "10. **Build backlinks** from Louisville business associations and pet industry sites\n",
        "---\n",
        "*Report generated by SEO Machine using Keywords Everywhere API data.*",
    ])

    report_content = "\n".join(report_lines)
    with open(report_path, "w") as f:
        f.write(report_content)
    print(f"  Full report saved to: {report_path}")

    # ── Summary ───────────────────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"  DEMO COMPLETE")
    print(f"{'='*70}")
    print(f"\n  API requests made: {ke._request_count}")
    print(f"  Output directory:  {OUTPUT_DIR}")
    print(f"  Full report:       {report_path}")
    print(f"\n  Files generated:")
    for f_name in sorted(os.listdir(OUTPUT_DIR)):
        f_path = os.path.join(OUTPUT_DIR, f_name)
        size = os.path.getsize(f_path)
        print(f"    {f_name} ({size:,} bytes)")
    print()


if __name__ == "__main__":
    main()
