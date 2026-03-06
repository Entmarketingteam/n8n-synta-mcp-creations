# Agency Ad Audit Deck v2 — Model & Prompt Tweaks

Upgraded version of the Meta Ad Audit → Gemini Analysis → Gamma Deck workflow. These are the specific changes that make it actually produce automated, client-ready assets.

## Tweak Summary

| # | What Changed | Where | Why |
|---|-------------|-------|-----|
| 1 | **Structured JSON output from Gemini** | `build_gemini_prompt` + `analyze_meta_ads` | v1 got freeform markdown back — impossible for Gamma to parse reliably. Now Gemini returns a strict JSON schema with scores, arrays, and typed fields. |
| 2 | **`responseMimeType: 'application/json'`** | `analyze_meta_ads` `generationConfig` | Forces Gemini API to return guaranteed-valid JSON instead of markdown-wrapped-in-backticks. Eliminates the #1 failure mode. |
| 3 | **Temperature 0.7 → 0.4** | `analyze_meta_ads` `generationConfig` | Lower temp = more consistent structured output. Creativity lives in the prompts, not in randomness. |
| 4 | **`maxOutputTokens` 8192 → 16384** | `analyze_meta_ads` `generationConfig` | The structured audit with per-ad scoring, 5-point action plan, and 3 creative briefs needs room. 8K was truncating. |
| 5 | **Slide-by-slide Gamma blueprint** | `build_gamma_prompt` | v1 dumped the entire audit as one text blob. Now the Gamma prompt defines exactly 16 slides with titles, content sections, and image placement instructions. Gamma follows structure. |
| 6 | **Quantified scorecard (1-10 scores)** | `build_gemini_prompt` JSON schema | Added `scorecard` object with 6 scored dimensions. Gamma renders these as visual gauges/bars on Slide 3 — gives the deck a "data-driven" feel that sells. |
| 7 | **3 concrete creative briefs** | `build_gemini_prompt` `creativeBriefs` section | v1 only identified problems. v2 also generates 3 new ad concepts with hook, visual direction, headline, body copy, and CTA. These become Slides 13-15 — the "here's what we'd build" section that closes deals. |

## Additional Changes

### Form Inputs (expanded)
- **Brand / Company Name** — personalizes the entire deck
- **Industry Vertical** (dropdown) — Gemini adjusts recommendations based on vertical benchmarks
- **Estimated Monthly Ad Spend** (dropdown) — calibrates the action plan (a $10K account gets different advice than $500K)
- **Primary Goal** (dropdown) — focuses the audit on what the prospect actually cares about

### Apify Scraper
- `resultsLimit`: 10 → **25** — more ads = better analysis
- `isDetailsPerAd`: false → **true** — gets per-ad metadata (start dates, activity status)

### Media Extraction (`extract_primary_media`)
- **Deduplicates by ad body text** — same creative concept with minor copy tweaks gets collapsed
- **Extracts ad copy metadata** — headline, body, CTA, link URL now available for the Gemini prompt
- **Captures all carousel card URLs** — not just the first card

### Gemini Prompt Node
- Moved from Set node → **Code node** — enables dynamic assembly of the ad inventory table, format distribution counts, and safe fallback handling when brand data fields are missing
- Includes a **per-ad inventory table** in the prompt so Gemini can reference ads by index number

### Gamma Prompt Node
- **Parses Gemini's JSON response** and maps fields to specific slides
- Has **fallback JSON extraction** if Gemini wraps output in markdown fences
- Passes the parsed `auditData` object downstream for potential future use (email, CRM, etc.)

## Model Selection Notes

| Node | v1 Model | v2 Model | Rationale |
|------|----------|----------|-----------|
| `analyze_meta_ads` | `gemini-3.1-pro-preview` | `gemini-2.5-pro` | 2.5 Pro has native JSON mode via `responseMimeType` and better multimodal analysis. Switch to `gemini-2.5-flash` for cost savings if output quality is acceptable. |

## Credentials Required

Same as v1:
- Firecrawl API
- Apify OAuth2
- Google Gemini (HTTP Header Auth)
- Gamma API (HTTP Header Auth)

## How to Test

1. Import `agency-ad-audit-deck-v2.json` into n8n
2. Attach credentials to each node
3. Submit the form with any brand URL + Meta Ads Library URL
4. Check the Gemini response — it should be valid JSON with all sections populated
5. Check the Gamma output — should be a 16-slide deck with embedded ad images
