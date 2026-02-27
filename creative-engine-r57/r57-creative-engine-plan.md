# R57 Creative Content Engine — ENT Agency Master Plan

**Framework:** r57-template-community (Creative Content Engine + Blotato)
**Location:** `~/Downloads/r57-template-community/r57-template-community/`
**Date:** 2026-02-25

---

## What This Framework Is

An AI-powered visual content factory that turns brand briefs into fully scheduled social campaigns — images, UGC-style videos, captions, and automated posting — at near-zero cost per asset. Built on:

| Tool | Role |
|------|------|
| Google AI Studio (Nano Banana Pro) | AI image generation ~$0.13/image |
| Veo 3.1 | Authentic UGC video w/ native audio ~$0.50/video |
| Kling 3.0 / Sora 2 Pro | Cinematic video via Kie AI ~$0.30/video |
| Blotato | Multi-platform social scheduling (Instagram, TikTok, LinkedIn, YouTube) |
| Airtable | Content review hub — prompts, approvals, scheduling |
| Modal.com | Serverless cloud pipelines (~$1.50-2.40/month for daily automation) |

**Core workflows:**
1. **30-Day Campaign** — Brand discovery → 30 AI images → 30 scheduled posts → autopilot
2. **Generate Content** — On-demand ad creative with Airtable review loop
3. **YouTube → LinkedIn** — Auto-monitors channel → extracts transcript → posts branded infographic daily

---

## Part 1: Setup Checklist

### Step 1 — Move Framework to Permanent Home
```bash
mkdir -p ~/projects/r57-creative-engine
cp -r ~/Downloads/r57-template-community/r57-template-community/. ~/projects/r57-creative-engine/
```

### Step 2 — Install Python Dependencies
```bash
cd ~/projects/r57-creative-engine
pip install -r tools/requirements.txt
```

### Step 3 — Configure API Keys
Copy `references/.env.example` → `references/.env` and fill in:

| Key | Source | Priority |
|-----|--------|----------|
| `GOOGLE_API_KEY` | aistudio.google.com/apikey | **Required** (images + video) |
| `KIE_API_KEY` | kie.ai/api-key | **Required** (Kling/Sora + file hosting) |
| `BLOTATO_API_KEY` | my.blotato.com → API settings | **Required** (social posting) |
| `AIRTABLE_API_KEY` | airtable.com/create/tokens | **Required** (review hub) |
| `AIRTABLE_BASE_ID` | Airtable base URL | **Required** |
| `WAVESPEED_API_KEY` | wavespeed.ai | Optional (backup video) |

**Doppler storage:** Add all keys to Doppler `ent-agency-automation` project so they're central with other agency keys.

### Step 4 — Create Airtable Table
```bash
cd ~/projects/r57-creative-engine
python tools/setup_airtable.py
```

### Step 5 — Connect Blotato Accounts
1. Log in at my.blotato.com
2. Connect: Instagram, TikTok, YouTube, LinkedIn for each creator/brand account
3. Note each account's `accountId` for workflow configs

### Step 6 — Add Blotato MCP to Claude Code
In `~/.claude/claude_desktop_config.json` (or MCP config), add:
```json
"blotato": {
  "serverUrl": "https://mcp.blotato.com/mcp",
  "headers": {
    "blotato-api-key": "YOUR_BLOTATO_API_KEY"
  }
}
```

---

## Part 2: ENT Agency Use Cases

### Use Case A: Creator Content Production Service

**What:** We run the full 30-day content engine FOR creators we work with — generate their monthly feed, schedule it out, done.

**Workflow:**
1. Creator provides product/brand reference images → drop in `references/inputs/`
2. Run brand discovery interview (30-day campaign Phase 1)
3. Create `references/[creator]_BRAND.md`
4. Generate 30-day calendar → Airtable review
5. Generate images (~$3.90 at $0.13 each for 30 posts)
6. Creator approves in Airtable
7. Schedule all 30 posts via Blotato → autopilot

**Our pricing:** Charge creator $300-500/month for "AI Content Management"
**Our cost:** ~$4-8 in AI credits + Blotato + Airtable
**Margin:** 95%+

### Use Case B: Brand Campaign Asset Creation

**What:** Brands provide product shots → we deliver 30 campaign-ready images + UGC videos in 48 hours.

