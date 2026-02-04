# PRD: Slack Event Subscriptions + n8n Webhook Workflows

**Product Requirements Document**  
Use this when building, fixing, or handing off any n8n workflow that receives Slack events via Event Subscriptions. Everything needed is in this document; no other doc is required.

---

## 1. Purpose and scope

### 1.1 What this is

- A **Slack app** is configured to send **events** (e.g. file shared, message posted) to a URL you own.
- That URL is an **n8n Webhook** trigger. When Slack sends a POST, the n8n workflow runs and can call Slack APIs, external services, and post back to Slack.
- The result: event-driven automations (e.g. “when someone uploads a file or posts a URL, convert to markdown and reply with a summary”).

### 1.2 Out of scope

- Building the Slack app from scratch (assume an app already exists; we configure Event Subscriptions and scopes).
- OAuth “Redirect URL” setup (that’s for OAuth & Permissions when connecting the app; not the same as the Event Subscriptions Request URL).

---

## 2. How Slack Event Subscriptions work

### 2.1 Two phases

Slack sends HTTP POST requests to the **Request URL** you configure in the app’s Event Subscriptions. There are two kinds of requests:

| Phase | When it happens | Request body (relevant fields) | Required response |
|-------|------------------|----------------------------------|--------------------|
| **URL verification** | When you first enter or save the Request URL (and sometimes on retry) | `{ "type": "url_verification", "challenge": "<unique string>" }` | HTTP 200, body **exactly** `{ "challenge": "<same string Slack sent>" }`. Content-Type: application/json. |
| **Event delivery** | When subscribed events occur (e.g. file shared, message posted) | `{ "type": "event_callback", "event": { "type": "...", ... } }` | HTTP 200 within a few seconds. Body optional (empty is fine). |

If the verification response is wrong or missing, Slack shows an error (e.g. “Your URL didn’t respond with the value of the challenge parameter” / `challenge_failed`) and does **not** enable the URL. Event delivery will not work until verification succeeds.

### 2.2 Important details

- **Same URL** is used for both verification and events.
- **Verification** happens once (or when you change the URL and save again). The workflow must detect `type === 'url_verification'` and return only the challenge.
- **Events** must be acknowledged with 200 quickly. If the workflow never responds, Slack may retry and log failures.
- **Request body**: Slack sends JSON. The payload may be in the root (e.g. `body.type`) or parsed into the request body (e.g. n8n might expose it as `$json` or `$json.body`). The workflow must handle both shapes for `type` and `challenge`.

---

## 3. Requirements

### 3.1 Functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | The n8n workflow MUST respond to Slack’s URL verification request with HTTP 200 and a JSON body `{ "challenge": "<value from request>" }`. | Must |
| FR-2 | The n8n workflow MUST respond with HTTP 200 (body optional) for every received event callback so Slack does not retry. | Must |
| FR-3 | The workflow MUST only run “business logic” (e.g. file handling, API calls, Slack replies) for event callbacks, not for verification requests. | Must |
| FR-4 | The workflow MUST use the **Production** Webhook URL in Slack (not the Test URL). | Must |
| FR-5 | The workflow MUST be **Active** when Slack performs URL verification. | Must |

### 3.2 Technical requirements (n8n)

| ID | Requirement | Details |
|----|-------------|---------|
| TR-1 | Webhook trigger response mode | **Respond** = **“Using 'Respond to Webhook' Node”**. Do **not** use “Immediately”; that causes n8n to respond before the workflow runs, so the challenge is never returned and verification fails. |
| TR-2 | First branch: URL verification | Immediately after the Webhook node, add an **IF** node. Condition: the request is a verification request. Recommended expression: `{{ $json.body?.type ?? $json.type ?? '' }}` **equals** `url_verification`. |
| TR-3 | Verification branch response | On the **true** branch of that IF, add a **Respond to Webhook** node. Set **Respond with** = **JSON**. Set **Response Body** = `{{ JSON.stringify({ challenge: $json.body?.challenge ?? $json.challenge ?? '' }) }}`. No other nodes are required on this branch. |
| TR-4 | Event branch | On the **false** branch, continue to the rest of the workflow (event type routing, Slack API calls, external APIs, etc.). |
| TR-5 | Response on every event path | Every execution path that handles an event (e.g. “Slack reply success”, “Slack reply error”, “no URL” reply) MUST end with a **Respond to Webhook** node that sends a response (e.g. **Respond with** = **No Data** for 200 with empty body). Connect all such “end” nodes to one **Respond to Webhook** node so every path responds. |

