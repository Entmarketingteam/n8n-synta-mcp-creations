# MarkItDown scenario – Slack app and n8n config

Single source for the Slack app and URLs used by the **Slack file → MarkItDown → LLM → reply** workflow.

---

## Slack app (this workflow)

| Field | Value | Where to use |
| ----- | ----- | ------------ |
| **App ID** | `A0ACJ4HNKDY` | Slack app URL, docs, support. |
| **Client ID** | `6255452579572.10426153767474` | n8n Slack OAuth2 credential. |

**Set only in n8n and Slack (never in this repo):**

- **Client Secret** – In n8n: Slack OAuth2 credential. In Slack: Basic Information → App Credentials.
- **Signing Secret** – In Slack: Basic Information → App Credentials. Use for request verification if you enable it in n8n.
- **Verification Token** – In Slack: Event Subscriptions (if your app uses it). Use in n8n only if a node expects it.

**In n8n:**

1. Create a **Slack OAuth2** credential with this app’s **Client ID** and **Client Secret**, then complete the OAuth flow (“Connect my account”) so n8n has the Bot token.
2. Assign that credential to: **Slack get file info**, **Slack reply (success)**, **Slack reply (error)**, **Slack reply (no URL)**.
3. Use the **Slack Bot Token (Bearer)** Header Auth credential for **Download file from Slack** (value = `Bearer xoxb-...` from the same app after install).

---

## MarkItDown API URL

| Key | Where to set | Description |
| --- | ------------- | ----------- |
| **MARKITDOWN_API_URL** | n8n variables (or workflow) | Base URL of your MarkItDown API (e.g. Railway deploy). No trailing slash. |

The **Call MarkItDown API** node uses:  
`{{ $env.MARKITDOWN_API_URL || $vars.tools.markitdown.url || 'https://markitdown-api.railway.app' }}/convert`

Set **MARKITDOWN_API_URL** in n8n so it points at your deployed MarkItDown API.

---

## Webhook (Slack → n8n)

**Request URL for Slack Event Subscriptions** (copy this into the Request URL field):

```
https://entagency.app.n8n.cloud/webhook/slack-markitdown
```

- **Workflow ID:** `BaABQXevdM8jJVuH`
- **Webhook URL (production, after workflow is active):** `https://entagency.app.n8n.cloud/webhook/slack-markitdown`

In your Slack app (A0ACJ4HNKDY) → **Event Subscriptions** → paste the URL above into **Request URL**, then subscribe to:

- **`file_shared`** – when someone uploads a file (triggers file path).
- **`message.channels`** – when someone posts a message in a channel the app is in (triggers URL path if the message contains a URL).

So both **upload a file** and **post a URL** in the channel will run the workflow.

---

## Do this in Slack (one-time)

