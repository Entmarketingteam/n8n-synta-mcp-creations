# Analyze auth flow (HAR → auth spec)

Use this prompt with Claude/Cursor. Paste the HAR file path or a summary of the HAR (e.g. key request/response pairs for login and the next 2–3 API calls).

---

**Task:** Analyze this HAR (or the described requests) and produce a structured **auth specification**:

1. **Auth type:** One of: OAuth2 PKCE, OAuth2 (authorization code or client credentials), session cookie (form login + cookies), API key (header/query).
2. **Endpoints:** For OAuth: authorization URL, token URL, refresh URL (if any). For session: login URL, method, body shape, and which response headers/cookies indicate success. For API key: where the key is sent (header name or query param).
3. **Required headers:** List any headers that must be sent on subsequent API calls (e.g. `Authorization`, `x-csrf-token`, `x-session-id`).
4. **Scopes:** If OAuth, list required scopes.
5. **Notes:** Any CORS, redirect, or cookie domain details that matter for n8n or a headless runner.

Output format: markdown with clear headings (Auth type, Endpoints, Required headers, Scopes, Notes). This spec will be used to pick an auth pattern from `auth-patterns/` and to generate or adapt an n8n workflow.