### 3.3 Slack app configuration

| ID | Requirement | Details |
|----|-------------|---------|
| SC-1 | Request URL | Set to the n8n **Production** Webhook URL, e.g. `https://<n8n-host>/webhook/<path>`. Example: `https://entagency.app.n8n.cloud/webhook/slack-markitdown`. There is no “redirect URL” for Event Subscriptions; this is the URL Slack POSTs to. |
| SC-2 | Subscribe to bot events | Add the events the workflow needs (e.g. `file_shared`, `message.channels`). Required **Bot Token Scopes** (OAuth & Permissions) depend on the events (e.g. `files:read`, `chat:write`, `channels:history`). |
| SC-3 | Save and reinstall | After changing Request URL or events, click **Save Changes**. Reinstall the app to the workspace if Slack prompts. |

---

## 4. Architecture

### 4.1 High-level flow

```
Slack POST → n8n Webhook
              → IF url_verification?
                   → yes → Respond to Webhook (JSON { challenge })  [STOP]
                   → no  → [Event routing and business logic]
                             → … → Slack reply / other end nodes
                             → Respond to Webhook (No Data / 200)   [STOP]
```

### 4.2 Node-by-node template

1. **Webhook**  
   - Path: e.g. `slack-myapp` (will become `/webhook/slack-myapp` in Production).  
   - HTTP Method: POST.  
   - **Respond**: **Using 'Respond to Webhook' Node**.

2. **IF – “Slack URL verification?”**  
   - Condition: `{{ $json.body?.type ?? $json.type ?? '' }}` **equals** `url_verification`.  
   - **True** → node 3.  
   - **False** → node 4.

3. **Respond to Webhook – “Respond with challenge”**  
   - **Respond with**: JSON.  
   - **Response Body**: `{{ JSON.stringify({ challenge: $json.body?.challenge ?? $json.challenge ?? '' }) }}`.  
   - No further nodes on this branch.

4. **Rest of workflow**  
   - Event type IF/Switch (e.g. `file_shared` vs `message`).  
   - Normalize payload, call Slack APIs (e.g. files.info, files.download via HTTP with Bot token), external APIs, LLM, etc.  
   - Slack “post message” nodes (success, error, or other branches as needed).

5. **Respond to Webhook – “Respond OK to Slack”**  
   - **Respond with**: No Data (or equivalent 200 empty body).  
   - **All** “end” nodes (every Slack reply or terminal branch) connect to this node so every event path returns 200 to Slack.

### 4.3 Event payload reference (for implementation)

- **Verification**: `{ "type": "url_verification", "challenge": "<string>" }`.  
- **Event callback**: `{ "type": "event_callback", "event": { "type": "file_shared" | "message" | ..., "channel" | "channel_id", "ts", "file_id" (for file_shared), "text" (for message), "bot_id" (if from bot), ... } }`.  
- Use `$json.body?.event ?? $json.event` (and similarly for `type`, `challenge`) so the workflow works whether the body is at root or under `body`.

---

## 5. Implementation checklist

Use this when building or validating a Slack Event Subscriptions + n8n workflow.

### 5.1 n8n workflow

- [ ] Webhook node: **Respond** = **Using 'Respond to Webhook' Node**.
- [ ] First node after Webhook: IF that checks `type === 'url_verification'` (using `$json.body?.type ?? $json.type`).
- [ ] True branch: single **Respond to Webhook** node returning JSON `{ "challenge": "<from request>" }`.
- [ ] False branch: contains all event handling (no verification logic).
- [ ] Every terminal branch of event handling (every “Slack reply” or equivalent) connects to a **Respond to Webhook** node (e.g. No Data).
- [ ] Workflow is **Active** when testing verification in Slack.
- [ ] Production Webhook URL is used in Slack (e.g. `https://<n8n>/webhook/<path>`), not the Test URL.

### 5.2 Slack app

- [ ] Event Subscriptions → **Request URL** = n8n Production Webhook URL.
- [ ] **Subscribe to bot events**: add required events (e.g. `file_shared`, `message.channels`).
- [ ] OAuth & Permissions → **Bot Token Scopes**: include scopes required by the events and by the workflow (e.g. `files:read`, `chat:write`, `channels:history`).
- [ ] **Save Changes** (and reinstall to workspace if prompted).
- [ ] Request URL shows **Verified** after save/retry.