**Workflow:**
1. Client provides brief + product images
2. Generate 10-30 images across styles (UGC, studio, lifestyle, CGI, detail, flat lay)
3. Generate UGC-style videos from approved images (Veo 3.1 — authentic dialogue)
4. Deliver via Airtable review link
5. Optional: schedule through their Blotato account

**Our pricing:** $500-1500 per campaign asset package
**Our cost:** ~$10-30 in AI credits

### Use Case C: Creator YouTube → LinkedIn Autopilot

**What:** Creators who post on YouTube want LinkedIn presence. Set up once, runs forever.

**Workflow:**
1. Get YouTube channel ID + LinkedIn account connected in Blotato
2. Build brand voice file from 2-3 existing YouTube videos
3. Deploy Modal pipeline — monitors channel daily
4. Every new video → transcript → branded infographic → LinkedIn post

**Our pricing:** $150-250/month setup + maintenance
**Our cost:** ~$2/month in compute + AI credits

### Use Case D: Campaign Launch Packages for Brands

**What:** Brand launching a product needs UGC-style creator content without hiring real creators.

**Workflow:**
1. Brand provides product brief + reference images
2. We generate 10-20 UGC-style videos (Veo 3.1 — person talking about product, natural dialogue)
3. Deliver raw video files for brand to use as organic posts, ads, or creator seeding

**Our pricing:** $1,000-2,500/package
**Our cost:** ~$10-20 in video credits

---

## Part 3: ENT Agency Skills Mapped to This Framework

The r57 framework handles execution (API calls, Airtable writes, scheduling). Our Claude Code skills handle the **strategy and briefing layers** that feed into it. Every skill maps to a specific handoff point.

### Production Pipeline — Skills by Stage

| r57 Stage | Claude Code Skill | Handoff |
|-----------|-------------------|---------|
| **Pre-brief: positioning** | `positioning-angles` | Run before any campaign starts — find the angle that makes the content strategy coherent. Output feeds into brand.md and prompt direction. |
| **Brand discovery** | `brand-voice` | Extracts or builds the voice profile that becomes `references/[brand]_BRAND.md`. This file is mandatory before any r57 generation — it governs every caption, prompt tone, and visual style. |
| **Visual concept development** | `ai-creative-strategist` | Develops image concepts, visual angles, and scene directions BEFORE writing Nano Banana prompts. Prevents generic AI output. |
| **Image generation** | `ai-image-generation` | Executes image generation via Replicate API — directly parallels Nano Banana Pro in the r57 stack. Use when iterating on specific shots outside the full pipeline. |
| **Product photography** | `ai-product-photo` | Generates professional product shots for the `references/inputs/` folder — the reference images that r57 uses as source material for all generation. |
| **Product video** | `ai-product-video` | Writes and executes product reveal / hero video briefs for Veo 3.1 or Kling pipelines. |
| **UGC talking head** | `ai-talking-head` | Produces lip-sync / presenter videos — directly maps to the Veo 3.1 UGC use case (person talking about product with native dialogue). |
| **Social graphics** | `ai-social-graphics` | Platform-optimized graphics for Instagram posts, YouTube thumbnails, LinkedIn headers — used when the deliverable is a designed graphic rather than an AI photo. |
| **Caption writing** | `direct-response-copy` | Writes converting captions for the Airtable `Caption` field. Every scheduled post needs copy that works — this skill handles it. |
| **Multi-platform adaptation** | `content-atomizer` | Takes approved images/videos and adapts the caption, format, and hook per platform (Instagram, TikTok, LinkedIn, YouTube Shorts). Feeds into Blotato scheduling. |

---

## Part 4: Go-To-Market Plan — Marketing This Service

### GTM Overview

**What we're selling:** AI content production as a service — brands and creators get a month of content for the cost of a single photoshoot hour.

**Target buyers:**
1. **D2C brands** (fashion, beauty, supplements, CPG) — want UGC content without the creator management overhead
2. **Mid-tier creators** (50K-500K followers) — consistent content without burnout
3. **Marketing agencies** — want to white-label this as their AI content offering

---

**The core GTM insight:** We market this service *using the service itself.* Every piece of content we post to sell it is produced by the same pipeline we're selling. The proof IS the product.

---

