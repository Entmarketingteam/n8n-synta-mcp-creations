#!/usr/bin/env python3
"""
F5Bot Alert Processor — Dogwood Vet Clinic
============================================
Parses F5Bot email alerts and categorizes them for action.

Can be run manually or wired into an n8n workflow that triggers
on incoming F5Bot emails (via Gmail/IMAP node).

Usage:
    # Process a single alert (paste the email body)
    python3 f5bot-alert-processor.py --interactive

    # Process from a file
    python3 f5bot-alert-processor.py --file alert-email.txt

    # Pipe from stdin
    echo "keyword alert text" | python3 f5bot-alert-processor.py

    # In n8n: use the Execute Command node to call this script
    # with the email body from a Gmail trigger node
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime

# ── Alert Categories ──────────────────────────────────────────────────────
BRAND_KEYWORDS = [
    "dogwood vet", "dogwood veterinary", "dogwoodvetclinic",
]

COMPETITOR_KEYWORDS = [
    "louvet", "lou vet", "doerrhoff", "lyndon animal clinic",
]

LOCAL_VET_KEYWORDS = [
    "vet louisville", "veterinarian louisville", "vet in louisville",
    "louisville vet", "louisville veterinarian",
]

LOCAL_SERVICE_KEYWORDS = [
    "dog dentist louisville", "emergency vet louisville",
    "pet surgeon louisville", "vet prospect ky", "norton commons vet",
]

CONTENT_IDEA_KEYWORDS = [
    "when to take dog to vet", "dog limping", "puppy first vet",
    "senior dog vet", "cat vet", "pet allergy",
]


def categorize_alert(text: str) -> dict:
    """Categorize an F5Bot alert into an actionable bucket."""
    text_lower = text.lower()

    categories = []
    matched_keywords = []

    for kw in BRAND_KEYWORDS:
        if kw in text_lower:
            categories.append("brand_mention")
            matched_keywords.append(kw)

    for kw in COMPETITOR_KEYWORDS:
        if kw in text_lower:
            categories.append("competitor_mention")
            matched_keywords.append(kw)

    for kw in LOCAL_VET_KEYWORDS:
        if kw in text_lower:
            categories.append("local_vet_conversation")
            matched_keywords.append(kw)

    for kw in LOCAL_SERVICE_KEYWORDS:
        if kw in text_lower:
            categories.append("local_service_query")
            matched_keywords.append(kw)

    for kw in CONTENT_IDEA_KEYWORDS:
        if kw in text_lower:
            categories.append("content_idea")
            matched_keywords.append(kw)

    if not categories:
        categories.append("uncategorized")

    # Extract Reddit URL if present
    reddit_urls = re.findall(r'https?://(?:www\.)?reddit\.com/r/\S+', text)

    # Extract subreddit
    subreddits = re.findall(r'r/(\w+)', text)

    # Determine priority
    priority = "low"
    if "brand_mention" in categories:
        priority = "high"
    elif "local_vet_conversation" in categories:
        priority = "high"
    elif "competitor_mention" in categories:
        priority = "medium"
    elif "local_service_query" in categories:
        priority = "medium"

    # Determine action
    actions = []
    if "brand_mention" in categories:
        actions.append("Monitor sentiment. Screenshot if positive. Address if negative.")
    if "competitor_mention" in categories:
        actions.append("Read context. Note any complaints or comparisons for competitive intel.")
    if "local_vet_conversation" in categories:
        actions.append("Potential engagement opportunity. Reply authentically if appropriate.")
    if "local_service_query" in categories:
        actions.append("Check if we have a matching blog post. If not, add to content calendar.")
    if "content_idea" in categories:
        actions.append("Add question to blog content calendar. Run keyword research.")

    return {
        "timestamp": datetime.now().isoformat(),
        "categories": list(set(categories)),
        "matched_keywords": list(set(matched_keywords)),
        "priority": priority,
        "actions": actions,
        "reddit_urls": reddit_urls,
        "subreddits": list(set(subreddits)),
        "text_preview": text[:300].strip(),
    }


def format_alert_summary(result: dict) -> str:
    """Format a categorized alert for human readability."""
    lines = [
        f"{'='*60}",
        f"  F5BOT ALERT — {result['priority'].upper()} PRIORITY",
        f"{'='*60}",
        f"",
        f"  Categories:  {', '.join(result['categories'])}",
        f"  Keywords:    {', '.join(result['matched_keywords'])}",
        f"  Subreddits:  {', '.join(result['subreddits']) or 'N/A'}",
        f"  Time:        {result['timestamp']}",
        f"",
    ]

    if result["reddit_urls"]:
        lines.append("  Reddit Links:")
        for url in result["reddit_urls"]:
            lines.append(f"    - {url}")
        lines.append("")

    lines.append("  Recommended Actions:")
    for i, action in enumerate(result["actions"], 1):
        lines.append(f"    {i}. {action}")
    lines.append("")

    lines.append("  Preview:")
    lines.append(f"    {result['text_preview'][:200]}...")
    lines.append("")

    return "\n".join(lines)


def save_alert(result: dict, output_dir: str = None):
    """Save alert to the research directory for tracking."""
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), "research", "f5bot-alerts")
    os.makedirs(output_dir, exist_ok=True)

    date_str = datetime.now().strftime("%Y-%m-%d")
    filepath = os.path.join(output_dir, f"alerts-{date_str}.jsonl")

    with open(filepath, "a") as f:
        f.write(json.dumps(result, default=str) + "\n")

    return filepath


def main():
    parser = argparse.ArgumentParser(description="Process F5Bot email alerts for Dogwood Vet Clinic")
    parser.add_argument("--file", help="Read alert from a file")
    parser.add_argument("--interactive", action="store_true", help="Paste alert text interactively")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--save", action="store_true", help="Save alert to research/f5bot-alerts/")
    parser.add_argument("--demo", action="store_true", help="Run with sample alerts to see how it works")
    args = parser.parse_args()

    if args.demo:
        demo_alerts = [
            "New mention of 'vet louisville ky' on Reddit:\n"
            "r/Louisville — Looking for a good vet in Louisville\n"
            "My dog has been limping and I need a vet recommendation in the Louisville area. "
            "We just moved from Lexington. Any suggestions near St Matthews or Prospect?\n"
            "https://www.reddit.com/r/Louisville/comments/abc123/looking_for_good_vet",

            "New mention of 'dogwood vet' on Reddit:\n"
            "r/Louisville — Best vets in the east end?\n"
            "We take our golden to Dogwood Vet in Norton Commons and they've been amazing. "
            "Dr. was super thorough with the senior wellness exam.\n"
            "https://www.reddit.com/r/Louisville/comments/def456/best_vets_east_end",

            "New mention of 'lou vet louisville' on Reddit:\n"
            "r/Louisville — Disappointed with LouVet\n"
            "Had a bad experience at Lou Vet Animal Clinic. Long wait times and felt rushed. "
            "Anyone know a better option in Louisville?\n"
            "https://www.reddit.com/r/Louisville/comments/ghi789/disappointed_louvet",

            "New mention of 'when to take dog to vet' on Reddit:\n"
            "r/dogs — When should I take my dog to the vet for a limp?\n"
            "My 7 year old lab started limping after our walk yesterday. He's still eating "
            "and playing but the limp hasn't gone away. Is this a vet visit or wait and see?\n"
            "https://www.reddit.com/r/dogs/comments/jkl012/when_to_take_dog_vet_limp",
        ]

        print(r"""
    ┌─────────────────────────────────────────────────────────┐
    │  F5Bot Alert Processor — DEMO MODE                     │
    │  Domain: dogwoodvetclinic.com                          │
    │  Showing 4 sample alerts                               │
    └─────────────────────────────────────────────────────────┘
        """)

        for i, alert_text in enumerate(demo_alerts, 1):
            print(f"\n--- Sample Alert {i} of {len(demo_alerts)} ---\n")
            result = categorize_alert(alert_text)
            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(format_alert_summary(result))
            if args.save:
                path = save_alert(result)
                print(f"  Saved to: {path}\n")

        print(f"\n{'='*60}")
        print("  DEMO COMPLETE — Set up F5Bot at https://f5bot.com")
        print("  See context/f5bot-reddit-monitoring.md for keyword list")
        print(f"{'='*60}\n")
        return

    # Read alert text
    if args.interactive:
        print("Paste the F5Bot email alert text (Ctrl+D when done):")
        alert_text = sys.stdin.read()
    elif args.file:
        with open(args.file) as f:
            alert_text = f.read()
    elif not sys.stdin.isatty():
        alert_text = sys.stdin.read()
    else:
        parser.print_help()
        print("\nTip: use --demo to see sample alerts in action")
        sys.exit(1)

    result = categorize_alert(alert_text)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(format_alert_summary(result))

    if args.save:
        path = save_alert(result)
        print(f"Saved to: {path}")


if __name__ == "__main__":
    main()
