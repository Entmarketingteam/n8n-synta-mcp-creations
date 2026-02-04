# LTK Reports to Google Sheets (Airtable Token)

**Workflow (live in n8n):** [LTK Reports to Google Sheets (Airtable Token)](https://entagency.app.n8n.cloud/workflow/2Rr3f3YCgy3OIZWX) · ID: `2Rr3f3YCgy3OIZWX`

Pull **LTK performance, analytics, commissions, user info, and items sold** into a Google Sheet using the **access token stored in Airtable** (from the LTK Token Rotation workflow).

---

## What this workflow does

1. **Reads the access token** from Airtable (same base/table as **LTK Token Rotation** – Nicki’s row).
2. **Calls the LTK API** (RewardStyle) with that token:
   - **Get User Info** – creator id, email, profile
   - **Get Commissions** – commissions summary (USD)
   - **Get Performance** – performance summary (last 30 days, UTC)
   - **Get Items Sold** – items sold (last 30 days, limit 100)
3. **Combines** all responses and **appends one row** to a Google Sheet.

Each run adds one row with: `extracted_at`, `creator_name`, `user_info` (JSON), `commissions` (JSON), `performance` (JSON), `items_sold` (JSON), `items_sold_count`.

---

## Prerequisites

- **LTK Token Rotation (Airtable)** workflow is running and writing fresh tokens to Airtable (base `appQnKyfyRyhHX44h`, table `tbl5TEfzBwGPeT1rX`, row for Nicki Entenmann).
- **Airtable credential** in n8n with access to that base (same as token rotation).
- **Google Sheets credential** in n8n.
- A **Google Sheet** with a tab for LTK reports (see column headers below).

---

## 1. Open the workflow

The workflow is already in your n8n instance:

- **Open:** https://entagency.app.n8n.cloud/workflow/2Rr3f3YCgy3OIZWX

(To re-import from file: **Workflows** → **Add workflow** → **⋮** → **Import from file** → choose **`workflows/ltk-reports-to-google-sheets.json`**.)

---

## 2. Configure credentials

- **Read Token from Airtable** – Select your Airtable credential (same one used by LTK Token Rotation).
- **Append to Google Sheet** – Select your Google Sheets credential.

---

## 3. Configure the Google Sheet

1. Create or open a Google Sheet and add a **sheet/tab** for LTK reports (e.g. `LTK Reports`).
2. Add a **header row** with these columns (exact names make mapping easier):

   | extracted_at | creator_name | user_info | commissions | performance | items_sold | items_sold_count |

3. In the **Append to Google Sheet** node:
   - **Document** – pick your spreadsheet (or paste the ID from the URL).
   - **Sheet** – pick the tab (e.g. `LTK Reports`).
   - If the node uses “Map Each Column Manually,” map each column to the matching expression (e.g. `extracted_at` → `{{ $json.extracted_at }}`). They should already be set in the imported workflow.

---

## 4. Test

1. Click **Test Workflow** (Manual Test trigger).
2. Check that:
   - **Read Token from Airtable** returns Nicki’s row with `Access_Token`.
   - All four HTTP nodes return 200 and data (no 401/403).
   - **Combine All Reports** and **Format Row for Sheet** run without errors.
   - **Append to Google Sheet** adds one row to your sheet.

If you get **401** or **403**: the Airtable token may be expired or the API may require an extra header (e.g. `x-id-token`). Ensure the Token Rotation workflow has run recently and that Airtable has a fresh `Access_Token`.

---

## 5. Schedule (optional)

- The workflow has an **Every 12 Hours** trigger; turn the workflow **Active** to run it on that schedule.
- You can change the interval in the Schedule Trigger node (e.g. daily).

---

## API endpoints used

| Report        | Endpoint |
|---------------|----------|
| User Info     | `GET https://api-gateway.rewardstyle.com/api/co-api/v1/get_user_info` |
| Commissions   | `GET .../creator-analytics/v1/commissions_summary?currency=USD` |
| Performance   | `GET .../creator-analytics/v1/performance_summary?start_date=...&end_date=...&timezone=UTC` |
| Items Sold    | `GET .../creator-analytics/v1/items_sold/?limit=100&start=...&end=...&currency=USD` |

All requests use header: `Authorization: Bearer <Access_Token>` from Airtable.

---

## Brands and links reporting

The current workflow uses the **verified** endpoints above (user info, commissions, performance, items sold). LTK’s **legacy analytics** endpoints (e.g. `hero_chart`, `top_performers/links`) may require different paths or auth; if you have HAR or docs for “brands” or “links” reporting, we can add more HTTP nodes and columns to this workflow.

---

## Summary

- **Workflow file:** `workflows/ltk-reports-to-google-sheets.json`
- **Token source:** Airtable (same as LTK Token Rotation).
- **Output:** One new row per run in Google Sheets with user info, commissions, performance, and items sold (JSON + count).
