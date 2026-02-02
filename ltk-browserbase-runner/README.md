# LTK Browserbase Runner

One-time browser login → **automatic token capture** → refresh without browser. No DevTools, no manual copy-paste. The runner reads `access_token` and `refresh_token` from the same Auth0 SPA cache (browser storage) that the LTK earnings page uses. Use this when LTK won’t whitelist n8n’s OAuth callback URL.

## Endpoints

| Method | Path | Body | Purpose |
|--------|------|------|--------|
| POST | `/refresh-ltk` | `{ "refresh_token": "..." }` | Get new `access_token` from LTK (no browser). |
| POST | `/auth/ltk` | `{ "email": "...", "password": "..." }` | Browser login; returns `{ access_token, refresh_token }`. |
| POST | `/run-ltk` | `{ "refresh_token": "..." }` **or** `{ "email": "...", "password": "..." }` | Returns LTK data (`user_info`, `commissions`, `performance_summary`). If you send `refresh_token`, no browser. If you send email+password, runs login once and returns data + `refresh_token` to store. |

## Env

- `BROWSERBASE_API_KEY` – required  
- `BROWSERBASE_PROJECT_ID` – required  
- `PORT` – optional, default 3334  

## n8n: painless flow

1. **First time**  
   - HTTP Request: `POST https://your-runner.up.railway.app/run-ltk`  
   - Body (JSON): `{ "email": "nicki.entenmann@gmail.com", "password": "{{ $credentials.ltkLogin.password }}" }` (use a credential so the password isn’t in the workflow).  
   - Response includes `user_info`, `commissions`, `performance_summary`, and **`refresh_token`**.  
   - Store `refresh_token` in workflow static data: e.g. Set node or Code node that runs once and calls `$getWorkflowStaticData().set('ltkRefreshToken', $json.refresh_token)`, or store it in a credential/vault.

2. **Every run after that**  
   - HTTP Request: `POST https://your-runner.up.railway.app/run-ltk`  
   - Body: `{ "refresh_token": "{{ $getWorkflowStaticData().ltkRefreshToken }}" }`  
   - Response: same data, no login, no browser.

3. **Optional: refresh only**  
   - If you only need a new access_token (e.g. for another tool): `POST /refresh-ltk` with `{ "refresh_token": "..." }`.

## Deploy (e.g. Railway)

Same pattern as your ShopMy runner: connect repo, set `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`, deploy. Use `nixpacks.toml` and `railway.toml` if you add them (see `shopmy-browserbase-runner`).

## Security

- Don’t commit `.env` or credentials.  
- Prefer sending email/password from n8n credentials (e.g. HTTP Header Auth or a custom credential) so the password isn’t in the workflow JSON.  
- Store `refresh_token` in n8n workflow static data or a secure credential; don’t log it.
