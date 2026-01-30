# ShopMy creator auth – reuse login (Coupler-style)

Like Coupler.io and other integration tools: **creator authenticates once**, we store auth, then **reuse it** for every run until it expires.

## How it works

1. **One-time (or when cookies expire):** Creator (or you) calls **POST /auth/refresh** with `shopmyEmail` and `shopmyPassword`. The runner logs in in the browser and returns **`{ cookies }`**.
2. **Store cookies** per creator in a secure place:
   - n8n: store in **Credentials** (e.g. a JSON credential with `{ "cookies": [...] }`) or in a previous node’s output and pass into the HTTP Request body.
   - Airtable: store in a **Cookie (JSON)** column or in a linked “Secrets” base; your workflow reads it and sends it in the runner request.
3. **Every run:** Call **POST /run** with `creatorId`, `creatorEmail`, and **`cookies`** (the array from step 1). The runner **injects cookies and skips the login popup**; it goes straight to Links/Earnings and downloads CSV.
4. **When cookies expire:** Run **POST /auth/refresh** again with email/password, get new `cookies`, update storage, and keep using **POST /run** with the new cookies.

No login popup in the main flow; creators only re-enter password when you run refresh (e.g. weekly or when you get an “unauthorized” style error).

## Endpoints

| Endpoint | Purpose |
|----------|--------|
| **POST /auth/refresh** | Body: `{ shopmyEmail, shopmyPassword }`. Logs in, returns `{ cookies }` (or `{ error }`). Store `cookies` per creator. |
| **POST /run** | Body: `{ creatorId, creatorEmail, cookies?, shopmyEmail?, shopmyPassword? }`. If `cookies` is provided, skips login and uses them. Otherwise uses email/password to log in (popup flow). |

## Cookie format

`cookies` is an array of objects Playwright can use: `{ name, value, domain, path }` (and optionally `expires`, `httpOnly`, `secure`, `sameSite`). The runner returns them from the browser context; store the array as-is and send it back in **POST /run** as `cookies`.

## n8n workflow sketch

1. **Get creator** (e.g. from Airtable) – fields: `creatorId`, `creatorEmail`, `shopmyCookies` (or `shopmyEmail` + `shopmyPassword` if no cookies yet).
2. **If no cookies (or refresh needed):** HTTP Request → **POST /auth/refresh** with email/password → take `cookies` from response → update Airtable (or credential) with new cookies.
3. **HTTP Request** → **POST /run** with `creatorId`, `creatorEmail`, and `cookies` from step 1 (or from step 2). No login popup.
4. Use `csvData` from response for your CSV processor / Airtable.

## Security

- Store cookies in n8n credentials or a private Airtable base; never log or expose them.
- Prefer **POST /auth/refresh** only when needed (e.g. scheduled weekly or on 401), and use **POST /run** with stored cookies for daily syncs.
