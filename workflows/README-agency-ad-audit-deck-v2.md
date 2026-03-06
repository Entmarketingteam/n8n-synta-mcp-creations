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

## Output Format: Gamma Native URL (v2.2)

Switched from PPTX export to **Gamma native presentation URL**. Benefits:
- **Shareable link** — send the Gamma URL directly; no file attachment needed
- **Interactive** — recipients can view in-browser with Gamma's built-in presenter mode
- **Editable** — team can tweak slides in Gamma before client delivery
- **Export on demand** — PDF/PPTX export is available inside Gamma when needed

The `generate_gamma_presentation` node no longer sends `"exportAs": "pptx"`. Gamma returns its native `gammaUrl` which is what gets emailed.

## Doppler Integration (v2.2)

Added `doppler_secrets` node at the top of the flow (form_trigger → doppler_secrets → scrape_brand_website). This fetches all API keys from Doppler project `ent-agency-automation` / config `prd` at runtime.

**Setup:**
1. Install the `n8n-nodes-doppler-secrets` community node if not already installed
2. Attach the `Doppler (ent-agency-automation)` credential to the `doppler_secrets` node
3. Ensure `GAMMA_API_KEY` is set in your Doppler `ent-agency-automation/prd` config
4. `GAMMA_API_KEY` has been added to `scripts/sync-doppler-to-n8n-variables.js`

**Downstream access pattern:** `$('doppler_secrets').first().json.GAMMA_API_KEY`

## End-to-End Automation (v2.1 additions)

These changes close the loop so the workflow runs fully unattended — form submit to inbox delivery.

### 1. Error Handling & Graceful Degradation
- **`scrape_brand_website`** — `onError: continueErrorOutput` routes failures to `fallback_brand_data`, which builds minimal brand context from form inputs. The workflow continues with ad-only analysis instead of dying.
- **`download_media_file`** — `onError: continueRegularOutput` skips failed downloads (expired CDN links, 403s) instead of halting.
- **`upload_images`** — same treatment; failed uploads are filtered out in `build_gemini_prompt`.
- **`aggregate_media`** — try/catch per-item so one corrupt binary doesn't kill the batch.
- **`build_gamma_prompt`** — throws with a clear error message if Gemini's JSON is unparseable, rather than silently passing garbage to Gamma.

### 2. Gamma Poll Guard (max retries)
- **`init_poll_counter`** — initializes a `pollCount = 0` before entering the wait loop.
- **`poll_guard`** — increments counter on every poll, classifies outcome as `completed | failed | timeout | pending`.
- **Max 20 polls** (~10 minutes). If Gamma hasn't finished, the workflow routes to `set_error_result` → error email instead of spinning forever.
- Failed/errored Gamma generations also exit cleanly.

### 3. Email Delivery
- **`send_success_email`** — sends an HTML email with the Gamma presentation URL to the address from the form.
- **`send_error_email`** — sends a failure notification with the specific error so the user knows what happened.
- Both use SMTP credentials (configure in n8n after import).

### 4. Form Email Field
- Added **"Your Email (for delivery)"** required field to the form trigger. This is what powers the delivery step.

### 5. Brand Scrape Fallback
- If Firecrawl can't reach the brand website (403, timeout, bot block), the workflow builds placeholder brand data from the form's "Brand / Company Name" field and continues with neutral defaults (black/white colors, sans-serif fonts). The audit still runs — it just focuses more on the ad creatives.

### What's Still Manual (future v3)
- **Slack notification** — add a Slack node parallel to `send_success_email` if your team uses Slack.
- **CRM logging** — the `auditData` JSON from `build_gamma_prompt` contains the full structured audit. Route it to Airtable/Notion/your CRM to build a history of audits per prospect.
- **tmpfiles.org expiry** — uploaded ad images expire after ~1 hour. For production, replace with S3/Cloudflare R2/Google Cloud Storage upload. The Gamma deck embeds images at generation time so the deck itself is fine, but the raw audit URLs will break.
- **Canva integration** — could add a parallel branch to push creative briefs to Canva via their Connect API for social-ready assets (requires `CANVA_API_KEY` in Doppler).

## Credentials Required

- **Doppler** — `Doppler (ent-agency-automation)` credential on the `doppler_secrets` node
- Firecrawl API
- Apify OAuth2
- Google Gemini (HTTP Header Auth)
- Gamma API (HTTP Header Auth)
- **SMTP** (for email delivery) — update credential IDs in `send_success_email` and `send_error_email`

## How to Test

1. Import `agency-ad-audit-deck-v2.json` into n8n
2. Attach credentials to each node (especially SMTP — search for `REPLACE_WITH_SMTP_CREDENTIAL_ID`)
3. Submit the form with any brand URL + Meta Ads Library URL + your email
4. Check the Gemini response — it should be valid JSON with all sections populated
5. Check the Gamma output — should be a 16-slide deck with embedded ad images
6. Check your inbox — you should receive the deck link within 5-10 minutes
7. **Error test:** submit with an invalid brand URL — should still complete with fallback brand data
