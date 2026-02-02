# ShopMy automation & where data goes

## Where the data is dumped

All ShopMy API data (Payments, Payout summary, Pins) is written to **Airtable**:

| | |
|---|---|
| **Base ID** | `appQnKyfyRyhHX44h` |
| **Table ID** | `tblZkX1SuNlo2DNOb` |
| **Direct link** | `https://airtable.com/appQnKyfyRyhHX44h/tblZkX1SuNlo2DNOb` |

Flow:

1. **ShopMy API (Creators)** workflow logs in, fetches Payments, Payouts, Pins, and builds a CSV with a `Source` column.
2. It calls **ShopMy CSV Processor (Creators)** via Execute Sub-workflow.
3. The CSV Processor parses the CSV, deduplicates, and uses the **Store to Airtable** node to **create** rows in that table.
4. Each row includes: **ReportType**, **ImportDate**, **CreatorId**, **CreatorEmail**, plus all CSV columns (e.g. Source, payment/payout/pin fields). Columns are auto-mapped from the parsed CSV.

So every run adds new rows to that Airtable table (no overwrite). Use Airtable views/filters and dedupe logic in the processor if you want to avoid true duplicates.

### Where is the Airtable node?

The **Store to Airtable** node lives in the **sub-workflow**, not in the main API workflow:

- **ShopMy API (Creators)** (the one you see first) has: Schedule → Set credentials → Login → APIs → Merge → Build CSV → **Execute CSV Processor** → Respond. No Airtable node here.
- **ShopMy CSV Processor (Creators)** is the workflow that **Execute CSV Processor** calls. It has: Execute Workflow Trigger / Webhook / Manual → Normalize → Parse CSV → Dedupe → Split Out → **Store to Airtable** → Aggregate → Send Response.

To see and configure the Airtable node:

1. Open **ShopMy CSV Processor (Creators)** in n8n:  
   **https://entagency.app.n8n.cloud/workflow/QJZ8d0VYinQdzWpC**
2. Find the **Store to Airtable** node (after "Split Out Records").
3. Ensure the node has an **Airtable credential** selected (n8n Credentials). Without it, the node will fail at runtime. Base `appQnKyfyRyhHX44h` and table `tblZkX1SuNlo2DNOb` are already set in the node.

---

## How it’s automated

The **ShopMy API (Creators)** workflow (n8n) has three ways to run:

### 1. **Daily Schedule (automation)**

- A **Daily Schedule** trigger is in the workflow.
- It’s set to run **once per day** (e.g. 9:00 AM in the workflow/timezone).
- The schedule feeds into **Set creator & credentials**, so the same ShopMy account (Nicki) is used and data is pulled and then sent to the CSV Processor → Airtable.

**To turn automation on:**

1. Open the workflow **ShopMy API (Creators)** in n8n:  
   `https://entagency.app.n8n.cloud/workflow/RFqqdDjZdGOuLSGx`
2. Use the **Daily Schedule** node to set the exact time (and timezone if needed).
3. **Activate** the workflow (toggle in the top-right).  
   Only when the workflow is **active** will the schedule run.

After that, the workflow will run on the schedule, pull ShopMy data, and new rows will appear in the Airtable table above.

### 2. **Manual run**

- Click **Execute Workflow** (Manual Trigger) in n8n whenever you want a one-off run.
- Same path: Set credentials → Login → APIs → Build CSV → Execute CSV Processor → Airtable.

### 3. **Webhook (other tools / scripts)**

- `POST https://entagency.app.n8n.cloud/webhook/shopmy-api-creators`
- Body (JSON): `creatorId`, `creatorEmail`, `shopmyEmail`, `shopmyPassword`  
  If you omit credentials, the run still uses the **Set creator & credentials** values when the webhook path eventually hits that logic (e.g. after Normalize). For a webhook-only run with different creators, send all four fields in the body.

---

## Summary

| Question | Answer |
|----------|--------|
| **Where is data dumped?** | Airtable base `appQnKyfyRyhHX44h`, table `tblZkX1SuNlo2DNOb`. |
| **How do I automate it?** | Activate **ShopMy API (Creators)** in n8n and set the **Daily Schedule** node to the time you want. |
| **How often does it run by default?** | Once per day when the schedule trigger is configured and the workflow is active. |
| **Can I change the schedule?** | Yes. Edit the **Daily Schedule** node (e.g. time, or add a cron rule for a different frequency). |
