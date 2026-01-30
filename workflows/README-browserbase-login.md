# ShopMy – Browserbase login → CSV → Webhook

This workflow **gets a list of creators**, calls the **ShopMy Browserbase runner** for each (login + export CSV), then **POSTs the CSV** to the [ShopMy CSV Processor (Creators)](README-shopmy-creators.md) webhook so it’s parsed and stored in Airtable with creator identity.

## On your instance

- **Workflow:** [ShopMy – Browserbase login → CSV → Webhook](https://entagency.app.n8n.cloud/workflow/giKDiwQYUCnJKO45)
- **ID:** `giKDiwQYUCnJKO45`

## Flow

1. **Trigger:** Manual (test) or Schedule (e.g. weekly).
2. **Get creators:**  
   - **Manual:** Use **“Set creators (fallback / test)”** – one item with `creatorId`, `creatorEmail`, `shopmyEmail`, `shopmyPassword`.  
   - **Schedule:** Use **“Get creators to process”** – Airtable read with filter (e.g. `Needs CSV Sync = 1`). Map fields to `creatorId`, `creatorEmail`, `shopmyEmail`, `shopmyPassword`.
3. **Loop over creators** (one at a time).
4. **Call Browserbase runner** – HTTP POST to `YOUR_RUNNER_URL/run` with the creator’s ShopMy login. Runner returns `{ csvData?, creatorId, creatorEmail, error? }`.
5. **Has CSV?** – If `csvData` is present, continue; else go to “No CSV (log / notify)”.
6. **POST to ShopMy CSV webhook** – Sends `creatorId`, `creatorEmail`, `csvData`, `reportType` to `.../webhook/shopmy-csv-creators`. The [ShopMy CSV Processor (Creators)](README-shopmy-creators.md) workflow must be **active**.
7. **Loop back** to the next creator.

## Setup

### 1. Deploy the runner

- Code: [../shopmy-browserbase-runner/](../shopmy-browserbase-runner/).
- Set env: `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID` (and `PORT` if needed).
- Deploy to Railway (or any Node 18+ host) and note the base URL (e.g. `https://your-app.railway.app`).

### 2. n8n workflow

1. **Import** `workflows/shopmy-browserbase-login.json` into [entagency.app.n8n.cloud](https://entagency.app.n8n.cloud).
2. In **“Call Browserbase runner”**, set **URL** to `https://YOUR_RUNNER_URL/run` (replace with your deployed URL).
3. **Manual test:** Use **“Set creators (fallback / test)”** – set `shopmyEmail` and `shopmyPassword` to a real ShopMy creator login (and `creatorId` / `creatorEmail` as you like). Connect **Manual Trigger** to **Set creators** and run.
4. **Production:** Create an Airtable table (or use existing) with columns: `CreatorId`, `CreatorEmail`, `ShopMyEmail`, `ShopMyPassword`, and optionally `Needs CSV Sync`. In **“Get creators to process”** set base/table and filter (e.g. `Needs CSV Sync = 1`). Connect **Schedule (optional)** to **Get creators to process** and set the schedule.

### 3. Webhook

- Ensure **[ShopMy CSV Processor (Creators)](README-shopmy-creators.md)** is **active** so `.../webhook/shopmy-csv-creators` is registered.
- The “Browserbase login” workflow POSTs to that URL; no extra auth if both run on the same n8n instance.

## Airtable “creators” table (optional)

If you use **Get creators to process**, the table can look like:

| CreatorId | CreatorEmail | ShopMyEmail | ShopMyPassword | Needs CSV Sync |
|-----------|--------------|-------------|----------------|----------------|
| c1        | c1@example.com | login@shopmy | ***            | 1              |

- Map these field names in the Airtable node (or match the names used in the workflow).
- Only include creators you want to sync; use `Needs CSV Sync = 1` (or your filter) so the workflow only processes them.

## Security

- Store ShopMy passwords in Airtable only if the base is restricted and access is limited. Prefer a secrets manager and look up credentials in the runner or n8n (e.g. from env or a secure store) keyed by `creatorId`.
- The runner runs in your Browserbase project; keep `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` in env only, not in the repo.