### Channel 1: LinkedIn (Ethan or Emily's personal brand)

**Goal:** Establish authority in "AI content production for brands/creators"

**Content types:**
- Results posts: "We generated 30 posts for [brand] in 2 hours. Here's what it cost."
- Before/After: client's original content vs what the AI engine produced
- Contrarian takes: "Stop hiring UGC creators for every campaign. Do this instead."
- Process breakdowns: prompt → image → video → scheduled (screenshot carousels)

**Skill workflow — in order:**
1. `brand-voice` → define Ethan/Emily's LinkedIn voice before writing a single post
2. `positioning-angles` → find the 3 strongest angles for the service (run once, informs everything)
3. `ai-creative-strategist` → develop the visual creative strategy for ENT Agency's own LinkedIn presence
4. `ai-social-graphics` → create the branded infographics, carousels, and LinkedIn headers that make posts stop the scroll
5. `content-atomizer` → take each client campaign result (the proof) and atomize it into 5 LinkedIn posts, a carousel, and a short-form video script
6. `direct-response-copy` → write every hook, caption, and CTA with intention to convert

**Distribution:** Schedule via Blotato. 3x/week minimum.

---

### Channel 2: Short-Form Video (TikTok + Instagram Reels)

**Goal:** Show the magic visually — prompt typing → images appearing → video generating → post going live. The demo IS the hook.

**Content formats:**
- Screen recordings of the pipeline in action (genuine, unedited)
- "This is what $8 of AI credits looks like" — show 30 generated images grid
- "I replaced our UGC creator budget with this" — before/after results
- Talking-head explainers from Ethan or Emily about the workflow

**Skill workflow — in order:**
1. `ai-creative-strategist` → develop the video content series concepts and hooks before filming anything
2. `ai-talking-head` → produce ENT Agency talking-head presenter videos using the same Veo 3.1 pipeline we're selling (meta-proof)
3. `ai-product-video` → for product demo segments — animated reveals of generated content
4. `content-atomizer` → each long-form walkthrough video gets atomized into 3-5 Reels/TikToks
5. `direct-response-copy` → captions and hooks for every clip

**Distribution:** Blotato cross-posts every video to TikTok + Instagram Reels + YouTube Shorts simultaneously.

---

### Channel 3: Direct Outreach (Smartlead)

**Target list:**
- D2C brands (fashion, beauty, CPG) with active Instagram but inconsistent posting — Apollo + Smartlead
- Marketing directors at 7-8 figure brands — LinkedIn search
- Creator managers at talent agencies — LinkedIn

**Sequence structure:** 3-email, 7-day window

- **Email 1:** Lead with a sample — attach 3 AI-generated images for THEIR product category. "Made these in 20 minutes. Yours would look like this."
- **Email 2:** The economics — cost per piece of content vs. traditional UGC/photoshoot
- **Email 3:** Soft close — offer one free mini-campaign (5 images) for their actual product

