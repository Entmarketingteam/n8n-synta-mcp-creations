# LTK → Supabase Mesh (Without Touching Airtable or Sheets)

**Goal:** Get the same LTK creator data you already pull in n8n (user info, commissions, performance, items sold) **into Supabase** so your CreatorMetrics app / Railway deployment can use it—**without changing** the working Airtable token flow or the Google Sheets append.

---

## Prerequisite: LTK token refresh must be running

The **LTK Reports to Google Sheets** workflow (and thus the Supabase insert) **does not** refresh LTK tokens. It only **reads** `Access_Token` and `ID_Token` from Airtable and uses them in the four middle nodes (Get User Info, Get Commissions, Get Performance, Get Items Sold).

Those tokens are written to Airtable **only** by the **LTK Token Rotation (Airtable)** workflow. If that workflow isn’t running on a schedule (or at least manually before a Reports run), Airtable will have stale tokens and the four LTK API nodes will return **401/403** and you’ll get no data in Sheets or Supabase.

**So:** Keep **LTK Token Rotation (Airtable)** active (e.g. every 8 hours) so Airtable always has fresh tokens. Then each run of **LTK Reports to Google Sheets** will read those tokens and successfully call the LTK API → format → Sheet + Supabase.

---

## Optional: Chain Token Rotation → Reports (refresh then pull in one run)

So that **one run** refreshes tokens and then immediately pulls data into Sheets (and Supabase):

