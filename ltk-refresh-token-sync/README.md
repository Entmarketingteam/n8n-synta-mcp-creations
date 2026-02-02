# LTK Self-Healing Token Sync (Gemini Plan)

**No OAuth callback. No browser. No band-aid nodes.**  
Refresh token stored in Airtable → n8n refreshes each run → saves new tokens back → calls LTK API → syncs data.

---

## Plan (from Gemini)

1. **Token vault:** Airtable table `LTK_Credentials` holds per-creator `Refresh_Token` (and optionally `Access_Token`, `ID_Token` after first run).
2. **Each run:** n8n reads records → for each creator: POST refresh → **immediately** update Airtable with new tokens → call LTK API with new `access_token` + `x-id-token` → store data to Sheets (or Airtable).
3. **Self-healing:** New `refresh_token` is written back every run, so the “hot potato” never goes stale until LTK revokes it (e.g. 30–90 days); then one-time re-capture from browser.

---

## One-time setup

I don’t have access to your Airtable/n8n accounts or LTK session—you run these steps once (or use the script with your keys).

### 1. Airtable: table + one row (script or manual)

**Option A – Script:** From repo root: `AIRTABLE_API_KEY=patxxx... LTK_REFRESH_TOKEN="v1.xxx..." node ltk-refresh-token-sync/scripts/setup-airtable.js`  
(Uses base `appQnKyfyRyhHX44h`; finds/creates table `LTK_Credentials` and adds one row. Create the table in Airtable first if needed—see **AIRTABLE-SCHEMA.md**—or run with `CREATE_TABLE=1`.)

**Option B – Manual:** Create table `LTK_Credentials` in base `appQnKyfyRyhHX44h` per **AIRTABLE-SCHEMA.md** and add one row with `Creator` and `Refresh_Token`.

### 2. Get Nicki’s refresh token (once)

Log in at https://creator.shopltk.com → DevTools → Application → Local Storage → copy `auth._refresh_token.auth0`. Use it in the script (Option A) or paste into Airtable (Option B).

### 3. n8n

- Create **Airtable** credential (read + update).
- Create **Google Sheets** credential (if using Sheets).
- Open workflow: https://entagency.app.n8n.cloud/workflow/ZsuR4dbEpTUH7q06  
- Configure:
  - **Airtable Get Creators:** pick base + table = your `LTK_Credentials` table (same base/table for **Airtable Update Tokens**).
  - **Store to Sheets:** pick document + sheet (or replace with Airtable “Create record” to an `LTK_Sync_Data` table).
- **Attach credentials (required):** On **Airtable Get Creators** and **Airtable Update Tokens**, select your Airtable credential. On **Store to Sheets**, select your Google Sheets credential. Save the workflow. Base/table/sheet are already set: Airtable base `appQnKyfyRyhHX44h`, table `LTK_Credentials`; Google Sheet `1ogyNXDfZbqtnIY1S4lHzihJHv0e6RLbj80ZrFHYZ1lo`, sheet **Sheet1**. Columns: Creator, extracted_at, user_info, commissions, performance_summary. If the sheet has no header row, the first row appended will be data. Run once with **Manual Trigger**.

---

## Workflow flow

```
Schedule Trigger (e.g. every 6 hours)
  → Airtable Get Creators (list all)
  → Split In Batches (1)
  → Refresh Token (POST /oauth/token)
  → Refresh OK? (IF)
       ├─ Yes → Prepare for Airtable (Set: recordId + tokens on current item)
       │         → Airtable Update Tokens (id = $json.recordId, write new tokens)
       │         → Get User Info → Get Commissions → Get Performance
       │         → Format Output → Store to Sheets
       │         → (loop back to Split In Batches for next creator)
       └─ No  → Refresh Failed (NoOp)
  (Split In Batches output 0 → All Done when no more batches)
```

---

## Troubleshooting

### "invalid_grant" or "Forbidden - perhaps check your credentials?"

- **Refresh token:** The token in Airtable must be the one from the same login session and app. If it’s expired or revoked, get a new one: log in at https://creator.shopltk.com → DevTools → Application → Local Storage → copy `auth._refresh_token.auth0` (or the key LTK/Auth0 use for the refresh token). Paste it into the Airtable **Refresh_Token** field for that creator. No spaces or quotes.
- **redirect_uri:** The Refresh Token node uses `https://creator.shopltk.com/login/callback` (no trailing slash). It must match exactly what LTK expects for the client_id you use. Don’t change it unless LTK docs say otherwise.
- **Content-Type:** The Refresh Token node sends `Content-Type: application/x-www-form-urlencoded` explicitly so the token endpoint receives form-encoded body correctly.

### Airtable Update Tokens (HTTP Request) – 422 INVALID_RECORDS

- The **Airtable Update Tokens** step is an **HTTP Request** node (not the Airtable node) so the body matches Airtable’s API: `{ "records": [ { "id": "...", "fields": { "Refresh_Token", "Access_Token", "ID_Token" } } ] }`.
- **Credential:** The node must send `Authorization: Bearer <token>`. Create a **Header Auth** credential in n8n (e.g. “Airtable PAT”): Header Name = `Authorization`, Value = `Bearer <your Airtable personal access token>`. In the **Airtable Update Tokens** node, set Authentication to that credential. Use the same token as your Airtable base (create at airtable.com → Account → Developer hub → Personal access tokens).

---

## Files

- **README.md** (this file)
- **AIRTABLE-SCHEMA.md** – table and column definitions
- **Workflow in n8n:** [LTK Self-Healing Token Sync](https://entagency.app.n8n.cloud/workflow/ZsuR4dbEpTUH7q06) (ID: `ZsuR4dbEpTUH7q06`)
