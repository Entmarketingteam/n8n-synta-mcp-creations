# ShopMy Browserbase Runner

Small HTTP service that uses [Browserbase](https://browserbase.com) + Playwright to log in to ShopMy as a creator and return their CSV export. n8n calls this runner, then POSTs the CSV to the [ShopMy CSV Processor (Creators)](../workflows/README-shopmy-creators.md) webhook.

## Env

| Variable | Required | Description |
|----------|----------|-------------|
| `BROWSERBASE_API_KEY` | Yes | From [Browserbase dashboard](https://www.browserbase.com/overview) |
| `BROWSERBASE_PROJECT_ID` | Yes | From same dashboard |
| `PORT` | No | Server port (default `3333`) |
| `DEBUG_HTML` | No | Set to `1` to include `debugHtmlSnippet` in error response when export/table not found (for finding correct selectors) |

## Local

```bash
cp .env.example .env
# Edit .env with your Browserbase key and project ID
npm install
npm start
```

## Deploy (e.g. Railway)

1. Connect this folder to Railway (or any Node 18+ host).
2. Set env: `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`.
3. Expose port (Railway uses `PORT` automatically).
4. In n8n workflow **“ShopMy – Browserbase login → CSV → Webhook”**, set **Call Browserbase runner** URL to `https://your-app.railway.app/run` (or your deployed URL + `/run`).

## API

- **POST /run**  
  Body: `{ creatorId?, creatorEmail?, shopmyEmail, shopmyPassword }`  
  Returns: `{ csvData?, creatorId, creatorEmail, error? }`

- **GET /health**  
  Returns `{ ok: true }`.

## ShopMy selectors

The script uses selectors for /links, /links/domains, /links/creator-orders for ShopMy’s login and export. After opening [shopmy.us](https://shopmy.us) and the creator dashboard:

1. Inspect the **login** form (email/password fields and submit button).
2. After login, find the **Links** or **Earnings** tab and the **Export / Download CSV** control.
3. Update selectors in `index.js` (and `run-one.js` if you use CLI) to match the live DOM.

If ShopMy uses a different login URL (e.g. OAuth or a separate subdomain), change `baseUrl` and the navigation steps accordingly.

## CLI (single creator)

```bash
echo '{"creatorId":"c1","creatorEmail":"c@example.com","shopmyEmail":"...","shopmyPassword":"..."}' | \
  BROWSERBASE_API_KEY=... BROWSERBASE_PROJECT_ID=... node run-one.js
```

Output: one JSON line with `csvData`, `creatorId`, `creatorEmail`, or `error`.
