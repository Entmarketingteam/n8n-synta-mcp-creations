# Airtable: Amazon Creators API credentials

Nicki Entenmann’s (and other creators’) **Amazon Creators API** credentials are stored in Airtable so n8n can read them and request Bearer tokens without using env vars per creator.

---

## Base and table

| | Value |
|---|--------|
| **Base ID** | `appQnKyfyRyhHX44h` |
| **Table ID** | `tblNovDWyu1iHoJf0` |
| **View (optional)** | `viwQDc4R803DnwZWj` |
| **Direct link** | [Airtable – Creators API credentials](https://airtable.com/appQnKyfyRyhHX44h/tblNovDWyu1iHoJf0/viwQDc4R803DnwZWj?blocks=hide) |

---

## Table: Creators API credentials

Use one row per creator. Field names below match what the **Amazon Creators API – Get Token** workflow expects (or use a Set node to map your names to these).

| Field name | Type | Required | Notes |
|------------|------|----------|--------|
| **Creator** | Single line text | Yes | Display name, e.g. Nicki Entenmann (for filtering in n8n). |
| **Credential_ID** | Single line text | Yes | Creators API Credential ID (from Associates Central → Tools → Creators API → Create Credential). |
| **Credential_Secret** | Long text | Yes | Creators API Credential Secret (shown once; store securely). |
| **Version** | Single line text | No | Region version: `2.1` (NA), `2.2` (EU), `2.3` (FE). Defaults to `2.1` in workflow if empty. |
| **Email** | Single line text | No | Amazon Associates Central login email (for scraper / testing). |
| **Password** | Long text | No | Amazon Associates Central login password (for scraper / testing). Store only in a private base. |

The **Get Token** workflow also accepts **Client ID** / **Secret Key** (with spaces) or **Client_ID** / **Secret_Key** — it checks these names so your Airtable column names can match what you see in Amazon’s UI.

If your Airtable uses other names, either:

- Rename the columns to **Credential_ID** and **Credential_Secret**, or  
- Add an **Edit Fields (Set)** node after “Read from Airtable” that maps `Client_ID` → `Credential_ID` and `Secret_Key` → `Credential_Secret` before the “Get Creators API Token” node.

---

## n8n usage

- **Workflow:** [Amazon Creators API – Get Token](https://entagency.app.n8n.cloud) (`workflows/amazon-creators-api-get-token.json`).
- **Flow:** Manual (or Schedule) → **Read from Airtable** (base `appQnKyfyRyhHX44h`, table `tblNovDWyu1iHoJf0`, filter e.g. `{Creator} = "Nicki Entenmann"`) → **Get Creators API Token** (POST OAuth2 using `Credential_ID` and `Credential_Secret` from the Airtable row) → **Output Token**.
- **Credentials:** Attach your Airtable credential (e.g. Airtable PAT) to the “Read from Airtable” node.

See [AMAZON-CREATORS-API.md](AMAZON-CREATORS-API.md) for token endpoints by region and how to use the token in catalog API calls.
