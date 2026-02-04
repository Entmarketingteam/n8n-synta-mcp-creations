# Slack file → MarkItDown → LLM → reply

Upload a file in Slack; the workflow converts it to markdown (via MarkItDown API), sends the markdown to an LLM, and posts the summary or answer back in the same channel/thread.

## Flow (normalized)

1. **Webhook** – Slack Event Subscriptions send `file_shared` (or message with file) to this workflow.
2. **Normalize inbound** – Map Slack event to internal shape: `source`, `channel_id`, `thread_ts`, `file_id`, `filename`, `ok`.
3. **Slack get file info** – Slack node “get” / resource “file” by `file_id`; returns metadata including `url_private_download`.
4. **Download file from Slack** – HTTP Request GET to `url_private_download` with **Authorization: Bearer &lt;Slack Bot Token&gt;** (use n8n “Header Auth” credential with header name `Authorization`, value `Bearer xoxb-...`). Response format: File, output property `data`.
5. **Call MarkItDown API** – POST to `{{ $env.MARKITDOWN_API_URL }}/convert` (or `$vars.tools.markitdown.url`) with multipart form field `file` = binary (from previous step’s `data`). Uses normalized URL from config.
6. **Normalize MarkItDown response** – Map response to internal shape: `ok`, `markdown`, `error`, `stage`; keep `channel_id`, `thread_ts` from “Normalize inbound”.
7. **IF Conversion OK?** – Branch on `ok`. False → **Slack reply (error)** and stop. True → continue.
8. **OpenAI Chat** – Inject `markdown` into prompt; get LLM response.
9. **Normalize LLM output** – Set `llm_response`, `channel_id`, `thread_ts`, `ok: true`.
10. **Slack reply (success)** – Post `llm_response` to `channel_id` (and `thread_ts` if set).

## Setup

### 1. MarkItDown API

- Deploy `markitdown-api/` to Railway (or Render). See [markitdown-api/README.md](../markitdown-api/README.md).
- Note the base URL (e.g. `https://markitdown-api.railway.app`).

### 2. n8n variables / env

- Set **n8n variable** or env: `MARKITDOWN_API_URL` = base URL of your MarkItDown API (no trailing slash). Alternatively use `tools.markitdown.url` if you use that naming.

### 3. Slack app (this workflow) and credentials

- **Slack app:** App ID **A0ACJ4HNKDY**, Client ID `6255452579572.10426153767474`. Full reference: [ent-tools/docs/MARKITDOWN-SLACK-APP.md](../docs/MARKITDOWN-SLACK-APP.md). Set Client Secret, Signing Secret, and Verification Token only in n8n and in the Slack app settings (never in this repo).
- **Slack OAuth2:** In n8n, create a credential with this app’s Client ID and Client Secret; complete the OAuth flow. Assign to **Slack get file info**, **Slack reply (success)**, **Slack reply (error)**.
- **Slack Bot Token (Bearer):** In n8n, use the **HTTP Header Auth** credential with header `Authorization`, value `Bearer xoxb-...` (Bot User OAuth Token from the same app after install). Assign to **Download file from Slack**.
- **Event Subscriptions** → Request URL: `https://entagency.app.n8n.cloud/webhook/slack-markitdown`. Subscribe to `file_shared` (and optionally `message` with `files`).
- If you use the **Manual Trigger** for testing, you can skip Event Subscriptions until you’re ready.

### 4. OpenAI credential

- Add **OpenAI** credential in n8n (API key). Assign it to the “OpenAI Chat” node.

### 5. Import workflow

- Import `slack-markitdown-llm.json` into n8n.
- Set credentials on **Slack get file**, **Slack reply (success)**, **Slack reply (error)**, and **OpenAI Chat**.
- Ensure **Call MarkItDown API** URL uses `$env.MARKITDOWN_API_URL` or your variable (no hardcoded URL).
- Save and activate. For production, use the **Webhook** trigger and point Slack Event Subscriptions to the webhook URL.

## Testing

- **Manual Trigger:** Use “Manual Trigger (test)” and in the first **Set** (normalize inbound) provide test values for `channel_id`, `thread_ts`, `file_id`. You’ll need a real Slack file ID and binary for “Slack get file” and “Call MarkItDown API” to work; or temporarily replace “Slack get file” with a node that loads a test file from disk/URL.
- **Webhook:** After activating, upload a file in a Slack channel the app is in; the workflow runs and replies in that channel (or thread).

## Contract

See [shared/contracts/CONTRACTS.md](../shared/contracts/CONTRACTS.md) for the normalized payload shape and adapter boundaries. If Slack or the MarkItDown API changes, only the corresponding adapter node(s) need to change; the rest of the workflow uses the same internal fields.
