# ent-tools

One repo for small operational tools and automations (MarkItDown API, future LTK/ShopMy helpers, etc.). All tools and n8n workflows use **normalized contracts** so one API change only requires swapping the affected part.

## Structure

```
ent-tools/
├── shared/                 # Contracts and config (required)
│   ├── contracts/         # Normalized payload shapes – see CONTRACTS.md
│   └── config/            # Env key names – see env-keys.md
├── markitdown-api/        # MarkItDown HTTP API (file → markdown)
├── workflows/             # n8n workflow JSON (versioned)
├── .env.example
└── README.md
```

## Design

- **Normalized payloads:** Pipelines use a single internal shape (`ok`, `markdown`, `llm_response`, `error`, `stage`, etc.). Adapters (Slack, MarkItDown, LLM) map external APIs to this shape. See [shared/contracts/CONTRACTS.md](shared/contracts/CONTRACTS.md).
- **Config over code:** URLs and keys come from n8n variables or env; no hardcoded endpoints in workflow JSON or tool code. See [shared/config/env-keys.md](shared/config/env-keys.md).
- **Error boundaries:** Every external call returns `{ ok, data?, error?, stage? }`. Workflows branch on `ok` and never crash the run.

## Tools

| Tool | Purpose |
|------|---------|
| [markitdown-api](markitdown-api/) | POST a file, get markdown. Used by Slack → MarkItDown → LLM workflow. |

## Workflows

| Workflow | Description |
|----------|-------------|
| [slack-markitdown-llm](workflows/README-slack-markitdown-llm.md) | Slack file upload → MarkItDown → LLM → reply in Slack. Slack app: **A0ACJ4HNKDY**. |

Import workflow JSON from `workflows/` into n8n; set **MARKITDOWN_API_URL** (n8n variable) and Slack/LLM credentials. Full app and URL reference: [docs/MARKITDOWN-SLACK-APP.md](docs/MARKITDOWN-SLACK-APP.md).

## Quick start

1. Clone this repo; open in Cursor/Claude at this folder.
2. Copy `.env.example` to `.env` and set `MARKITDOWN_API_URL` after you deploy the API.
3. Run MarkItDown API locally: `cd markitdown-api && pip install -r requirements.txt && python app.py`.
4. Deploy MarkItDown API to Railway (or Render); set `MARKITDOWN_API_URL` in n8n.
5. Import `workflows/slack-markitdown-llm.json` into n8n, configure Slack + LLM credentials and the MarkItDown URL variable.

## Adding new tools

- Put the tool in its own folder (e.g. `ltk-helper/`).
- Have it accept/return the same normalized shape where it plugs into orchestration; use `{ ok, data?, error?, stage? }`.
- Read config from env; document keys in `shared/config/env-keys.md`.
- Add a row to the Tools table above and a short README in the tool folder.
