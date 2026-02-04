# Extract API endpoints (HAR → endpoint list)

Use this prompt with Claude/Cursor. Paste the HAR file path or a summary of the HAR (e.g. list of request URLs, methods, and key headers after login).

---

**Task:** From this HAR, extract a list of **API endpoints** that are useful for automation (e.g. user info, reports, links, payouts). For each endpoint:

1. **Method and URL:** e.g. `GET https://api.example.com/v1/me`, `POST https://api.example.com/v1/reports`.
2. **Request body:** If POST/PUT/PATCH, describe the JSON or form body (field names and types).
3. **Query parameters:** Any required or common query params (e.g. `start_date`, `end_date`, `limit`).
4. **Headers:** Which headers are required (e.g. `Authorization: Bearer <token>`, `x-csrf-token`, `Content-Type`).
5. **Response:** Brief description (e.g. “JSON array of report rows” or “JSON object with user id and email”).

Output format: markdown table or list. This will be used with the auth spec to generate an n8n workflow (e.g. via `generate-workflow.md`) or to document the platform in `docs/`.
