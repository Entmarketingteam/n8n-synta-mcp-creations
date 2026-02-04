# OAuth2 PKCE

Use when the platform uses **OAuth2 with PKCE** (e.g. public clients, SPAs): authorization code + `code_verifier` / `code_challenge`.

## Flow

1. Generate `code_verifier` (random string) and `code_challenge` = base64url(sha256(code_verifier)).
2. Redirect user to authorization URL with `client_id`, `redirect_uri`, `code_challenge`, `code_challenge_method=S256`, `response_type=code`, `scope`.
3. User authorizes; provider redirects to `redirect_uri?code=...`.
4. Exchange `code` + `code_verifier` at token URL for `access_token` (and optionally `refresh_token`).

## n8n

- Use **OAuth2** credential with PKCE enabled, or an **HTTP Request** node sequence: generate challenge → open auth URL (or use a manual “open URL” step) → receive callback with `code` → POST to token URL with `code` and `code_verifier`.
- Store `access_token` and `refresh_token` in credentials or workflow static data; use in subsequent HTTP Request nodes via `Authorization: Bearer {{ $credentials.accessToken }}` or equivalent.

## This folder

- Add minimal workflow JSON or node list here when you have a concrete example (e.g. for a specific platform). Reference from [docs/PLATFORM_REGISTRY.md](../../docs/PLATFORM_REGISTRY.md).
