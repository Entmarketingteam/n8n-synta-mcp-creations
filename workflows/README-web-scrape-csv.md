# Web Scrape → CSV → Email, Google Sheets & Excel

Starter workflow inspired by the [n8n template “Automated web scraping: email a CSV, save to Google Sheets & Microsoft Excel”](https://n8n.io/workflows/2275-automated-web-scraping-email-a-csv-save-to-google-sheets-and-microsoft-excel/) (ID 2275).

## Deployed on your instance

- **Workflow:** [Web Scrape → CSV → Email, Google Sheets & Excel](https://entagency.app.n8n.cloud/workflow/x7JMZEQiKOAqVZdM)
- **ID:** `x7JMZEQiKOAqVZdM`

## What it does

1. **Manual Trigger** – Run on demand (you can add a Schedule trigger later).
2. **Fetch website content** – HTTP Request GET; set the URL (default: `https://example.com`).
3. **Parse HTML and extract data** – Code node extracts links (`<a href="...">text</a>`) into rows `{ url, text }`. Customize the regex or switch to an HTML node with CSS selectors for your target site.
4. **Convert to CSV** – Builds a CSV string and outputs it as binary for the email.
5. **Send CSV via email** – Gmail node sends the CSV as an attachment to `marketingteam@entagency.co`.
6. **Save to Google Sheets** – Appends extracted rows; you must set **Document** and **Sheet**.
7. **Save to Microsoft Excel 365** – Appends rows; you must set **Document** and **Sheet** and have Microsoft Graph credentials.

## Setup (required)

1. **Fetch website content**
   - Set **URL** to the page you want to scrape (e.g. `https://yoursite.com/page`).
   - If the next node expects plain HTML, set response format to **Text** in the node’s options if needed.

2. **Parse HTML**
   - Default logic extracts all links. For tables or other structure, edit the Code node or add an **HTML** node with CSS selectors (see [n8n HTML node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.html/)).

3. **Send CSV via email**
   - Add **Gmail** credentials (OAuth2) with Gmail send scope.
   - Change **Send to** if you want a different recipient.

4. **Save to Google Sheets**
   - Add **Google Sheets** credentials (Google Cloud with Sheets API).
   - Choose **Document** (spreadsheet ID or pick from list) and **Sheet** (e.g. `Sheet1`).
   - Ensure columns match: `url`, `text` (or adjust the mapping).

5. **Save to Microsoft Excel 365**
   - Add **Microsoft Excel 365** credentials (Azure AD / Microsoft Graph with Files and Excel permissions).
   - Choose **Document** (OneDrive/SharePoint file) and **Sheet**.
   - Map columns to `url` and `text` (or your fields).

## File in this repo

- **JSON:** `workflows/web-scrape-csv-email-sheets.json` – same workflow; you can re-import or version-control it.

## Extending

- **Different site / structure:** Change the **Parse HTML** Code node (or use the HTML node with selectors).
- **Schedule:** Add a **Schedule Trigger** and connect it to **Fetch website content** (and optionally disable Manual Trigger).
- **Only email, or only Sheets:** Disable or delete the branches you don’t need.
- **Airtable instead of Excel:** Add an Airtable node after **Parse HTML** and map `url` / `text` to your base/table.