### 5.3 Credentials and config

- [ ] Slack nodes use the correct credential (Slack OAuth2 or Bot token as required).
- [ ] If the workflow calls external APIs (e.g. MarkItDown, OpenAI), credentials and env vars (e.g. `MARKITDOWN_API_URL`) are set in n8n.

---

## 6. Testing

### 6.1 Verification

1. Ensure the workflow is **Active** and uses the structure in §4.  
2. In Slack: Event Subscriptions → set Request URL to the n8n Production Webhook URL → **Save** (or **Retry**).  
3. Expected: Slack shows the URL as **Verified**.  
4. If not: check workflow is active, Webhook Respond = “Using 'Respond to Webhook' Node”, and the verification branch returns exactly `{ "challenge": "<value>" }`.

### 6.2 Events

1. Trigger an event (e.g. upload a file or post a message in a channel where the app is added).  
2. Expected: workflow runs, business logic executes, Slack gets 200 from the webhook.  
3. If events don’t run: confirm Production URL, correct workflow, and subscribed events.  
4. If workflow runs but Slack reply doesn’t appear: check Slack credentials and Bot Token Scopes (e.g. `chat:write`).

---

## 7. Troubleshooting

| Symptom | Likely cause | Action |
|--------|----------------|--------|
| “challenge_failed” / “didn’t respond with the value of the challenge parameter” | Webhook responds before returning the challenge (e.g. Respond = “Immediately”) or verification branch missing/wrong | Set Webhook **Respond** to **Using 'Respond to Webhook' Node**. Add or fix the IF + “Respond with challenge” branch per §4.2. |
| Verification never succeeds (e.g. “Could not verify”) | Workflow inactive or wrong URL | Activate the workflow. Use Production Webhook URL in Slack (not Test). Retry Save/Retry in Slack. |
| URL verified but events don’t trigger | Wrong URL, wrong workflow, or events not subscribed | Confirm Request URL matches the workflow’s Production URL. Confirm bot events (e.g. `file_shared`, `message.channels`) are subscribed. |
| Events trigger but no reply in Slack | Missing/wrong credential or scope | Check Slack OAuth2 (or Bot token) is assigned to the Slack nodes. Check Bot Token Scopes include e.g. `chat:write`, `channels:history` if posting to channels. |
| n8n validator: “Filter must have a conditions field” on an IF | IF conditions not in the shape the validator expects | Open the IF node in the editor, re-add the condition (e.g. value `{{ $json.body?.type ?? $json.type ?? '' }}` equals `url_verification`), save. |

---

## 8. Acceptance criteria

- [ ] **AC1** Slack Event Subscriptions Request URL is verified (green **Verified** in Slack).  
- [ ] **AC2** When a subscribed event occurs (e.g. file shared or message with URL), the n8n workflow runs and executes the intended business logic.  
- [ ] **AC3** The webhook returns HTTP 200 for both verification and event requests (no challenge_failed; no Slack retries due to missing response).  
- [ ] **AC4** Documentation or runbook references this PRD (or the same requirements) so future changes (e.g. new Slack workflows) follow the same pattern.

---

## 9. Using existing credentials when the AI/MCP builds the workflow

**Yes, it can be done.** The n8n MCP can assign **existing** credentials to nodes when it creates or updates a workflow. Nodes accept a `credentials` property with `id` and `name` per credential type. The MCP **cannot list** your credentials, so you must **give the AI the credential ID(s)** (and optionally names) you want used.

### 9.1 How to get credential IDs in n8n

- **From a node:** Open any node that already uses the credential (e.g. “Slack get file info”) → Credential dropdown → the selected credential’s **ID** is in the URL or in the dropdown (some UIs show it on hover or in the credential edit screen).
- **From the credential URL:** n8n credential URLs look like `https://<your-n8n>/credentials/<ID>`. Open **Credentials** in the sidebar, click the credential, and copy the ID from the browser URL.
- **From an existing workflow:** If you already have a workflow that uses the credential (e.g. the MarkItDown Slack workflow), you can say: “Use the same credentials as workflow BaABQXevdM8jJVuH” and the AI can fetch that workflow and reuse the credential IDs from its nodes.

