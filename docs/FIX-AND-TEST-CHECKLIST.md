# Fix and test checklist

Do these in order. Each section is something **you** do (Airtable / n8n UI), then how to **test**.

---

## 1. Mavely (Airtable + manual run)

**Fix (2 min)**  
- Open [Airtable base](https://airtable.com/appQnKyfyRyhHX44h) and the table you use for **mavely_credentials** (e.g. the one with ID `tbllD6GuMSSEuN0Nq` if that’s it).  
- Add **one row** with:
  - **Email** = your Mavely login email  
  - **Password** = your Mavely password  
  - (Optional) **Creator_ID** = e.g. `nicki-entenmann`

**Test**  
- In n8n open [Mavely Creators – Daily](https://entagency.app.n8n.cloud/workflow/3gYfgPzMu6wZ1OEZ).  
- Click **Execute Workflow** (Manual Trigger).  
- It should: read Airtable → GET CSRF → POST Login → extract cookies → GET Session → GET analytics → parse → Store to Airtable.  
- If it fails at “No Set-Cookie”, the redirect/cookie fix may not be in the live workflow; re-import from `workflows/mavely-creators-daily.json` or set the POST Login node to **not follow redirects** and **never error**.

---

## 2. ShopMy runner URL (n8n)

**Fix (1 min)**  
- Deploy the runner if you haven’t: from `shopmy-browserbase-runner/` run `railway up` (or connect the repo to Railway and set `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`).  
- Note the runner URL (e.g. `https://shopmy-browserbase-runner-production.up.railway.app`).  
- In n8n open [ShopMy – Browserbase login](https://entagency.app.n8n.cloud/workflow/giKDiwQYUCnJKO45).  
- Open the **Call Browserbase runner** node.  
- Set **URL** to `https://YOUR-ACTUAL-URL/run` (replace `YOUR_RUNNER_URL`).  
- Save.

**Test**  
- **Execute Workflow** (Manual Trigger).  
- It uses “Set creators (fallback / test)” so it should call your runner; you should see either CSV back or an error from the runner (not “Invalid URL”).

---

## 3. Webhooks (n8n UI toggle)

**Fix (1 min)**  
- In n8n open:
  - [ShopMy CSV Processor (Creators)](https://entagency.app.n8n.cloud/workflow/QJZ8d0VYinQdzWpC)  
  - [Amazon Associates Report Ingest](https://entagency.app.n8n.cloud/workflow/WOdJrynlMl1zGxog)  
- For **each** workflow: turn the toggle in the **top-right** **ON** (active).  
- Save if prompted.

**Test**  
From the repo root:

```bash
./scripts/verify-creator-pipelines.sh
```

You should see **OK (HTTP 200)** for both Amazon and ShopMy. If either is still 404, leave the workflow open, toggle off then on again, save, and run the script again.

---

## 4. Optional: ShopMy from Airtable (schedule path)

**Fix**  
- In the same Airtable base, in your **shopmy_credentials** table, add one row per creator with **ShopMy_Email**, **ShopMy_Password**, and optionally **Creator_ID**, **Creator_Email**, **ShopMy_Cookies**.  
- In the ShopMy workflow, ensure “Get creators to process” uses the **shopmy_credentials** table ID (see [AIRTABLE-CREDENTIALS-TABLES.md](AIRTABLE-CREDENTIALS-TABLES.md)).

**Test**  
- Use the **Schedule** trigger (or run manually with the schedule path by temporarily connecting Schedule to “Get creators to process” and running).  
- It should read Airtable, map to runner payload, loop, and call the runner for each row.

---

## Quick reference

| Step | Where | What |
|------|--------|------|
| Mavely credentials | Airtable | One row: Email, Password (Creator_ID optional). |
| ShopMy runner URL | n8n → Call Browserbase runner | URL = `https://your-runner.up.railway.app/run`. |
| Webhooks | n8n → each workflow | Toggle **ON** (top-right), save. |
| Verify webhooks | Terminal | `./scripts/verify-creator-pipelines.sh` |

After 1–3 you can fix and test Mavely, ShopMy manual run, and both webhooks. Step 4 is for running ShopMy on a schedule from Airtable.
