# Picking up with Synta MCP and n8n MCP – end to end in Slack

Yes. **Synta MCP and n8n MCP can create the workflow on your n8n instance** so you can finish setup and have it running end-to-end in Slack. Here’s what MCP does vs what you do.

---

## Your workflow (already created)

- **n8n workflow ID:** `BaABQXevdM8jJVuH`
- **Name:** Slack file → MarkItDown → LLM → reply
- **URL:** Open in n8n: `https://entagency.app.n8n.cloud/workflow/BaABQXevdM8jJVuH`
- **Webhook path (after you activate):** `https://entagency.app.n8n.cloud/webhook/slack-markitdown` — use this as the **Request URL** in Slack Event Subscriptions.
- **Slack app for this scenario:** App ID `A0ACJ4HNKDY`, Client ID `6255452579572.10426153767474`. Full config (and where to set secrets): [MARKITDOWN-SLACK-APP.md](MARKITDOWN-SLACK-APP.md).

After creation, MCP ran **autofix** (typeVersion upgrades + parameter nesting fixes). You may need to re-add some node parameters in the n8n UI if any were cleared (e.g. Set node assignments, HTTP response format, Slack resource/operation, OpenAI operation). Then assign credentials, set `MARKITDOWN_API_URL`, and activate.

---

## What Synta / n8n MCP can do

| Action | MCP tool | What it does |
|--------|----------|---------------|
| **Create the workflow** | `n8n_create_workflow` | Deploys the Slack → MarkItDown → LLM workflow (nodes + connections) to your n8n instance (e.g. entagency.app.n8n.cloud). Workflow is created **inactive**. |
| **Validate the workflow** | `n8n_validate_workflow` | Checks nodes and connections after create or after you assign credentials. |
| **Update the workflow** | `n8n_update_partial_workflow` / `n8n_update_full_workflow` | Change nodes, connections, or settings (e.g. fix a node, add a variable). |
| **Get workflow / webhook URL** | `n8n_get_workflow` | After activation, you can get the workflow (and see the webhook path) so you can copy the Slack Event Subscriptions request URL. |
| **Create credentials** (optional) | `n8n_manage_credentials` | Create Slack OAuth2, OpenAI, or Header Auth credentials **if** you provide the credential data. Prefer doing this in the n8n UI so you don’t paste secrets into chat. |

So: **MCP can create and validate the workflow on n8n.** It cannot configure your Slack app or deploy the MarkItDown API; you do those once.

---

## What you do (one-time)

1. **MarkItDown API**  
   Deploy `ent-tools/markitdown-api` to Railway (or Render). Set **n8n variable** `MARKITDOWN_API_URL` to that base URL (no trailing slash).

2. **Credentials in n8n**  
   In n8n → Credentials, create and assign:
   - **Slack OAuth2** – Slack app **App ID A0ACJ4HNKDY** (Client ID `6255452579572.10426153767474`); set Client Secret and complete OAuth. Assign to “Slack get file info”, “Slack reply (success)”, “Slack reply (error)”.
   - **HTTP Header Auth** – “Slack Bot Token (Bearer)”, header `Authorization`, value `Bearer xoxb-...` (Bot User OAuth Token for the same app). Assign to “Download file from Slack”.
   - **OpenAI** – your API key; assign to “OpenAI Chat”.

3. **Slack app (Event Subscriptions)**  
   In Slack app **A0ACJ4HNKDY** → Event Subscriptions:  
   - Request URL = `https://entagency.app.n8n.cloud/webhook/slack-markitdown`.  
   - Subscribe to bot event `file_shared` (and optionally `message` with `files`).  
   - Reinstall the app if needed. Use Signing Secret / Verification Token only in Slack and n8n (never in this repo).

4. **Activate the workflow**  
   In n8n, open the workflow created by MCP, assign the credentials above, save, then toggle **Active** on. The webhook URL is then live for Slack.

---

## “Pick this back up” flow

1. **In Cursor (with Synta MCP / n8n MCP enabled)**  
   Say: “Create the Slack MarkItDown LLM workflow on my n8n instance from `ent-tools/workflows/slack-markitdown-llm.json`.”  
   The agent can call `n8n_create_workflow` with that file’s `name`, `nodes`, `connections`, and `settings`, then `n8n_validate_workflow`.

2. **In n8n**  
   - Set variable `MARKITDOWN_API_URL`.  
   - Create/assign the three credentials (Slack OAuth2, Header Auth for Slack bot, OpenAI).  
   - Activate the workflow and copy the webhook URL.

3. **In Slack app**  
   Set Event Subscriptions request URL to that webhook URL and subscribe to `file_shared`.

4. **Test**  
   Upload a file in a channel where the app is installed; the workflow should run and reply in Slack.

---

## Workflow JSON used by MCP

The payload for `n8n_create_workflow` is taken from:

**`ent-tools/workflows/slack-markitdown-llm.json`**

It already has:

- `name`: "Slack file → MarkItDown → LLM → reply"
- `nodes`: Webhook, Manual Trigger, Normalize inbound, Slack get file info, Download file from Slack, Call MarkItDown API, Normalize MarkItDown response, IF Conversion OK?, OpenAI Chat, Normalize LLM output, Slack reply (success), Slack reply (error)
- `connections`: as in the file
- `settings`: `{ "executionOrder": "v1" }`

Credentials in the JSON have empty `id`; n8n will show “missing credential” until you assign them in the UI (recommended).

---

## Summary

- **Synta MCP / n8n MCP** → Create (and validate) the workflow on your n8n instance so it’s ready to wire to Slack.
- **You** → Deploy MarkItDown API, set `MARKITDOWN_API_URL`, add and assign credentials in n8n, set Slack Event Subscriptions URL, activate the workflow.

After that, the flow is end-to-end in Slack: file upload → webhook → MarkItDown → LLM → reply in channel/thread.