**Skill workflow:**
1. `lead-magnet` → develop the free sample campaign offer as the irresistible door-opener
2. `email-sequences` → write the full 3-email cold outreach sequence
3. `direct-response-copy` → sharpen subject lines, hooks, and CTAs on every email
4. `ai-product-photo` + `ai-image-generation` → generate the sample images that go IN the outreach emails (show, don't tell)

---

### Channel 4: Lead Magnet + Email Funnel

**Lead magnet:** "The AI Content Engine: How to Generate a Month of Social Content for $10"
A practical walkthrough of the r57 workflow — gives away the how, sells the done-for-you.

**Funnel:**
1. Lead magnet promoted via LinkedIn posts + TikTok CTAs
2. Download → 5-email welcome + nurture sequence
3. Sequence converts to: done-for-you retainer, or self-serve white-label access
4. Monthly newsletter: real campaign breakdowns, prompt tips, AI model updates, results data

**Skill workflow:**
1. `lead-magnet` → finalize the concept, hook, and format (PDF guide vs. video walkthrough)
2. `keyword-research` → find what D2C brands and creators are searching for ("AI content for Instagram", "UGC video generator", "social media automation") — informs SEO + lead magnet naming
3. `seo-content` → write a landing page and 2-3 blog posts targeting those keywords so inbound finds us
4. `email-sequences` → write the 5-email welcome + nurture sequence, plus a separate conversion sequence
5. `newsletter` → build the monthly newsletter format (real numbers from client campaigns = social proof engine)

---

### Channel 5: Agency White-Label Partner Program

**Concept:** Boutique social media agencies license this as their own AI content offering. We set them up (brand file, Airtable, Blotato), they run it for their clients under their own brand.

**Pricing:** $500/month + they handle their own AI credits

**How to reach them:** LinkedIn search for "social media agency owner" + "AI content" — these are people actively looking for this.

**Skill workflow:**
1. `positioning-angles` → develop the partner-facing angle separately from the brand/creator angle (different buyer, different pain)
2. `email-sequences` → dedicated outreach sequence for agency partners
3. `direct-response-copy` → partner program landing page copy

---

## Part 5: 30-Day Launch Sequence

### Week 1 — Infrastructure
- [ ] Move framework to `~/projects/r57-creative-engine`
- [ ] Configure all API keys in Doppler + `.env`
- [ ] Set up Airtable content table
- [ ] Connect Blotato accounts (agency test accounts)
- [ ] Test with a sample brand: run the full 30-day campaign workflow end-to-end
- [ ] Create ENT Agency `_BRAND.md` file for our own content

### Week 2 — First Client Campaign
- [ ] Pick 1 creator or brand we already work with
- [ ] Run the full 30-day campaign workflow for them
- [ ] Document results (cost, time, quality)
- [ ] Capture screenshots/screen recordings for content

### Week 3 — Content + Outreach Launch
- [ ] Use `positioning-angles` to define the 3 service angles
- [ ] Create LinkedIn content series (8 posts scheduled via Blotato)
- [ ] Build lead magnet with `lead-magnet` skill
- [ ] Set up Smartlead email sequence with `email-sequences` skill
- [ ] Launch outreach to first 50 D2C brands

### Week 4 — Iterate + Scale
- [ ] Review results from Week 1 client campaign
- [ ] Refine pricing and packaging based on real costs
- [ ] Set up YouTube → LinkedIn automation for ENT Agency's own channel
- [ ] Start white-label agency outreach
- [ ] Close first 2-3 paying clients

---

## Cost Model Summary

| Service Tier | Monthly Price | AI Credits Cost | Net Margin |
|-------------|--------------|----------------|------------|
| Creator Content Package (30 posts/mo) | $300 | ~$5 | 98% |
| Brand Campaign Assets (30 images + 10 videos) | $800 | ~$25 | 97% |
| YouTube → LinkedIn Autopilot | $200 | ~$3 | 98.5% |
| Full AI Content Management (images + video + scheduling) | $1,500 | ~$50 | 97% |

---

## Files to Create in r57 Project for ENT Agency

| File | Purpose |
|------|---------|
| `references/ENT_AGENCY_BRAND.md` | Our own brand voice for content we post about this service |
| `references/docs/client-intake-template.md` | Standard questions to gather before any client campaign |
| `references/docs/pricing-sheet.md` | Internal pricing guide |
| `.agent/workflows/ent-onboarding.md` | Custom workflow: new client → brand file → first campaign |

---

## Next Steps (Immediate)

1. **Set up** — Run setup steps 1-6 above. Note: Replicate provider integration is queued (Feb 26) which drops 200-ad campaign cost from ~$26 → ~$17. Factor into pricing.
2. **Brand voice first** — Run `brand-voice` skill to create `references/ENT_AGENCY_BRAND.md` before any ENT Agency content is created
3. **Positioning** — Run `positioning-angles` to define the 3 service angles (brand buyer, creator buyer, agency white-label buyer are 3 separate angles)
4. **Test drive** — Run the full 30-day campaign workflow for one creator or brand we already work with. Use real results as proof.
5. **Create the demo content** — Use `ai-creative-strategist` + `ai-social-graphics` + `ai-talking-head` to produce the marketing content for LinkedIn/TikTok from the test campaign results
6. **Atomize** — Run `content-atomizer` on the test campaign to generate the LinkedIn series + Reels + YouTube Shorts from one piece of proof
7. **Outreach** — Build Smartlead sequence with `email-sequences` + `direct-response-copy`, attach sample images generated by `ai-product-photo` for the prospect's product category

---

*Built for ENT Agency — 2026-02-25*
