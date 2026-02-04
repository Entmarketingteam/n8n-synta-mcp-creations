# Session cookie

Use when the platform uses **form login** and then **session cookies** (or cookie + CSRF headers) for API calls. No OAuth; browser or browser-like client performs login and subsequent requests carry the same cookies.

## Flow

1. POST login URL with username/password (and any CSRF or extra headers from the page).
2. Response sets cookies (e.g. session id); follow redirects and preserve cookies.
3. Subsequent API requests use the same cookie jar (and often headers like `x-csrf-token`, `x-session-id`).

## n8n

- n8n’s HTTP Request node does not maintain a cookie jar across nodes. Options:
  - Use a **Browserbase** (or similar) runner that performs login in a real browser and then runs API calls in the same context: see [shopmy-browserbase-runner](../../shopmy-browserbase-runner/) and [docs/SHOPMY-CREATOR-AUTH.md](../../docs/SHOPMY-CREATOR-AUTH.md).
  - Or use an **Execute Command** or **external service** that does login + cookie storage and exposes an API that n8n calls with a session id or token derived from the session.

## This folder

- Document any generic “session-cookie” workflow (e.g. runner contract + n8n webhook). Reference from [docs/PLATFORM_REGISTRY.md](../../docs/PLATFORM_REGISTRY.md).
