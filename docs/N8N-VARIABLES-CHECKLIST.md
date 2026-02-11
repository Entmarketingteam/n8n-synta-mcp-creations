# n8n Variables Checklist (from Doppler)

Add these as **Variables** or **environment variables** in your n8n instance so workflows can use `$env.VAR_NAME` (or `$vars.VAR_NAME` on Pro/Enterprise).

**Your instance:** https://entagency.app.n8n.cloud

---

## Preferred: n8n connects to Doppler (no keys in n8n)

So you **don’t put logins or API keys in n8n** at all: install the **Doppler community node**, add **one Doppler credential** (service token), and in each workflow use a **Doppler node (Secrets → Retrieve)** to fetch the secret by name. n8n then reads from Doppler at runtime.

**Full steps:** [N8N-DOPPLER-SETUP.md](N8N-DOPPLER-SETUP.md)

---

## Sync from Doppler (alternative: copy into n8n Variables)

The n8n Public API supports **Variables** (POST/GET/PUT). Use the script so secrets never leave your machine:

```bash
doppler run -- node scripts/sync-doppler-to-n8n-variables.js
```

- Reads `N8N_API_KEY` and `N8N_HOST` (or `N8N_BASE_URL`) from Doppler.
- For every other key in the script’s list, if it’s set in Doppler it’s created or updated in n8n Variables.
- Requires n8n **Pro/Enterprise** (Variables API).

**Synta MCP** can manage **credentials** (`n8n_manage_credentials`: create, get_schema, check_workflow). For API keys that map to a credential type (e.g. OpenAI, Anthropic), you can create credentials via MCP; for arbitrary key/value pairs use the sync script above or the UI.

---

## Where to add in n8n (manual)

- **n8n Cloud:** Open your instance → **Settings** (gear) or **Variables** (if you have Pro/Enterprise). Add each key with its value.  
  - If your plan has **Variables**: use **Add Variable**, set scope **Global**, key = name below, value = from Doppler. Workflows use `$env.X`; on some setups Variables may be exposed as `$vars.X` — if so, we can update workflow expressions.
- **Self‑hosted:** Set real env vars where n8n runs (e.g. Docker `environment:`, or `.env`), then workflows’ `$env.X` will work.

---

## Variable names to add (copy values from Doppler)

Get values locally (no paste here):

```bash
doppler secrets --only-names   # list names
doppler secrets get OPENAI_API_KEY --plain   # get one value
```

Then in n8n, add each variable with the **exact name** below.

| # | Variable name | Used by |
|---|----------------|--------|
| 1 | N8N_HOST | Scripts / links |
| 2 | N8N_API_KEY | Scripts, MCP |
| 3 | GOOGLE_API_KEY | Google nodes / APIs |
| 4 | BROWSERBASE_API_KEY | Browserbase runners |
| 5 | BROWSERBASE_PROJECT_ID | Browserbase runners |
| 6 | OPENAI_API_KEY | OpenAI nodes |
| 7 | RAILWAY_API_KEY | Railway deploys |
| 8 | FIRECRAWL_API_KEY | Firecrawl / scraping |
| 9 | ANTHROPIC_API_KEY | Anthropic nodes |
| 10 | PINECONE_API_KEY | Pinecone |
| 11 | PINECONE_VIRAL_LTK_KEY | LTK / Pinecone |
| 12 | DATAFORSEO_API_KEY | DataForSEO |
| 13 | PERPLEXITY_API_KEY | Perplexity |
| 14 | SERPAPI_API_KEY | SerpAPI |
| 15 | SUPABASE_API_KEY | Supabase |
| 16 | HUGGINGFACE_API_KEY | Hugging Face |
| 17 | FINDYMAIL_API_KEY | Findymail |
| 18 | SMARTLEAD_API_KEY | Smartlead |
| 19 | SLACK_ACCESS_TOKEN | Slack (or use credential) |
| 20 | SLACK_REFRESH_TOKEN | Slack (or use credential) |
| 21 | CLERK_PUBLISHABLE_KEY | Clerk |
| 22 | CLERK_SECRET_KEY | Clerk |
| 23 | MEILISEARCH_API_KEY | Meilisearch |
| 24 | MEILISEARCH_HOST | Meilisearch |
| 25 | DEEPGRAM_API_KEY | Deepgram |
| 26 | BLOTATO_API_KEY | Blotato / content workflows |
| 27 | AIRTOP_API_KEY | Airtop |
| 28 | GCP_SERVICE_ACCOUNT_EMAIL | GCP (e.g. LTK scraper) |

**ShopMy / Mavely / LTK (creator-specific):**

| Variable pattern | Example | Used by |
|------------------|---------|--------|
| SHOPMY_*_PASSWORD, SHOPMY_*_EMAIL, SHOPMY_*_USER_ID | SHOPMY_NICKI_PASSWORD | ShopMy Payout Summary, API workflows |
| MAVELY_*_EMAIL, MAVELY_*_PASSWORD | MAVELY_EMAIL, MAVELY_PASSWORD | Mavely Creators Daily |
| LTK_*_EMAIL, LTK_*_PASSWORD | (per creator) | LTK workflows |

**Optional (if you use them):**

- SHOPMY_GSHEET_URL, SHOPMY_AIRTABLE_BASE, SHOPMY_AIRTABLE_TABLE  
- AMAZON_CREATORS_API_CLIENT_ID, AMAZON_CREATORS_API_CLIENT_SECRET  
- MARKITDOWN_API_URL  
- WEBFLOW_COLLECTION_ID  
- ELEVENLABS_API_KEY, CREATOMATE_API_KEY, PIAPI_API_KEY, APIFY_TOKEN, APIFY_TIKTOK_ACTOR_ID  

---

## After adding

- Workflows that use `$env.VAR_NAME` will pick these up once the variable exists in n8n.
- If n8n only exposes UI Variables as `$vars.VAR_NAME`, say so and we can switch those workflow expressions from `$env` to `$vars`.
