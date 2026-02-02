# Airtable schema for LTK Self-Healing Token Sync

Create one base (e.g. **Affiliate Sync**) and one table **LTK_Credentials**.

---

## Table: `LTK_Credentials`

| Field name       | Type     | Required | Notes |
|------------------|----------|----------|--------|
| **Creator**      | Single line text | Yes | Display name, e.g. Nicki Entenmann |
| **Refresh_Token**| Long text        | Yes | From browser Local Storage (`auth._refresh_token.auth0`) |
| **Access_Token** | Long text        | No  | Filled by workflow after first refresh |
| **ID_Token**     | Long text        | No  | Filled by workflow after first refresh |

- **Refresh_Token** must be set once per creator (see README: get from DevTools).
- **Access_Token** and **ID_Token** are updated by n8n on every run so the next run can use them; you can leave them empty initially.

---

## Optional: sync output table

If you want to store LTK data in Airtable instead of (or in addition to) Google Sheets, create a second table, e.g. **LTK_Sync_Data**, with columns:

- **Creator** (text)
- **extracted_at** (date or text)
- **user_info** (long text, JSON)
- **commissions** (long text, JSON)
- **performance_summary** (long text, JSON)

Then in n8n, replace or duplicate the “Store to Sheets” node with an Airtable “Create record” node pointing to this table.
