# LTK Token Rotation (Airtable) – 422 Fix

**Workflow:** [LTK Token Rotation (Airtable)](https://entagency.app.n8n.cloud/workflow/a9gH2UthD2w239iv)

## What was fixed

The **Save New Tokens to Airtable** node was returning **422 INVALID_RECORDS** (“You must provide an array of up to 10 record objects, each with an \"id\" ID field and a \"fields\" object for cell values”). Two causes:

1. **Expression-based record ID** – n8n’s Airtable Update node (v2) is known to fail with 422 when the record ID is an expression (e.g. `{{ $node['Read Token from Airtable'].json.id }}`) instead of a plain value.
2. **ID in “fields”** – Sending `id` inside the update payload can make Airtable treat the request as invalid.

## Fix applied (Synta MCP)

1. **New node: “Format for Airtable”** (Set)  
   Placed after the **Token Refreshed?** true branch. It builds a single item with:
   - `id` ← from Read Token from Airtable (resolved once here)
   - `Refresh_Token`, `Access_Token`, `ID_Token`, `Last_Refreshed`, `Status`  
   Field names match the Airtable table so the next node can map them automatically.

2. **Success path rewire**  
   - **Token Refreshed?** (true) → **Format for Airtable** → **Save New Tokens to Airtable** → **Success**  
   - Removed the direct connection from **Token Refreshed?** to **Save New Tokens to Airtable**.

3. **Save New Tokens to Airtable**  
   - **Mapping:** “Map Automatically” (`autoMapInputData`).  
   - **Columns to match on:** `id`.  
   - The node now receives one item from **Format for Airtable** with `id` and the token/status fields. It uses `id` only for record matching and sends the rest in `fields`, which matches the Airtable API and avoids the 422.

4. **IF node**  
   - `conditions.options` now includes `version: 2` so the workflow passes validation where required.

## What you need to do

- No manual field mapping in **Save New Tokens to Airtable**; it’s all driven by **Format for Airtable**.
- Ensure **Format for Airtable** and **Save New Tokens to Airtable** use the same Airtable credential and base/table as before.
- Run **Test Workflow** from **Manual Test**; the success branch should run without 422 and Airtable should show updated tokens and **Last_Refreshed** / **Status**.

## If you still see 422

- In Airtable, make sure the **Refresh_Token** cell has no extra quotes or spaces (value should start with `v1.` and nothing else).
- Confirm the **id** used for matching is the Airtable record id (e.g. `recXXXXXXXXXXXXXX`).

---

## What’s next (after login is taken care of)

Now that Nicki’s LTK tokens are refreshed and stored in Airtable every 8 hours, the next step is **using that token** to call the LTK API (user info, commissions, performance).

**Recommended:** Add or use a workflow that:

1. **Reads from Airtable** – same base/table/row as token rotation (e.g. filter `Creator = "Nicki Entenmann"`) to get the current **Access_Token**.
2. **Calls the LTK API** with that token, for example:
   - **Get User Info** – `GET https://creator-api-gateway.shopltk.com/v1/...` (or the endpoints from **LTK-NICKI-OAUTH2-SETUP.md**) with header `Authorization: Bearer {{ $json.Access_Token }}`.
   - **Get Commissions** – commissions summary.
   - **Get Performance** – performance summary (date range, timezone).
3. **Stores or sends the result** – e.g. Google Sheets, Slack, or another workflow.

That way one source of truth (Airtable) feeds both token rotation and data extraction; no separate OAuth2 sign-in or Painless Runner config needed for extraction.

**Other options:**

- **LTK Data Extraction (OAuth2 PKCE)** – workflow `NX2eP2Gig0EK99QH` uses n8n’s OAuth2 credential; Nicki signs in once in the browser. Only works if LTK has whitelisted n8n’s callback URL (see **LTK-NICKI-OAUTH2-SETUP.md**).
- **LTK Data Extraction (Painless Runner)** – workflow `8sWnYXvPF7cpOWpl` uses the Browserbase runner and stores refresh token in workflow static data. You could keep using that for extraction, but then you’d have two token sources (Airtable + static data); using Airtable for both rotation and extraction is simpler.
