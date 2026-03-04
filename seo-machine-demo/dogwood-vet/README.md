# SEO Machine Demo — Dogwood Vet Clinic

End-to-end SEO research pipeline for **dogwoodvetclinic.com** using the Keywords Everywhere API.

## What This Does

Runs a 10-step automated pipeline:

| Step | What It Does | Output |
|------|-------------|--------|
| 1 | Check API credits | Credit balance |
| 2 | Keyword metrics (14 vet keywords) | Volume, CPC, competition |
| 3 | Related keywords expansion | Keyword ideas from 3 seed terms |
| 4 | People Also Search For | PASF suggestions |
| 5 | Domain keyword rankings | What dogwoodvetclinic.com ranks for |
| 6 | Domain traffic estimate | Estimated monthly traffic |
| 7 | Competitor analysis | Rankings for 3 competitor vet clinics |
| 8 | Content gap analysis | Keywords competitors have that you don't |
| 9 | Backlink profile | Referring domains |
| 10 | Generate full markdown report | Complete SEO research brief |

## Quick Start

```bash
# 1. Install dependencies
pip install -r ../../data_sources/requirements.txt

# 2. Set your Keywords Everywhere API key
export KEYWORDS_EVERYWHERE_API_KEY=your-key-here

# Or use Doppler:
DOPPLER_TOKEN="your-token" doppler run -- python3 run-full-demo.py

# 3. Run the demo
python3 run-full-demo.py
```

## Output

All results are saved to `research/`:
- `keyword-data-*.json` — Raw keyword metrics
- `related-keywords-*.json` — Expansion opportunities
- `pasf-keywords-*.json` — PASF data
- `domain-keywords-*.json` — Your current rankings
- `domain-traffic-*.json` — Traffic estimates
- `competitor-analysis-*.json` — Competitor intel
- `content-gaps-*.json` — Gap keywords
- `backlinks-*.json` — Referring domains
- `dogwood-vet-seo-report-*.md` — Full research report

## F5Bot Reddit Monitoring

Automated Reddit brand monitoring via [F5Bot](https://f5bot.com):

- `context/f5bot-reddit-monitoring.md` — Full setup guide, 20+ keywords across 5 tiers, response playbook, CSV upload template
- `f5bot-alert-processor.py` — Alert categorizer that parses F5Bot emails into actionable buckets

### Quick Demo (see it in action now — no API key needed)
```bash
python3 f5bot-alert-processor.py --demo
```

This runs 4 sample Reddit alerts and shows how each gets categorized:
- **Brand mentions** (someone talks about Dogwood) → HIGH priority
- **Competitor mentions** (LouVet complaint thread) → MEDIUM priority
- **Local vet conversations** ("best vet in Louisville?") → HIGH priority
- **Content ideas** (pet health questions) → Blog topic signal

### How It Fits Together
```
F5Bot monitors Reddit 24/7
    ↓
Email alert when keyword matches
    ↓
f5bot-alert-processor.py categorizes & prioritizes
    ↓
Feeds into SEO Machine pipeline:
  - Content gaps → new blog posts
  - Brand mentions → reputation management
  - Competitor intel → positioning strategy
  - Local convos → engagement opportunities
```

## Context Files

Pre-configured for Dogwood Vet Clinic (Louisville, KY):
- `context/brand-voice.md` — Voice pillars and tone guidelines
- `context/seo-guidelines.md` — Keyword targets and content rules
- `context/target-keywords.md` — Prioritized keyword tiers
- `context/f5bot-reddit-monitoring.md` — Reddit monitoring keywords, playbook & CSV template

## Existing Audit

The `existing-audit/` directory contains a previous SEO audit with:
- Comprehensive SEO audit and competitor analysis
- Hyper-localization strategy for Louisville market
- St. Matthews and Middletown neighborhood landing page plans
