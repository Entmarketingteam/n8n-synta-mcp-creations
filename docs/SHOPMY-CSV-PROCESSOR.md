# ShopMy CSV Processor – Testing & Fixes

## What was fixed

1. **Manual Trigger added** – You can run the workflow from the n8n UI even when the webhook isn’t registered.
2. **Send Response set to “continue on error”** – Manual runs won’t fail at the end when there’s no webhook to respond to.

## How to test in n8n (recommended)

1. Open the workflow: [ShopMy CSV Processor](https://entagency.app.n8n.cloud/workflow/bHdOukHg0vBxTVud).
2. Click **“Test workflow”** (or **“Execute workflow”**).
3. For **Manual Trigger**, set the input to one item with this JSON:
   ```json
   {
     "csvData": "date,earnings,link\n2025-01-01,10.50,https://example.com/1\n2025-01-02,20.00,https://example.com/2",
     "reportType": "shopmy_export"
   }
   ```
4. Run it. You should see data flow: Parse → Deduplicate → Split Out → Store to Airtable → Aggregate. Check the **Store to Airtable** node for success and your Airtable base for new rows.

## If you want the webhook to work (POST from outside)

The production webhook was returning 404. To re-register it:

1. Open the workflow in n8n.
2. Turn the workflow **off** (toggle top-right), save.
3. Turn it **on** again, save.
4. In the **Webhook** node, copy the **Production URL** (e.g. `https://entagency.app.n8n.cloud/webhook/shopmy-csv`).
5. Test with:
   ```bash
   curl -X POST "https://entagency.app.n8n.cloud/webhook/shopmy-csv" \
     -H "Content-Type: application/json" \
     -d '{"csvData": "date,earnings,link\n2025-01-01,10.50,https://example.com/1", "reportType": "shopmy_export"}'
   ```

## What this workflow does (and doesn’t do)

- **Does:** Accepts CSV in the request body (`csvData`), parses it, deduplicates, writes rows to Airtable.
- **Does not:** Log in to ShopMy or download the CSV. Something else (another workflow, script, or manual export) must get the CSV and POST it to this workflow.

To add “login to ShopMy and download CSV,” you’d need a separate trigger (e.g. Schedule or Manual) plus nodes that authenticate to ShopMy and fetch the CSV, then pass that CSV into this flow (or into the webhook body).