1. **LTK Reports to Google Sheets** already has a **“When Executed by Another Workflow”** trigger connected to **Read Token from Airtable**, so it can be started by another workflow.
2. **LTK Token Rotation (Airtable)** should call Reports after saving new tokens:
   - Open [LTK Token Rotation (Airtable)](https://entagency.app.n8n.cloud/workflow/a9gH2UthD2w239iv).
   - Add an **Execute Sub-workflow** node.
   - Set **Source** → **Database**, **Workflow ID** → `2Rr3f3YCgy3OIZWX` (LTK Reports to Google Sheets).
   - Disconnect **Save New Tokens to Airtable** from **Success**.
   - Connect **Save New Tokens to Airtable** → **Execute Sub-workflow** (name it e.g. “Run LTK Reports”) → **Success**.
   - Save the workflow.

Then: **Manual Test** or **Every 8 Hours** → Read Token → Refresh → (if success) Format → Save to Airtable → **Run LTK Reports** (same run) → Success. The Reports workflow reads the freshly saved tokens from Airtable and runs the four LTK API nodes → Sheet + Supabase.

The repo file **`workflows/ltk-token-rotation-fixed.json`** includes this “Run LTK Reports” node and connections; you can use it as reference or re-import if you prefer to sync from the file.

---

## Implementation checklist

| Step | Status | Action |
|------|--------|--------|
| 1. Create `ltk_snapshots` table in Supabase | **You do** | Run [docs/supabase/ltk_snapshots_table.sql](docs/supabase/ltk_snapshots_table.sql) in Supabase SQL Editor (project abhhegllhwbmanwvqanc). Tables cannot be created via REST API. |
| 2. Add Supabase credential in n8n | **Done** | Credential "Supabase CreatorMetrics (Service)" (Header Auth) is created and attached to "Insert LTK Snapshot to Supabase". Rotate the secret in Supabase when needed and update this credential in n8n. |
| 3. Add node and connection in workflow | **Done** | The workflow has "Insert LTK Snapshot to Supabase" (HTTP Request) and "Format Row for Sheet" → both "Append to Google Sheet" and "Insert LTK Snapshot to Supabase". |
| 4. Attach Google Sheets credential | **You do** | In workflow **LTK Reports to Google Sheets**, open the **Append to Google Sheet** node and select your Google Sheets credential (OAuth2). Required when the workflow runs as a sub-workflow from Token Rotation. |
| 5. Test | **You do** | After step 1: Run the workflow once; confirm one new row in the Sheet and one new row in Supabase → Table Editor → `ltk_snapshots`. |

---

## What stays exactly the same

- **LTK Token Rotation (Airtable)** – unchanged. Still reads/writes tokens in Airtable.
- **LTK Reports to Google Sheets** – unchanged. Still reads token from Airtable, calls LTK API, appends one row to your Sheet.
- **No new Airtable config.** No new triggers. No change to credentials for Airtable or Sheets.

---

## What you add: one parallel branch in n8n

After **"Format Row for Sheet"** you currently have a single connection to **"Append to Google Sheet"**. You will:

1. **Run one SQL migration** in your Supabase project so a table exists to receive the data.
2. **Add one node** in the same workflow that inserts the **same formatted row** into Supabase.
3. **Wire it** so "Format Row for Sheet" feeds **both** the Google Sheet node **and** the new Supabase node.

So each run still does: Airtable token → LTK API → combine → format → **Sheet (unchanged)** + **Supabase (new)**.

---

## Step 1: Create the table in Supabase

1. Open your CreatorMetrics Supabase project:  
   **https://supabase.com/dashboard/project/abhhegllhwbmanwvqanc**
2. Go to **SQL Editor** → New query.
3. Paste and run the contents of **`docs/supabase/ltk_snapshots_table.sql`** (in this repo).

That creates the `ltk_snapshots` table and RLS so:
- n8n (using the **service role** key) can INSERT.
- Your CreatorMetrics app (authenticated users) can SELECT.

---

## Step 2: Supabase credentials in n8n

You need **two values** from Supabase (same project):

- **Project URL:** `https://abhhegllhwbmanwvqanc.supabase.co`  
  (Supabase Dashboard → Project Settings → API → Project URL)
- **Service role key** (secret):  
  (Project Settings → API → `service_role` key — **not** the anon key)

In n8n:

1. **Credentials** → Add credential → **Header Auth** (or **Generic Credential** if you prefer).
2. Name it e.g. **Supabase CreatorMetrics (Service)**.
3. Set:
   - **Name:** `Authorization`  
   - **Value:** `Bearer YOUR_SERVICE_ROLE_KEY`
   - And optionally **Name:** `apikey` **Value:** `YOUR_SERVICE_ROLE_KEY`  
   (Supabase REST accepts either; `Authorization: Bearer` is enough.)

Alternatively, store the service role key in n8n **Environment Variables** (e.g. `SUPABASE_SERVICE_KEY`) and reference it in the node so the key never lives in the workflow JSON.

---

## Step 3: Verify / configure the Supabase insert node in the workflow

The workflow already has the node **"Insert LTK Snapshot to Supabase"** and the connection from "Format Row for Sheet" to both "Append to Google Sheet" and "Insert LTK Snapshot to Supabase". You only need to attach the credential.

1. Open the workflow:  
   **https://entagency.app.n8n.cloud/workflow/2Rr3f3YCgy3OIZWX**  
   (LTK Reports to Google Sheets)
2. Click the node **"Insert LTK Snapshot to Supabase"**. It is already configured with:
   - **Method:** POST
   - **URL:** `https://abhhegllhwbmanwvqanc.supabase.co/rest/v1/ltk_snapshots`
   - **Headers:** Content-Type, Prefer
   - **Body:** JSON (extracted_at, creator_name, source, user_info, commissions, performance, items_sold, items_sold_count)
3. Set **Authentication** to **Header Auth** and select the credential you created in Step 2 (e.g. **Supabase CreatorMetrics (Service)**).
4. If you prefer to configure the node from scratch, the full spec is:
   - **Method:** POST
   - **URL:** `https://abhhegllhwbmanwvqanc.supabase.co/rest/v1/ltk_snapshots`
   - **Authentication:** Header Auth → select the Supabase credential you created
   - **Send Headers:**  
     - `Content-Type`: `application/json`  
     - `Prefer`: `return=minimal`
   - **Send Body:** Yes  
   - **Body Content Type:** JSON  
   - **Specify Body:** Using JSON  
   - **JSON body:** map the same fields the formatter outputs:

**Body (JSON):** Use expressions so Supabase gets proper types. The "Format Row for Sheet" node outputs `user_info`, `commissions`, `performance`, `items_sold` as **strings**; parse them to objects for jsonb columns:

```json
{
  "extracted_at": "={{ $json.extracted_at }}",
  "creator_name": "={{ $json.creator_name }}",
  "source": "n8n_airtable",
  "user_info": "={{ typeof $json.user_info === 'string' ? JSON.parse($json.user_info || '{}') : $json.user_info }}",
  "commissions": "={{ typeof $json.commissions === 'string' ? JSON.parse($json.commissions || '{}') : $json.commissions }}",
  "performance": "={{ typeof $json.performance === 'string' ? JSON.parse($json.performance || '{}') : $json.performance }}",
  "items_sold": "={{ typeof $json.items_sold === 'string' ? JSON.parse($json.items_sold || '{}') : $json.items_sold }}",
  "items_sold_count": "={{ $json.items_sold_count ?? 0 }}"
}
```

If your formatter already outputs objects (not strings), you can use `"={{ $json.user_info }}"` etc. instead.

5. The connection from "Format Row for Sheet" to both "Append to Google Sheet" and "Insert LTK Snapshot to Supabase" is already in place. Save the workflow and run a test; confirm one new row in the Sheet and one new row in `ltk_snapshots` in Supabase (Table Editor).

---

## Step 4: Railway / CreatorMetrics app

Your Railway deployment (CreatorMetrics app) already points at this Supabase project via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. It does **not** need new env vars for this.

To **use** the new data:

- **Option A – Supabase only:** Query `ltk_snapshots` in the Supabase dashboard or in your own SQL/reports. Latest row = latest LTK snapshot.
- **Option B – In the app:** In the CreatorMetrics app (e.g. Dashboard or a new “LTK Sync” view), add a read from `ltk_snapshots` (e.g. “latest snapshot” or “last 7 days”) using the existing Supabase client and anon key. Authenticated users can read thanks to RLS.

No change is required to Airtable, token rotation, or Railway env vars for the mesh to work; adding the read in the app is optional.

---

## Summary

| Item | Action |
|------|--------|
| Airtable token / rotation | **No change** |
| Google Sheets append | **No change** |
| n8n workflow | **Add one HTTP Request node** after "Format Row for Sheet", and **one extra connection** from "Format Row for Sheet" to that node |
| Supabase | **Run `ltk_snapshots_table.sql`** once; then n8n inserts with **service role** key |
| Railway / CreatorMetrics | **Optional:** read from `ltk_snapshots` in the app |

Result: every time the LTK Reports workflow runs (manual or every 12 hours), the same payload goes to **Sheets** and to **Supabase**, so you finally get the LTK creator data you need in Supabase without breaking the working n8n + Airtable setup.
