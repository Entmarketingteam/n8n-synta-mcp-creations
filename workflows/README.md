# n8n Workflows — Master Index

All n8n workflow JSON files for the ENT Agency OpenClaw operations. Organized by category with READMEs and setup instructions in each folder.

## Quick Start

```bash
# Import all workflows to n8n (requires N8N_API_KEY)
node scripts/import-workflows-to-n8n.js

# Import a single workflow
node scripts/import-workflows-to-n8n.js ent-agency/contract-review-ent-agency.json

# Or import via n8n UI: Workflows → Add workflow → ⋮ → Import from file
```

After import, open each workflow in n8n and connect the required credentials. See each category's README for specifics.

---

## Categories

### [`ent-agency/`](./ent-agency/) — ENT Agency Operations (4 workflows)
Core business workflows: contract review, Gmail→Notion sync, SEO blog writer.

| Workflow | Trigger | Key Integrations |
|----------|---------|-----------------|
| Contract Review — Automation | Google Drive upload | Google Drive, Sheets, PDF Vector, Slack |
| Contract Review — ENT Agency | Google Drive upload | Google Drive, Sheets, PDF Vector, Slack |
| Gmail Emails to Notion | Schedule | Gmail, Notion |
| SEO Blog Writer | Form | Anthropic Claude, Slack |

### [`content-creation/`](./content-creation/) — Content & Video (16 workflows)
AI video generation, social media publishing, image creation, and written content.

| Workflow | Trigger | Key Integrations |
|----------|---------|-----------------|
| Blotato Agent | Telegram | OpenAI, Blotato |
| Blotato Multi-Platform | Telegram | Blotato (54 nodes) |
| Auto Content Publishing | Schedule | Blotato, Google Sheets |
| GPT-5 Social Videos | Telegram | OpenAI, Blotato, Google Drive |
| AI Social Video Generator | Telegram | OpenAI, Kling, Google Sheets |
| Telegram GPT-4 Blotato Videos | Telegram | OpenAI, Blotato, Google Sheets |
| HeyGen Idea-to-Post | Telegram | HeyGen, OpenAI, Blotato |
| HeyGen II Clone Me | Telegram | HeyGen, OpenAI, Blotato |
| Clone Video Ads Factory | Manual/Schedule | NanoBanana, Kling, Blotato, Airtable |
| Clone Viral TikTok | Telegram | Perplexity, Blotato |
| Split Shots 6-Panel | Schedule | Airtable |
| Abyssale Image Generator | Telegram/Form | Abyssale, OpenAI, Blotato |
| E-commerce Product Images | Form | NanoBanana, OpenAI, Google Drive |
| YouTube Thumbnail Creator | Telegram | Blotato, OpenAI, Google Drive |
| SEO Listicle Article Writer | Form | Anthropic, OpenAI, Gemini, Slack |

### [`ai-agents/`](./ai-agents/) — AI Agents (7 workflows)
Voice, phone, and chat AI agents plus app backends.

| Workflow | Trigger | Key Integrations |
|----------|---------|-----------------|
| AI Voice Agent (ElevenLabs) | Webhook | OpenAI, ElevenLabs, Google Suite |
| Phone Agent (RetellAI) | Sheets/Webhook | RetellAI, Twilio, OpenAI |
| Voice Chat Bot | Webhook | OpenAI, Anthropic, Google Suite, SerpAPI |
| Build First AI Agent | Chat | OpenAI, Gmail, Google Calendar/Sheets |
| AI Analysis App Backend | Webhook | OpenAI |
| AI Analysis App History | Webhook | HTTP |
| Calorie App Backend | Webhook | OpenAI |

### [`automation/`](./automation/) — General Automation (2 workflows)
Data collection and CRM workflows.

| Workflow | Trigger | Key Integrations |
|----------|---------|-----------------|
| Airtable Automation Demo | Webhook | Airtable, Google Cloud Storage |
| Product Data WhatsApp+GPT-4 | WhatsApp message | WhatsApp, OpenAI, Google Sheets |

### [`google-maps/`](./google-maps/) — Lead Generation (3 workflows)
Multi-workflow Google Maps business extraction system.

| Workflow | Trigger | Key Integrations |
|----------|---------|-----------------|
| Google Maps Main Agent | Chat | OpenAI, SerpAPI |
| Maps Extractor Subworkflow | Execute Workflow | Google Sheets |
| Website Crawler Subworkflow | Execute Workflow | Google Sheets |

### [`robonuggets/`](./robonuggets/) — RoboNuggets Templates (15+ workflows)
Premium workflow templates from [RoboNuggets](https://www.robonuggets.com/). See [robonuggets/README.md](./robonuggets/README.md).

### [`slack-markdown-pack/`](./slack-markdown-pack/) — Slack to Markdown (2 workflows)
Convert Slack URLs and Substack posts to Markdown via Firecrawl.

---

## Pre-existing Workflows (root level)

These workflows were already organized with individual READMEs:

| Workflow | README | Description |
|----------|--------|-------------|
| `advanced-content-creator-agent.json` | [README](./README-advanced-content-creator.md) | Slideshow & video content creator |
| `amazon-associates-report-ingest.json` | [README](./README-amazon-report-ingest.md) | Amazon Associates data pipeline |
| `amazon-creators-api-get-token.json` | — | Amazon Creators API token retrieval |
| `blog-to-cms.json` | [README](./README-blog-to-cms.md) | Blog post to CMS publisher |
| `doppler-universal-secrets-node.json` | [README](./README-doppler-universal.md) | Doppler secrets management node |
| `ltk-token-rotation-fixed.json` | — | LTK OAuth token rotation |
| `ltk-reports-to-google-sheets.json` | — | LTK reports → Google Sheets |
| `mavely-creators-daily.json` | [README](./README-mavely-creators.md) | Mavely creator data sync |
| `shopmy-api-creators.json` | [README](./README-shopmy-creators.md) | ShopMy API creator import |
| `shopmy-csv-processor-creators.json` | [README](./README-shopmy-creators.md) | ShopMy CSV processor |
| `shopmy-browserbase-login.json` | [README](./README-browserbase-login.md) | ShopMy Browserbase login |
| `shopmy-payout-summary-creators.json` | [README](./README-shopmy-payout-summary.md) | ShopMy payout summaries |
| `web-scrape-csv-email-sheets.json` | [README](./README-web-scrape-csv.md) | Web scrape → CSV → email → Sheets |

---

## Credential Reference

Common credentials used across workflows:

| Credential | Used By | Setup |
|------------|---------|-------|
| OpenAI API | Most workflows | n8n → Credentials → OpenAI |
| Anthropic API | SEO writers, Voice Bot | n8n → Credentials → Anthropic |
| Google OAuth2 (Sheets/Drive/Calendar/Gmail) | Many | n8n → Credentials → Google (OAuth2) |
| Telegram API | Content creation workflows | Create bot via @BotFather |
| Blotato API | Social media publishing | [blotato.com](https://blotato.com) |
| Slack API/OAuth2 | Notifications | Slack App with bot token |
| Airtable Token | Video factories, automation | Airtable → Account → API |
| SerpAPI | Google Maps | [serpapi.com](https://serpapi.com) |
| Twilio API | Phone agent | [twilio.com](https://twilio.com) |
| WhatsApp API | WhatsApp automation | Meta Business Suite |

**All secrets managed via Doppler** — never hardcode API keys in workflow JSON.