### 9.2 What to tell the AI so it assigns credentials

When you ask for a **new** Slack Event Subscriptions workflow (or an update), add one of these:

**Option A – You provide IDs explicitly**

> Use my existing n8n credentials when you create/update the workflow:
> - **Slack OAuth2:** id `PhBEyMsaxJ4k1bi7`, name `Slack (MarkItDown app A0ACJ4HNKDY)`. Assign to every Slack node (get file info, reply success, reply error, reply no URL).
> - **HTTP Header Auth (Slack Bot token):** id `X3uZ5J8wbqoJEu4Q`, name `Slack Bot Token (Bearer)`. Assign to the “Download file from Slack” node.
> - **OpenAI:** id `<your-openai-credential-id>`, name `OpenAI account`. Assign to the OpenAI Chat node.

**Option B – Reuse from an existing workflow**

> When you build this workflow, assign the same credentials as the existing workflow **BaABQXevdM8jJVuH** (Slack file → MarkItDown → LLM → reply). Fetch that workflow, read the credential IDs from its nodes, and use those IDs for the corresponding nodes in this workflow.

**Option C – Short form**

> Use my existing credentials: Slack OAuth2 id PhBEyMsaxJ4k1bi7, HTTP Header Auth id X3uZ5J8wbqoJEu4Q for the download node, and assign the Slack OAuth2 to all Slack nodes. [Add OpenAI id if you have one.]

### 9.3 What the AI/MCP does

- **n8n_create_workflow:** Each node in the `nodes` array can include `credentials: { slackOAuth2Api: { id: "PhBEyMsaxJ4k1bi7", name: "Slack (MarkItDown app)" } }` (and similarly for `httpHeaderAuth`, `openAiApi`, etc.). The MCP includes these when you provided the IDs.
- **n8n_update_partial_workflow:** Use **updateNode** with `updates: { credentials: { slackOAuth2Api: { id: "...", name: "..." } } }` to attach or fix credentials on specific nodes.

If you **don’t** provide credential IDs, the workflow will be created with placeholder or empty credentials and you’ll have to assign them manually in the n8n UI (and you may see “Node does not have any credentials set for ‘slackApi’” or similar until you do).

---

## 10. Reference: minimal copy-paste prompts for an AI

**When creating a new Slack Event Subscriptions workflow in n8n (with credentials):**

“Create an n8n workflow that receives Slack events via Event Subscriptions. Follow PRD-SLACK-EVENT-SUBSCRIPTIONS-N8N.md: (1) Webhook with Respond = 'Using Respond to Webhook Node'. (2) IF url_verification → Respond to Webhook with JSON { challenge }. (3) False branch: [describe my event logic]. (4) Every event path ends with Respond to Webhook (No Data). **Use my existing credentials:** Slack OAuth2 id PhBEyMsaxJ4k1bi7 (assign to all Slack nodes), HTTP Header Auth id X3uZ5J8wbqoJEu4Q (assign to Download file from Slack), OpenAI id [my-openai-id] (assign to OpenAI node). Then implement [my specific logic].”

**When creating without providing IDs (you assign in UI later):**

“Create an n8n workflow that receives Slack events via Event Subscriptions. Follow PRD-SLACK-EVENT-SUBSCRIPTIONS-N8N.md for webhook, URL verification, and respond-on-every-path. Then implement [my specific logic]. I’ll assign credentials in n8n after.”

**When fixing challenge_failed:**

“Slack Event Subscriptions show challenge_failed. Fix the n8n workflow per PRD-SLACK-EVENT-SUBSCRIPTIONS-N8N: ensure Webhook Respond = 'Using Respond to Webhook Node', add an IF right after the Webhook for type === 'url_verification', and on the true branch add Respond to Webhook returning JSON { challenge } from the request. Ensure workflow is active and Slack uses the Production Webhook URL.”

**When fixing “Node does not have any credentials set”:**

“Assign my existing credentials to this workflow. Slack OAuth2 id PhBEyMsaxJ4k1bi7 to nodes: Slack get file info, Slack reply (success), Slack reply (error), Slack reply (no URL). HTTP Header Auth id X3uZ5J8wbqoJEu4Q to: Download file from Slack. Use n8n_update_partial_workflow with updateNode for each node.”

---

*End of PRD. This document is self-contained for Slack Event Subscriptions + n8n webhook workflows.*
