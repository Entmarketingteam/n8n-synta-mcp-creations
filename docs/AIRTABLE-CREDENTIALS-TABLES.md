# Airtable credential tables (ShopMy, Mavely, Amazon, LTK)

Base: **appQnKyfyRyhHX44h**

**All login credentials for ShopMy, LTK, Amazon, and Mavely are stored in Airtable** (not in Doppler or n8n env). The n8n workflows read from the tables below when run on schedule or manually.

---

## Table IDs

| Table               | Table ID            | Direct link |
|---------------------|---------------------|-------------|
| **Mavely credentials** | `tbllD6GuMSSEuN0Nq` | [Open Mavely table](https://airtable.com/appQnKyfyRyhHX44h/tbllD6GuMSSEuN0Nq/viwoSN7pmoUZaVguJ?blocks=hide) |
| **Earnings** (Mavely/creator earnings destination) | `tblZkX1SuNlo2DNOb` | Same base – where Normalized Earnings rows are stored |
| **ShopMy credentials** | (see your base; get from table URL) | Same base, your shopmy_credentials table |

The **Mavely** workflow uses table **tbllD6GuMSSEuN0Nq**. The **ShopMy Payout Summary** workflow uses **Get ShopMy creators from Airtable**: set its Table to your shopmy_credentials table ID. If your **shopmy_credentials** is a different table, set “Get creators to process” in the ShopMy workflow to that table’s ID (from its URL: `.../tblXXXXXXXX/...`).

---

## mavely_credentials (for Mavely Creators – Daily)

**Table ID:** `tbllD6GuMSSEuN0Nq` · [Open in Airtable](https://airtable.com/appQnKyfyRyhHX44h/tbllD6GuMSSEuN0Nq/viwoSN7pmoUZaVguJ?blocks=hide)

**Workflow:** Mavely Creators – Daily auth & analytics (`3gYfgPzMu6wZ1OEZ`)

**Suggested columns:**

| Column name     | Type         | Used as        |
|-----------------|--------------|----------------|
| Email           | Single line  | Mavely login   |
| Password        | Long text    | Mavely password|
| Creator_ID      | Single line  | creator_id in outputs (e.g. `nicki-entenmann`) |
| **Mavely_Cookies** | Long text  | **Cookie/token rotation:** written by the workflow after each login. Optional: add this column (Long text); the workflow will update it with the current session cookie so the table holds the latest auth. You can later use it to skip login when valid. |

**Also accepted:** `mavelyEmail`, `mavelyPassword`, `creatorId`, `Creator`, `creator_id`, `email`, `password`. For cookies: `Cookie`, `Cookies`, `mavelyCookies`.

The workflow uses the **first record** from the table. After each run, **Update Mavely credentials (cookies)** writes the session cookie back to that record’s **Mavely_Cookies** column so the table takes care of cookie storage and rotation.

---

## Earnings table (Mavely → Airtable)

**Table ID:** `tblZkX1SuNlo2DNOb` (base `appQnKyfyRyhHX44h`)

**Workflow:** Mavely Creators – Daily writes one row per run via **Store to Airtable**. Columns must match **exactly** (case-sensitive):

| Column name          | Type         | Source |
|----------------------|--------------|--------|
| Creator ID           | Single line  | From mavely_credentials Creator_ID |
| Source Platform      | Single line  | `mavely` |
| Period Start         | Date or text | First day of current month (YYYY-MM-DD) |
| Period End           | Date or text | Today (YYYY-MM-DD) |
| Normalized Earnings  | Number       | Commission from mavely.live GraphQL |
| Recorded At          | Text or Date | ISO timestamp |
| Raw Payload          | Long text    | JSON string of metrics (clicks, sales, etc.) |
| Currency             | Single line  | `USD` |
| Raw Type             | Single line  | `commission` |

If you get “Unknown field name”, rename the column in Airtable to match (e.g. **Currency** not “Currenty”).

---

## shopmy_credentials (ShopMy logins)

Used by: **ShopMy – Browserbase login** (`giKDiwQYUCnJKO45`) and **ShopMy Creator Data Pipeline (Payout Summary)** (`C0hOb9317SvRUojf`).

**Suggested columns:**

| Column name    | Type         | Used as                    |
|----------------|--------------|----------------------------|
| Creator_ID     | Single line  | creatorId (e.g. `nicki-entenmann`) |
| Creator_Email  | Single line  | creatorEmail               |
| ShopMy_Email   | Single line  | ShopMy login               |
| ShopMy_Password| Long text    | ShopMy password            |
| ShopMy_Cookies | Long text    | Optional – JSON array of cookies from POST /auth/refresh |

**Also accepted:** `creatorId`, `creatorEmail`, `Email`, `Password`, `Cookies`, `cookie`.

When **Schedule** runs the workflow, it loads all rows from this table and runs the runner once per row. If **ShopMy_Cookies** is set, the runner uses it and skips login; otherwise it uses email/password. You can optionally add a step to write updated cookies back to this table after a refresh.

---

## Security

- Keep the base **private** and limit who can edit.
- Prefer **Long text** for passwords and cookies so they aren’t shown in list views.
- Rotate any password that was ever in a HAR or shared doc.

---

## Quick reference

| What              | Where |
|-------------------|--------|
| Base ID           | `appQnKyfyRyhHX44h` |
| Mavely credentials node | “Get Mavely credentials from Airtable” → Table = mavely_credentials table ID |
| ShopMy credentials node | “Get creators to process” → Table = shopmy_credentials table ID |
| Airtable credential in n8n | “Airtable - ShopMy Creators” (or same PAT used for this base) |
