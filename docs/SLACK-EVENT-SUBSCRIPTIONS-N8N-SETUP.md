# Slack Event Subscriptions + n8n: Setup Instructions for AI (Cursor / Claude)

**Use this doc when building or fixing any n8n workflow that receives Slack events via Event Subscriptions.** Paste it (or the relevant section) into your prompt so the AI knows exactly what’s required and avoids common failures.

---

## 1. What’s going on

- **Slack Event Subscriptions** send HTTP POST requests to a **Request URL** you provide (your n8n Webhook URL).
- Before accepting the URL, Slack runs **URL verification**: it sends one POST with `type: "url_verification"` and a `challenge` string. Your endpoint **must** respond with a JSON body **exactly**: `{ "challenge": "<the challenge value Slack sent>" }`. If you don’t, Slack shows **“Your URL didn’t respond with the value of the challenge parameter”** / **challenge_failed** and the URL stays unverified.
- After verification, Slack sends real events (e.g. `file_shared`, `message.channels`) to the same URL. Your workflow handles those and should respond with **200 OK** quickly (body optional) so Slack doesn’t retry.

So there are two kinds of requests hitting the same webhook:

1. **Verification** – respond with `{ "challenge": "<challenge>" }`.
2. **Events** – run your logic, then respond with 200 (e.g. empty body).

---

## 2. n8n workflow requirements (must-haves)

### 2.1 Webhook trigger

- **Respond** must be **“Using 'Respond to Webhook' Node”** (not “Immediately”).
  - If it’s “Immediately”, n8n answers before your workflow runs and never returns the challenge → **challenge_failed**.
- Use the **Production** Webhook URL (e.g. `https://<your-n8n>/webhook/<path>`) in Slack. **Test** URL is only for the editor and will break when you leave or reload.
- Workflow must be **Active** when Slack verifies the URL; otherwise the request isn’t handled and verification fails.

### 2.2 Handle URL verification first

Right after the Webhook node, branch on whether the request is Slack’s verification:

- **IF** `(body.type === 'url_verification')`  
  - In n8n the body is often in `$json` or `$json.body`, so use an expression like:  
    `{{ $json.body?.type ?? $json.type ?? '' }}` **equals** `url_verification`.
- **True branch**
  - **Respond to Webhook** node:
    - **Respond with**: JSON  
    - **Response Body**:  
      `{{ JSON.stringify({ challenge: $json.body?.challenge ?? $json.challenge ?? '' }) }}`  
  - This is the only path that must return the challenge. Do not run your normal event logic for this request.
- **False branch**
  - Continue to your normal “handle Slack event” logic (e.g. event type switch, process file/message, etc.).

So the start of the flow is always:

```
Webhook (Respond = Using 'Respond to Webhook' Node)
  → IF url_verification?
       → yes: Respond to Webhook (JSON { challenge })
       → no:  [rest of your workflow]
```

### 2.3 Respond to Slack on every event path

Slack expects a timely 200. Every path that handles a real event (not verification) must eventually call **Respond to Webhook**.

- Add a **Respond to Webhook** node with **Respond with**: No Data (or 200 and empty body).
- Connect **all** “end” nodes of your event handling (e.g. “Slack reply success”, “Slack reply error”, “no URL reply”) to this single **Respond to Webhook** node so that whichever branch runs, the webhook still gets a response.

Example:

- Slack reply (success) → **Respond OK to Slack**
- Slack reply (error)  → **Respond OK to Slack**
- Slack reply (no URL) → **Respond OK to Slack**

---

## 3. Slack app configuration (Event Subscriptions)

- **Request URL**: your n8n **Production** Webhook URL (e.g. `https://entagency.app.n8n.cloud/webhook/<your-path>`). No redirect URL here; this is the endpoint Slack POSTs to.
- **Subscribe to bot events**: add the events you need (e.g. `file_shared`, `message.channels`). Required **Bot Token Scopes** (under OAuth & Permissions) depend on the events (e.g. `files:read`, `chat:write`, `channels:history` for messages).
- After saving, Slack will send the verification request; with the flow above, n8n returns the challenge and Slack shows **Verified**.
- If you add or change the Request URL or events, **Save Changes** and reinstall the app to the workspace if Slack asks.

---

## 4. Common failures and fixes

| Symptom | Cause | Fix |
|--------|--------|-----|
| “challenge_failed” / “didn’t respond with the value of the challenge parameter” | Webhook responds before returning the challenge | Set Webhook **Respond** to **“Using 'Respond to Webhook' Node”** and add the verification branch that returns `{ "challenge": "<value>" }` as above. |
| Verification fails / URL not verified | Workflow inactive | Turn the workflow **Active** and retry **Save** or **Retry** in Slack Event Subscriptions. |
| Verified in Slack but events don’t run | Wrong URL or wrong workflow | Confirm Slack uses the **Production** Webhook URL (not Test) and that it’s the URL of the workflow you edited. |
| Events seem to fire but no reply in Slack | Missing or wrong Slack credentials / scopes | Check Bot Token Scopes (`chat:write`, etc.) and that the Slack nodes use the correct OAuth2 (or Bot token) credential. |
| n8n validator: “Filter must have a conditions field” on an IF | IF node conditions stored in a different shape | Open the IF node in the editor and re-add the condition (e.g. value `{{ $json.ok }}` equals `true`), then save. |

---

## 5. Minimal “template” flow (for the AI to implement)

1. **Webhook** – Path e.g. `slack-myapp`, Method POST, **Respond** = **Using 'Respond to Webhook' Node**.
2. **IF** – “Slack URL verification?”  
   - Condition: `{{ $json.body?.type ?? $json.type ?? '' }}` equals `url_verification`.  
   - **True** → **Respond to Webhook** (JSON, Response Body = `{{ JSON.stringify({ challenge: $json.body?.challenge ?? $json.challenge ?? '' }) }}`).  
   - **False** → go to step 3.
3. **Rest of workflow** – e.g. IF event type (file_shared vs message), normalize, call APIs, Slack reply nodes, etc.
4. **Respond to Webhook** – “Respond OK” (No Data). Connect every final Slack-reply (or end) node to this so every event path responds to the webhook.

---

## 6. Reference: one working example

- **Workflow**: “Slack file → MarkItDown → LLM → reply” (ID `BaABQXevdM8jJVuH` on entagency.app.n8n.cloud).
- **Request URL**: `https://entagency.app.n8n.cloud/webhook/slack-markitdown`.
- **Events**: `file_shared`, `message.channels`.
- **Flow**: Webhook → Slack URL verification? → (yes) Respond with challenge | (no) Event type (file vs message) → … → Slack reply nodes → **Respond OK to Slack**.

For app-specific details (Client ID, scopes, credentials), see e.g. **ent-tools/docs/MARKITDOWN-SLACK-APP.md** in the same repo.
