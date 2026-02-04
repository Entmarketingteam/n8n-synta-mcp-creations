# RoboNuggets and template workflows

This folder contains workflow templates and packs from the **RoboNuggets paid group** ([RoboNuggets](https://www.robonuggets.com/)). They are video/social workflows that are high quality and ready to tweak for our use case. Versioned here so you can import them into your n8n instance or reference them via Synta MCP.

## Contents

| File / folder | Description / original name |
|---------------|-----------------------------|
| `AI-Studio-System-Prompt.txt` | AI Studio system prompt (reference) |
| `R35-meetRobo.json` | Meet Robo (R35) |
| `R36-ad-creator-ai-agent.json` | The Ad Creator AI Agent (R36) |
| `R37-logoRobo.json` | LogoRobo (R37) |
| `R38-ugc-ads-factory.json` | AI UGC Ads Factory – production (R38) |
| `R38-improved.json` | AI UGC Ads Factory – improved (R38) |
| `R39-split-ai-system.json` | Split AI System (R39) |
| `R46-ultimate-extract.json` | Ultimate Extract (R46) |
| `R51-creative-cloner-ai-agent.json` | The Creative Cloner AI Agent (R51) |
| `researchRobo_v0_1.json` | researchRobo v0.1 |
| `tweetRobo_v0_1.json` | tweetRobo v0.1 |
| `n12-blotato-node.json` | RoboNuggets Blotato n8n node (n12) |
| `n15-infinite-ugcs.json` | Infinite UGCs, any length, any character (n15) |
| `n18-chatgpt4o-ugcs.json` | ChatGPT 4o UGCs, any length, any character (n18) |
| `n18-nanobanana-ugcs.json` | Nanobanana UGCs, any length, any character (n18) |
| `n21-template-pack/` | Unzipped: n21 Template Pack by RoboNuggets |
| `n29-templates/` | Unzipped: n29 Templates |
| `content-repurposing-downloader-agent.json` | Schedule → Apify TikTok → Google Sheets (see [README-content-repurposing.md](./README-content-repurposing.md)) |
| `content-repurposing-uploader-agent.json` | Read Sheets → Blotato → Publish (see [README-content-repurposing.md](./README-content-repurposing.md)) |

**Note:** The SEO Audit and Optimization Report for Nickient zip is not in this repo; you can keep it locally and unzip if needed.

## Plug-and-play tweaks

After import, configure in n8n and document "our use" so the same workflow is easy to reuse. Standard tweak points:

| Tweak point | Where in n8n | Our use (example) |
|-------------|--------------|-------------------|
| Google Sheet ID / sheet name | Node that reads or writes Sheets | e.g. "Creator Video Log" |
| API keys (OpenAI, Apify, Blotato, etc.) | Credentials or env vars in nodes | Set in n8n credentials; no hardcode in JSON |
| Schedule (cron) | Schedule Trigger node | e.g. daily 9:00 |
| Webhook path | Webhook node | If you expose a custom path |

See **[docs/WORKFLOW-TWEAKS.md](../docs/WORKFLOW-TWEAKS.md)** for standard tweak types and where to document them.

## How to use

**Import all workflows (recommended)**

From the project root, with `N8N_API_KEY` set:

```bash
node scripts/import-workflows-to-n8n.js
```

This discovers all `*.json` under `workflows/` (including this folder) and pushes them to n8n. Then open n8n and re-attach credentials per workflow.

**Import a single workflow**

```bash
node scripts/import-workflows-to-n8n.js robonuggets/R39-split-ai-system.json
```

Pass the path **relative to `workflows/`** (e.g. `robonuggets/n18-chatgpt4o-ugcs.json`).

**Import via n8n UI**

1. In n8n: **Workflows** → **Add workflow** → **⋮** (menu) → **Import from file**.
2. Choose the `.json` file from this folder (or from a subfolder).

**After import:** Open each workflow in n8n and connect required credentials (OpenAI, Google Sheets, etc.). See [docs/SETUP-N8N-WORKFLOWS.md](../docs/SETUP-N8N-WORKFLOWS.md) for full setup.
