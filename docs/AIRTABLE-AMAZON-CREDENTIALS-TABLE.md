# Airtable: Amazon_Credentials table

Use this when the **Amazon_Credentials** table (or whatever table you use for Amazon Creators API) is empty and you need to add the right columns.

---

## Columns to add

Add these **fields** to your **Amazon_Credentials** table (one row per creator who has Amazon Creators API access):

| Field name            | Type          | Purpose |
|-----------------------|---------------|--------|
| **Creator**           | Single line text | Creator name (e.g. "Nicki Entenmann"). Used by the workflow filter. |
| **Credential_ID**     | Single line text | Amazon Creators API **Credential ID** (from Associates Central → Tools → Creators API → Create Credential). |
| **Credential_Secret** | Long text (or Single line) | Amazon Creators API **Credential Secret** (shown once when you create the credential). |
| **Version**           | Single line text | API version / region, e.g. `2.1` for North America. Optional; workflow defaults to `2.1` if missing. |

---

## Where to get the values

1. Go to [Amazon Associates Central](https://affiliate-program.amazon.com) → **Tools** → **Creators API** → Create Application (if needed) → **Create Credential**.
2. Copy the **Credential ID** and **Credential Secret** (save the secret somewhere safe; it’s only shown once).
3. In Airtable, add one row: set **Creator** to the person’s name, **Credential_ID** and **Credential_Secret** to those values, and **Version** to `2.1` (or your region’s version).

---

## Connect n8n to this table

In the **Amazon Creators API – Get Token** workflow, the **Read from Airtable** node must use:

- **Base (By ID):** your base ID (from the Airtable URL: `airtable.com/appXXXXXXXXXX/...` → use the full `app...` part).
- **Table (By ID):** the table that has the columns above (from the table URL or “Copy link” you’ll see `tblXXXXXXXXXX`).

If your base is **“Claude Created LTK and AMAZON EARNINGS”** and the table is **Amazon_Credentials**, use that base’s `app...` ID and the Amazon_Credentials table’s `tbl...` ID in the node. The workflow’s filter (e.g. by Creator name) will then pick the right row.
