# Environment / config keys (ent-tools)

Central list of env key names used across tools. **No secrets in this file**—only key names and what they’re for.

## MarkItDown API (`markitdown-api/`)

| Key | Required | Description |
| --- | -------- | ----------- |
| (none for basic use) | — | No secrets required for basic conversion. |
| `PORT` | No | Server port (default e.g. 8080). Railway/Render set this. |

Optional (future):

- `DOCINTEL_ENDPOINT`, `DOCINTEL_KEY` — Azure Document Intelligence (if enabled).
- `LLM_*` — If you enable LLM for image descriptions in MarkItDown.

## n8n (workflows)

Set these as **n8n variables** or in the workflow’s HTTP Request node (from credentials/env):

| Key | Description |
| --- | ----------- |
| `MARKITDOWN_API_URL` or `tools.markitdown.url` | Base URL of the MarkItDown API (e.g. your Railway deploy). No trailing slash. Used by **Call MarkItDown API** in workflow `BaABQXevdM8jJVuH`. |

Slack app for the MarkItDown scenario: App ID **A0ACJ4HNKDY**. Client ID and where to set secrets: see [ent-tools/docs/MARKITDOWN-SLACK-APP.md](../docs/MARKITDOWN-SLACK-APP.md). Slack and LLM credentials are configured in n8n credentials only.

## Repo-level `.env.example`

For local development and reference:

```
# MarkItDown API (when running markitdown-api locally)
# Not needed for basic conversion.

# When calling MarkItDown API from n8n or scripts:
MARKITDOWN_API_URL=http://localhost:8080
```
