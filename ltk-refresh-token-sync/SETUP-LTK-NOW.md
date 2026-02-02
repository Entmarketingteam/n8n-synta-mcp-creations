# LTK credentials – one-time setup (Nicki)

Use this to get the **LTK Self-Healing Token Sync** workflow running with the token you provided.

---

## 1. Create table in your Airtable base

1. Open your base: [https://airtable.com/appQnKyfyRyhHX44h](https://airtable.com/appQnKyfyRyhHX44h)  
   (Same base as ShopMy; table `tblZkX1SuNlo2DNOb` is for ShopMy CSV – leave it as is.)

2. **Add a new table** in that base. Name it: **LTK_Credentials**.

3. Add these **fields** (exact names):

   | Field name     | Type          |
   |----------------|---------------|
   | Creator        | Single line text |
   | Refresh_Token  | Long text     |
   | Access_Token   | Long text     |
   | ID_Token       | Long text     |

4. **Add one record**:

   | Creator          | Refresh_Token |
   |------------------|---------------|
   | Nicki Entenmann  | `v1.MX9twPRh-8RfDfmmuEgYmX5SPqDo4I0m-37JfpnyIeSce51x7L4h-5fCnF-S048k--yxLUsajKbmloHypxEfuT8` |

   (Copy the full `v1.xxx...` value; leave Access_Token and ID_Token empty – the workflow will fill them.)

5. Copy the **table ID** from the URL:  
   `https://airtable.com/appQnKyfyRyhHX44h/tblXXXXXXXX/...` → table ID is **tblXXXXXXXX**.

---

## 2. Point the n8n workflow at that table

1. Open **[LTK Self-Healing Token Sync](https://entagency.app.n8n.cloud/workflow/ZsuR4dbEpTUH7q06)**.

2. **Airtable Get Creators** and **Airtable Update Tokens:**  
   - Base is already set to `appQnKyfyRyhHX44h`.  
   - Choose your Airtable credential and select table **LTK_Credentials** (the one you just created).

3. **Store to Sheets:** pick your Google Sheets doc + sheet.

4. Save, then run once with **Manual Trigger**.

---

## 3. (Optional) Use the script instead of manual table + row

If you have an Airtable [personal access token](https://airtable.com/create/tokens) (scopes: `data.records:read`, `data.records:write`, `schema.bases:read`; add `schema.bases:write` to create the table via API):

```bash
cd ltk-refresh-token-sync
AIRTABLE_API_KEY=patYourToken LTK_REFRESH_TOKEN='v1.MX9twPRh-8RfDfmmuEgYmX5SPqDo4I0m-37JfpnyIeSce51x7L4h-5fCnF-S048k--yxLUsajKbmloHypxEfuT8' CREATE_TABLE=1 node scripts/setup-airtable.js
```

That will create the table (if missing) and add the Nicki row. Then do step 2 above in n8n.

---

**Security:** Rotate the refresh token if this file was ever committed or shared. You can get a new one from the browser (Local Storage at creator.shopltk.com) and update the Airtable row.
