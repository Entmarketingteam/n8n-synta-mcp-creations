# Where to add your API keys (reference only – no secrets in this repo)

Use this as a checklist. **Add keys only in n8n Credentials, in your n8n instance env, or in a local `.env` file (never commit `.env`).**

---

## n8n (entagency.app.n8n.cloud)

### 1. n8n API key (for importing workflows via script)

- **Where:** Environment when running the import script, or n8n **Settings → API** to create/copy the key.
- **Use:** `export N8N_API_KEY='your-key'` then run `node scripts/import-workflows-to-n8n.js` from project root.
- **Do not** put this in any file in the repo.

### 2. Credentials to create **inside n8n** (per workflow)

Add these in n8n: **Credentials** (left sidebar) or when opening a node that needs auth.

| Credential type | Used by | What to paste |
|----------------|--------|----------------|
| **Google Sheets OAuth2** | Repurposing + Advanced Content Creator | Connect with your Google account (OAuth). |
| **Google Drive OAuth2** | Advanced Content Creator (upload voiceover) | Same Google account. |
| **OpenAI API** | Advanced Content Creator (STORY CREATION, VOICEOVER TEXT CLEANUP) | Your OpenAI API key. |
| **Slack OAuth2** | Advanced Content Creator (notify, “Choose your image”) | Connect Slack app (OAuth). |
| **HTTP Header Auth** (optional) | Any workflow calling an API that uses a header key | Name e.g. `x-api-key`, value = your key. |

### 3. API keys used **inside** workflow nodes (or via n8n instance env)

These can be set as **environment variables on your n8n instance** (if you have access), or you can paste the key into the node (not recommended for shared repos). Prefer n8n Credentials where possible.

| Key you have | Used in workflow | Where to set |
|--------------|------------------|---------------|
| **OpenAI API Key** | Advanced Content Creator (LLM + cleanup) | n8n **OpenAI API** credential. |
| **ElevenLabs** | Advanced Content Creator (CREATE VOICEOVER) | Node header `xi-api-key` or env `ELEVENLABS_API_KEY`. (You didn’t list one – add when you have it.) |
| **piapi.ai / Midjourney** | Advanced Content Creator (CREATE IMAGE, GET IMAGES) | Node header `x-api-key` or env `PIAPI_API_KEY`. (Add when you have it.) |
| **Creatomate** | Advanced Content Creator (CREATE LONGFORM / SHORTS / SQUARE) | Node header `Authorization: Bearer <key>` or env `CREATOMATE_API_KEY`. (Add when you have it.) |
| **Apify** | Content Repurposing – Downloader Agent | Node URL/query or env `APIFY_TOKEN` + `APIFY_TIKTOK_ACTOR_ID`. |
| **Blotato** | Content Repurposing – Uploader Agent | Node header `blotato-api-key` or env `BLOTATO_API_KEY`. Set in the two HTTP nodes (“Set Blotato IDsReady…” and “Publish or Webhook”). |

---

## Other projects in this repo

| Key | Typical use | Where to set |
|-----|-------------|--------------|
| **Browserbase API Key + Project ID** | shopmy-browserbase-runner | Runner’s `.env` or host env (see `shopmy-browserbase-runner/.env.example`). |
| **Railway API Key** | Deploying runner to Railway | Railway project env / CLI. |
| **Firecrawl, Anthropic, Pinecone, etc.** | Other apps / workflows | That app’s env or config; not stored in this repo. |

---

## Security

- **Do not** commit real keys to git. Use `.env` (already in `.gitignore`) or your host’s env / secrets.
- If you ever pasted a key into a chat or shared document, **rotate** that key in the provider’s dashboard and replace it everywhere you use it.
- Prefer **n8n Credentials** and **env vars** over pasting keys into workflow JSON.
