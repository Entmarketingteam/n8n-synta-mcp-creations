# MarkItDown API

Small HTTP wrapper around [Microsoft MarkItDown](https://github.com/microsoft/markitdown). Accepts a file upload, returns markdown. Used by n8n (Slack → MarkItDown → LLM) and any other caller.

## Contract (normalized shape)

- **POST /convert**  
  - Input: `multipart/form-data` with one file (field name: `file`).  
  - Success (200): `{ "ok": true, "markdown": "<converted markdown>", "filename": "..." }`  
  - Failure (4xx/5xx): `{ "ok": false, "error": "message", "stage": "markitdown" }`

- **GET /health**  
  - Returns `{ "ok": true, "service": "markitdown-api" }` for Railway/Render health checks.

## Local run

Requires **Python 3.10+** (MarkItDown requirement). Then:

```bash
cd markitdown-api
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py
```

Server listens on `http://0.0.0.0:8080` (or `PORT` env). Test:

```bash
curl -X POST http://localhost:8080/convert -F "file=@/path/to/document.pdf"
```

## Deploy (Railway / Render)

- **Railway:** Connect this repo (or the `ent-tools` repo with root at `markitdown-api` for this service). Use `railway.toml`; Nixpacks will use `nixpacks.toml` in this folder if present. Set `PORT` via Railway (automatic).
- **Render:** Use a Python service; build command `pip install -r requirements.txt`, start command `gunicorn -w 1 -b 0.0.0.0:$PORT app:app`.

After deploy, set **n8n variable** (or env) `MARKITDOWN_API_URL` to the base URL (e.g. `https://markitdown-api.railway.app`) with no trailing slash. The workflow calls `{{ $env.MARKITDOWN_API_URL }}/convert` or equivalent.

## Usage from n8n

1. **HTTP Request** node: method POST, URL `{{ $env.MARKITDOWN_API_URL }}/convert` (or `$vars.tools.markitdown.url`).  
2. Body: **multipart/form-data**, field name `file`, value = binary data from previous node (e.g. Slack file content).  
3. Map response: if `body.ok` is true use `body.markdown`; else use `body.error` and `body.stage` for error handling (IF node on `ok`).

See `shared/contracts/CONTRACTS.md` for the full normalized payload shape.
