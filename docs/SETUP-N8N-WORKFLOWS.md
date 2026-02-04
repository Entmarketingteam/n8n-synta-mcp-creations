# Set up workflows in n8n (entagency.app.n8n.cloud)

Get the **Content Repurposing** and **Advanced Content Creator** workflows into your n8n instance.

---

## Deployed workflows (already in n8n)

These three workflows were imported via the n8n API and are live on **entagency.app.n8n.cloud**:

| Workflow | n8n link | ID |
|----------|----------|-----|
| Content Repurposing – Downloader Agent | [Open](https://entagency.app.n8n.cloud/workflow/RGCTvSBPSzSEZH5f) | `RGCTvSBPSzSEZH5f` |
| Content Repurposing – Uploader Agent | [Open](https://entagency.app.n8n.cloud/workflow/p3WwjbP9MzWTqi2k) | `p3WwjbP9MzWTqi2k` |
| Advanced Content Creator Agent | [Open](https://entagency.app.n8n.cloud/workflow/qyHZYQ0iVZjAUJqT) | `qyHZYQ0iVZjAUJqT` |

**Next:** Open each workflow in n8n and connect credentials (Google Sheets, OpenAI, Slack, etc.). See **After import** below.

---

## Synta MCP (for this project)

To use **Synta MCP** in Cursor for this repo (build/edit workflows via AI):

1. **Global config:** Synta MCP is in your `~/.cursor/mcp.json` using the **`mcp-remote`** package (not `@anthropic-ai/mcp-client`, which does not exist on npm). The correct command is:  
   `npx -y mcp-remote https://mcp.synta.io/mcp` with `--header` args for Authorization, X-N8n-Url, X-N8n-Key (and optionally X-N8n-Login-Email / X-N8n-Login-Password for self-healing).
2. **Enable for this workspace:** In Cursor, ensure the **synta-mcp** server is enabled (Settings → MCP).
3. Once connected, you can say e.g. “Search for the Slack node in n8n” or “Create a workflow that…” and the agent will use Synta’s n8n tools.

**If you see “@anthropic-ai/mcp-client is not in this registry” or “No server info found”:** Your `~/.cursor/mcp.json` was updated to use `mcp-remote` instead. Restart Cursor (or reload the window) and try again.

**If you see “npm notice Access token expired or revoked”:** That’s an npm auth notice and often doesn’t block `npx -y mcp-remote`. If MCP still fails, run `npm logout` and retry, or ensure you’re not using a private registry that requires login.

---

## Option A: Import via UI (if you need to re-import)

### 1. Sign in to n8n

1. Open **https://entagency.app.n8n.cloud**
2. Sign in with your email and password.

### 2. Import each workflow from file

Workflow JSON files are in the repo under **`workflows/`**. For RoboNuggets and other template workflows (UGC, Split AI, Ad Creator, etc.), see **`workflows/robonuggets/`** and its [README](../workflows/robonuggets/README.md); import from file or use `node scripts/import-workflows-to-n8n.js workflows/robonuggets/<filename>.json`.

| Workflow | File |
|----------|------|
| Content Repurposing – Downloader Agent | `workflows/robonuggets/content-repurposing-downloader-agent.json` |
| Content Repurposing – Uploader Agent | `workflows/robonuggets/content-repurposing-uploader-agent.json` |
| Advanced Content Creator Agent | `workflows/advanced-content-creator-agent.json` |

**Steps (repeat for each file):**

1. In n8n: **Workflows** (left sidebar) → **Add workflow** (or open the workflows list).
2. Open the **⋮** menu (top right) → **Import from file** (or **Import** → **From file**).
3. Choose the JSON file from your machine (e.g. from `n8n-synta-mcp-creations/workflows/`).
4. After import, **Save** (and fix any red “missing credential” nodes by reconnecting).

### 3. Configure after import

- **Content Repurposing (Downloader / Uploader)**  
  See **`workflows/robonuggets/README-content-repurposing.md`** for Apify token, Blotato API key, and Google Sheet doc/sheet names.

- **Advanced Content Creator**  
  See **`workflows/README-advanced-content-creator.md`** for Google Sheets, OpenAI, ElevenLabs, piapi.ai, Creatomate, and Slack.

---

## Option B: Import via n8n API (optional)

If your n8n instance has **API** enabled and you have an **API key**, you can import the same JSON files with the script below.

### 1. Get your n8n API key

1. In n8n: **Settings** (gear) → **API** (or **Security** / **API**).
2. Create an API key if you don’t have one.
3. Set it in your environment, e.g.  
   `export N8N_API_KEY="your-api-key"`  
   and optionally  
   `export N8N_BASE_URL="https://entagency.app.n8n.cloud"`  
   (default is that URL if not set).

### 2. Run the import script

From the **project root** (`n8n-synta-mcp-creations`):

```bash
export N8N_API_KEY="your-api-key"   # or use value from ~/.cursor/mcp.json
node scripts/import-workflows-to-n8n.js
```

To import only one workflow (path relative to `workflows/`):

```bash
node scripts/import-workflows-to-n8n.js advanced-content-creator-agent.json
node scripts/import-workflows-to-n8n.js robonuggets/content-repurposing-downloader-agent.json
```

The script discovers all `*.json` under `workflows/` (including `workflows/robonuggets/`) and sends each to `POST /api/v1/workflows`.  
If the API or key is not configured, the script will exit with a short message; use **Option A** instead.

---

## After import (all options)

1. **Credentials**  
   Open each workflow and set:
   - **Google Sheets** (and **Google Drive** for Advanced Content Creator).
   - **Slack** (Advanced Content Creator only).
   - **OpenAI** (Advanced Content Creator only).

2. **API keys (env or in nodes)**  
   - Repurposing: Apify token, Blotato API key.  
   - Advanced Content Creator: ElevenLabs, piapi.ai, Creatomate (see READMEs).

3. **Sheet / doc IDs**  
   - Repurposing: same Google Sheet for Downloader (append) and Uploader (read).  
   - Advanced Content Creator: your copy of the template spreadsheet and sheet names (see README).

4. **Activate when ready**  
   Turn each workflow **Active** (toggle) only after credentials and IDs are set.

---

## Quick links

- n8n: **https://entagency.app.n8n.cloud**
- Repurposing: **`workflows/robonuggets/README-content-repurposing.md`**
- Advanced Content Creator: **`workflows/README-advanced-content-creator.md`**
