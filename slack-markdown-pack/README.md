# Slack → Markdown Pack (URL + Substack)

Paste a URL in Slack; the bot replies in a thread with Markdown. Uses **Firecrawl** for scraping – works on **n8n Cloud**.

## Workflows

| Workflow | Purpose |
|----------|---------|
| **Slack Bot: URL -> Firecrawl -> Markdown** | Any URL → Markdown |
| **Slack Bot: Substack -> Firecrawl -> Markdown** | Substack URL → Markdown |

**Credentials:**
- **Slack:** `Slack MarkItDown (Bot Token)` – already assigned
- **Firecrawl:** Set `FIRECRAWL_API_KEY` as an n8n variable (or in Doppler → sync to n8n)

## Setup

### 1. Get Firecrawl API key

Sign up at [firecrawl.dev](https://firecrawl.dev) and create an API key.

### 2. Add FIRECRAWL_API_KEY to n8n

**Option A – Doppler + sync script:**
```bash
doppler secrets set FIRECRAWL_API_KEY --project ent-agency-automation --config prd
doppler run --project ent-agency-automation --config prd -- node scripts/sync-doppler-to-n8n-variables.js
```

**Option B – n8n UI:** Settings → Variables → Add `FIRECRAWL_API_KEY`

### 3. Slack App configuration

Create a Slack app (or use an existing one) with:

- **Event Subscriptions**
  - Request URL = n8n webhook for "Slack Events Webhook" / "Slack Events Webhook (Substack)"
  - Bot events: `message.channels` (optional: `message.groups`)

- **Bot token scopes:** `chat:write`, `channels:history`

No Interactivity webhook needed – the Firecrawl workflows have no modals.

### 4. Import and activate

Import both workflows, then activate them so webhooks receive traffic.

### 5. Invite the bot to channels

Invite the Slack app bot to the channels where you want to paste URLs.

## Files

- `workflows/slack-markdown-pack/01_slack_url_to_markdown_firecrawl.json` – generic URL
- `workflows/slack-markdown-pack/02_slack_substack_to_markdown_firecrawl.json` – Substack

## Import

**Manual:** n8n → Workflows → Import from file → select the JSON files above.

**API (with N8N_API_KEY in Doppler):**
```bash
doppler run --project ent-agency-automation --config prd -- node scripts/import-workflows-to-n8n.js slack-markdown-pack/01_slack_url_to_markdown_firecrawl.json slack-markdown-pack/02_slack_substack_to_markdown_firecrawl.json
```

## Limitations

- **Gated/paywalled content:** Firecrawl cannot enter passwords or use cookies. If a page is gated or paywalled, the bot will reply that the page may be inaccessible.
- **Substack:** Free posts work. Paywalled posts will return a “may be paywalled” message.