1. Go to [Slack API Apps](https://api.slack.com/apps) → open app **A0ACJ4HNKDY** (MarkItDown).
2. **Event Subscriptions** → **Subscribe to bot events** → **Add Bot User Event**.
3. Add **`message.channels`** (so posting a URL in a channel triggers the workflow). Keep **`file_shared`**.
4. **Save Changes**. Reinstall to workspace if Slack prompts.
5. Ensure **Request URL** is: `https://entagency.app.n8n.cloud/webhook/slack-markitdown` and shows **Verified**.

---

## Quick checklist

- [ ] Slack app: Bot scopes `files:read`, `chat:write`; Event Subscriptions → Request URL = webhook above; **`file_shared`** and **`message.channels`** subscribed.
- [ ] n8n: Slack OAuth2 credential (Client ID + Secret, OAuth completed); Header Auth “Slack Bot Token (Bearer)” with Bot token; OpenAI credential; variable **MARKITDOWN_API_URL** set.
- [ ] Workflow: All credentials assigned; **Conversion OK?** condition set; workflow active.

**If n8n reports "Filter must have a conditions field"** on any IF node: open that node in n8n, add the condition below, and save.

---

## Troubleshooting: “Webhook isn’t receiving anything from Slack”

If **no requests from Slack** are reaching n8n (no new webhook executions when you post or upload in Slack), Slack is not calling your URL. Fix these in order:

### 1. Use the production webhook URL in Slack

The **Request URL** in Slack Event Subscriptions must be exactly:

```text
https://entagency.app.n8n.cloud/webhook/slack-markitdown
```

- No trailing slash.
- Use **Production** URL. In n8n, open the workflow → Webhook node: copy the **Production** URL (not “Test URL”). It should match the URL above when the workflow is active.

### 2. Re-register the production webhook in n8n (if you updated via API)

If the workflow was updated via API or script, n8n Cloud sometimes doesn’t register the production webhook until you toggle it:

1. In n8n, open the workflow **Slack file → MarkItDown → LLM → reply**.
2. Turn the workflow **Off** (inactive).
3. Save.
4. Turn the workflow **On** (active) again.
5. Open the **Webhook (Slack events)** node and confirm the **Production** URL is `https://entagency.app.n8n.cloud/webhook/slack-markitdown`.

### 3. In Slack: Request URL must show **Verified**

1. Go to [Slack API Apps](https://api.slack.com/apps) → your app (e.g. **A0ACJ4HNKDY**).
2. **Event Subscriptions** → **Request URL**.
3. Paste `https://entagency.app.n8n.cloud/webhook/slack-markitdown` and click **Save** or **Verify**.
4. It must show **Verified**. If it shows **Verification failed**:
   - Ensure the workflow is **active** in n8n and the Production URL matches (step 1–2).
   - Slack sends a `url_verification` challenge; the workflow must respond with `{ "challenge": "<value Slack sent>" }`. If that’s working, verification will succeed.

### 4. Subscribe to events and reinstall

Under **Subscribe to bot events** add (if missing):

- **`file_shared`**
- **`message.channels`**

Then click **Save Changes**. If Slack asks to **Reinstall to workspace**, do it so the new events are enabled.

### 5. Invite the app to the channel

Slack only sends `file_shared` and `message.channels` for channels the app is in. In the channel where you want to use the bot:

- Type: `/invite @YourAppName` (the app’s bot name, e.g. the MarkItDown app).

### 6. Confirm the URL is reachable (optional)

From your machine:

```bash
curl -X POST https://entagency.app.n8n.cloud/webhook/slack-markitdown \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"hello"}'
```

You should get back: `{"challenge":"hello"}`. If you do, the webhook is live and the problem is Slack configuration (URL, Verified, events, or app not in channel).

---

## Troubleshooting: “Nothing happened in Slack”

If you sent a file or URL in Slack and the bot didn’t reply, the most likely cause is that **every webhook run is taking the URL verification path** and returning the challenge instead of processing the event.

**Why:** The **Slack URL verification?** IF node had no conditions. With no condition, the node always sends items to the first (true) output, so every request (including real `file_shared` and `message` events) went to **Respond with challenge** and the workflow never ran the file/URL → MarkItDown → LLM → Slack reply path.

**Fix in n8n (workflow `BaABQXevdM8jJVuH`):**

### 1. IF nodes – add one condition each

Open each IF node and add **exactly one** condition. Condition type and values:

| Node | When true (first output) | Condition: Left value | Operator | Right value |
|------|--------------------------|----------------------|----------|-------------|
| **Slack URL verification?** | Respond with challenge | `{{ ($json.body && $json.body.type) \|\| $json.type \|\| '' }}` | String equals | `url_verification` |
| **Event type (file vs message)** | File path | `{{ ($json.body && $json.body.event && $json.body.event.type) \|\| ($json.event && $json.event.type) \|\| '' }}` | String equals | `file_shared` |
| **Not from bot?** | Process message (not from bot) | `{{ ($json.body && $json.body.event && $json.body.event.bot_id) \|\| ($json.event && $json.event.bot_id) \|\| '' }}` | String equals | *(empty)* |
| **Has URL?** | Has URL | `{{ $json.url }}` | String is not empty | — |
| **Conversion OK?** | MarkItDown succeeded | `{{ $json.ok }}` | Boolean equals | `true` |

- In n8n, use **Add condition** → set **Value 1** to the left value (you can use expressions), **Operation** as in the table, **Value 2** to the right value where shown.
- For **Not from bot?**, right value is empty (so “from bot” messages go to the false branch; you can leave that branch unconnected or add a no-op).

### 2. Set nodes – add assignments so data flows

These Set nodes must output the fields the next nodes expect. If they have no assignments, `channel_id`, `thread_ts`, etc. are missing and Slack reply nodes fail or do nothing.

- **Normalize inbound (Slack → internal)**  
  Add assignments (from event/body): `channel_id`, `thread_ts`, `file_id`, `filename`, and e.g. `source` = `slack`, `ok` = `true`.  
  Example for `channel_id`: `{{ ($json.body && $json.body.event && $json.body.event.channel_id) || $json.channel_id || '' }}` (and similarly for `thread_ts` from `event.ts`, `file_id` from `event.file_id`).

- **Normalize message (URL)**  
  Add at least: `channel_id`, `thread_ts`, `url` (first URL from the message text). So the **Has URL?** and **Fetch URL** nodes get `url`, and reply nodes get `channel_id` / `thread_ts`.

- **Reply context (file)** and **Reply context (message)**  
  Pass through: `channel_id`, `thread_ts`, and either file binary + metadata or URL fetch result so **Merge** and **Call MarkItDown API** get one consistent shape.

- **Normalize MarkItDown response**  
  Add: `channel_id`, `thread_ts`, `ok` (true if MarkItDown returned markdown/success), `markdown`, `error`, so **Conversion OK?** and **OpenAI Chat** / **Slack reply (error)** get the right fields.

- **Normalize LLM output**  
  Add: `channel_id`, `thread_ts`, `llm_response` (e.g. `{{ $json.message && $json.message.content || $json.choices && $json.choices[0] && $json.choices[0].message && $json.choices[0].message.content || $json.text || '' }}`).

After saving:

1. **Activate** the workflow.
2. In Slack, post a message with a URL or upload a file in a channel where the app is added.
3. Check **Executions** in n8n: the run should go through **Event type** → file or message path → MarkItDown → **Conversion OK?** → OpenAI → **Slack reply (success)** (or the no-URL/error reply), not stop at **Respond with challenge**.

If the Request URL was ever re-verified, Slack may send a new `url_verification` challenge; only those requests should take **Slack URL verification?** → **Respond with challenge**. All other events should take the false branch to **Event type (file vs message)**.
