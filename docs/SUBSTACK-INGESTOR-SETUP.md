# Substack Ingestor → Airtable Setup

Automated pipeline: paste a Substack article URL in Airtable, click **Scrape**, and the worker logs into Substack (bypassing paywall with your credentials), converts the article to Markdown, and writes it back to Airtable.

## Architecture

- **Frontend:** Airtable (base + Scripting Extension with a "Scrape" button).
- **Backend:** Flask app on Railway (`/scrape` endpoint).
- **Secrets:** Doppler (`SUBSTACK_EMAIL`, `SUBSTACK_PASSWORD`, `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`).

## Airtable schema

| Field Name   | Type         | Purpose                          |
|-------------|--------------|-----------------------------------|
| URL         | URL          | Substack article link             |
| Status      | Single Select| Pending, Processing, Done, Error (add all four as options) |
| Content     | Long Text    | Markdown output (Rich Text ok)    |
| Author/Pub  | Single Line  | Metadata for LLM context         |

Optional: **Error Detail** or **Notes** if you want a separate error field (otherwise errors are written into **Content** when Status = Error).

## 1. Doppler secrets

In Doppler (project `ent-agency-automation`, config `prd` or your chosen config), set:

- `SUBSTACK_EMAIL` – Substack account email (paid subscriber).
- `SUBSTACK_PASSWORD` – Substack password.
- `AIRTABLE_API_KEY` – Airtable personal access token (create at [airtable.com/create/tokens](https://airtable.com/create/tokens); scope: `data.records:read`, `data.records:write` and the base).
- `AIRTABLE_BASE_ID` – Base ID from the base URL: `https://airtable.com/appXXXXXXXXXXXXXX/...` → `appXXXXXXXXXXXXXX`.
- Optional: `AIRTABLE_TABLE_NAME` – table name (default: `Substack Articles`).

## 2. Deploy to Railway

1. Push the `substack-ingestor` app to GitHub.
2. In Railway: **New Project** → **Deploy from GitHub** → select the repo and (if needed) the `substack-ingestor` directory or root if the app lives at repo root.
3. Add Doppler integration to the Railway service so the service gets the same env vars (or add the vars manually in Railway).
4. Railway will use the **Procfile** or **railway.toml** start command (gunicorn). Expose the service and note the public URL, e.g. `https://substack-ingestor-production.up.railway.app`.

## 3. Airtable Scripting Extension (Scrape button)

1. In your Airtable base, add an **Extension** → **Scripting**.
2. Paste the script below and set `RAILWAY_SCRAPE_URL` to your Railway `/scrape` URL (e.g. `https://substack-ingestor-production.up.railway.app/scrape`).
3. Run the script from the script’s **Run** button, or attach it to a button in a custom UI (e.g. **Interface** or **Scripting** block that runs on button click).

```javascript
// Substack Ingestor – trigger scrape from Airtable
const RAILWAY_SCRAPE_URL = "https://YOUR-APP.up.railway.app/scrape";

const table = base.getTable("Substack Articles"); // or your table name
const record = await input.recordAsync("Select the record to scrape", table);
if (!record) return;

const url = record.getCellValue("URL");
if (!url || !url.toString().trim()) {
  output.markdown("No URL in this record.");
  return;
}

// Set status to Processing
await table.updateRecordAsync(record.id, { "Status": { name: "Processing" } });

const response = await fetch(RAILWAY_SCRAPE_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    record_id: record.id,
    url: url.toString().trim(),
  }),
});

const data = await response.json();
if (data.ok) {
  output.markdown("Scrape started. Status will change to **Done** (or **Error**) when the worker finishes.");
} else {
  await table.updateRecordAsync(record.id, {
    "Status": { name: "Error" },
    "Content": data.error || "Request failed",
  });
  output.markdown("Error: " + (data.error || response.statusText));
}
```

To make it a one-click “Scrape” button: in **Interfaces**, add a **Button** that runs this script, or keep the Scripting extension and run it after selecting a record.

## 4. User workflow

1. Paste a Substack article URL into the **URL** field of a record.
2. Click the **Scrape** button (or run the script and select that record).
3. Status goes to **Processing**, then the worker updates the record to **Done** (with **Content** and **Author/Pub** filled) or **Error** (with error message in **Content** or in your error field).

## 5. Success criteria

- **Zero local setup:** No Python on your laptop; everything runs in Railway + Airtable.
- **Paywall bypass:** Uses your Substack credentials to fetch paid-only content.
- **Format:** Headers, bolding, and lists preserved in Markdown in **Content**.

## 6. Optional: table name

If your table is not named `Substack Articles`, set in Doppler (or Railway env):

- `AIRTABLE_TABLE_NAME=Your Table Name`

The app uses this for both reading and updating records.
