# Storing Creator Emails and Passwords Securely

This doc describes **where and how** to store creator login credentials (emails, passwords) for Amazon Associates, ShopMy, LTK, and other integrations so they stay protected and are never committed to the repo.

---

## Rule: Never Commit Secrets

- **Do not** put emails, passwords, API keys, or tokens in workflow JSON, code, or docs that get committed to git.
- **Do** use environment variables, n8n Credentials, or (with care) a private Airtable base.
- Repo `.gitignore` already excludes `.env` and `*.env.local` — use those files only on your machine or server, and never add them to git.

---

## 1. Environment variables (scrapers, runners, scripts)

**Use for:** Python scrapers (e.g. Amazon Associates scraper), Node runners (e.g. ShopMy/LTK browserbase runners), and any script that runs outside n8n.

**How:**

1. Copy `.env.example` to `.env` in the project root (or in the scraper/runner folder).
2. Fill in values **only in `.env`**. Never commit `.env`.
3. In code, read via `os.environ.get("AMAZON_ASSOC_EMAIL")` (Python) or `process.env.AMAZON_ASSOC_EMAIL` (Node).

**Example placeholders (use real values only in your local `.env`):**

```bash
# Creator: Nicki Entenmann – Amazon Associates (scraper login)
AMAZON_ASSOC_EMAIL=your-creator@example.com
AMAZON_ASSOC_PASSWORD=your-secure-password

# Optional: comma-separated tracking IDs
AMAZON_TRACKING_IDS=nicki-20

# ShopMy (if used by runner)
SHOPMY_EMAIL=your-creator@example.com
SHOPMY_PASSWORD=your-secure-password
```

**Per-creator:** For multiple creators, you can use a single shared `.env` with one set of credentials, or run the scraper/runner once per creator with different env vars (e.g. set in n8n Execute Command or in your scheduler).

---

## 2. n8n Credentials (workflows)

**Use for:** Any workflow that needs to log in or call an API (ShopMy, Airtable, HTTP Basic, etc.). n8n stores credentials encrypted and you reference them by name in nodes.

**How:**

1. In n8n: **Settings** (or **Credentials**) → **Add credential**.
2. Choose the type (e.g. **Header Auth**, **Generic Credential**, or the node’s built-in type like **Airtable**).
3. Enter the email/password (or API key) in the credential form. Save.
4. In your workflow, select that credential in the node (e.g. “Amazon Associates Login”) — the value is never stored in the workflow JSON.

**Good for:** ShopMy login (email/password), Airtable PAT, Creators API client ID/secret if you don’t use Airtable for them. One credential per creator or one per platform; name them clearly (e.g. “Nicki – ShopMy”, “Nicki – Amazon Associates”).

---

## 3. Airtable (emails / non-sensitive IDs only; passwords with caution)

**Use for:** Creator identity, tracking IDs, and (if you must) login credentials when the base is private and access is tightly restricted.

**How:**

- **Safe in Airtable:** Creator name, email (if acceptable to your policy), tracking ID, Creators API **Credential ID** (it’s not secret by itself; the secret is the **Credential Secret**).
- **Risky in Airtable:** Passwords, Credential Secret, refresh tokens. Only store these in Airtable if:
  - The base is **private** (only you or a minimal set of people).
  - You use Airtable’s access controls and avoid sharing the base broadly.
  - You accept that anyone with base edit access can see those fields.

**Recommendation:** Prefer **env vars** or **n8n Credentials** for passwords and secrets; use Airtable for “which creator” and non-secret config (e.g. Credential ID, tracking IDs). Our Creators API table (`tblNovDWyu1iHoJf0`) stores Credential ID + Secret because it’s a single private base; for multiple creators or higher risk, move secrets to env or n8n.

---

## 4. Where each integration stores credentials

| Integration | Email / ID | Password / Secret | Preferred place |
|-------------|------------|-------------------|------------------|
| **Amazon Associates (scraper)** | AMAZON_ASSOC_EMAIL | AMAZON_ASSOC_PASSWORD | `.env` on the machine that runs the scraper |
| **Amazon Creators API** | Credential ID | Credential Secret | Airtable (`tblNovDWyu1iHoJf0`) or n8n Credentials |
| **ShopMy** | In workflow or Airtable | SHOPMY_PASSWORD or n8n Credential | n8n Credential or `.env` for runner |
| **LTK** | N/A (token-based) | N/A | Refresh token in Airtable (`LTK_Credentials`) |
| **Airtable (n8n)** | N/A | Personal Access Token | n8n Credentials (Airtable PAT) |

---

## 5. Checklist for adding a new creator

1. **Create credentials** in the right place (`.env`, n8n Credential, or Airtable) — never in repo files.
2. **Rotate** any password or secret that was ever pasted in chat or committed.
3. **Document** only the *names* of env vars or credential names in the repo (e.g. in `.env.example` or this doc), not the values.
4. **Restrict** who can edit the Airtable base or the server where `.env` lives.

---

## 6. Pushing credentials from .env into Airtable (one-time)

To **put** creator email and password **into** Airtable so you can test the scraper or n8n (e.g. read from Airtable instead of env):

1. **Add columns in Airtable** (base `appQnKyfyRyhHX44h`, table `tblNovDWyu1iHoJf0`): **Email** (Single line text), **Password** (Long text). Ensure you have a row with **Creator** = e.g. "Nicki Entenmann".
2. **Put secrets only in `.env`** (never commit):  
   In project root or `amazon-associates-scraper/`, create or edit `.env` with:
   - `AIRTABLE_API_KEY` = your Airtable Personal Access Token  
   - `AMAZON_ASSOC_EMAIL` = creator’s Associates login email  
   - `AMAZON_ASSOC_PASSWORD` = creator’s Associates login password  
3. **Run the script once:**  
   From repo root:  
   `node scripts/set-amazon-assoc-credentials-airtable.js`  
   The script reads from `.env` and PATCHes the Airtable row (Creator = "Nicki Entenmann" by default). Secrets never go into the repo.

Optional env: `CREATOR_NAME`, `BASE_ID`, `TABLE_ID` to target a different row or table.

---

## 7. References

- Root `.env.example` — lists env var names used by the project (no real values).
- `amazon-associates-scraper/.env.example` — scraper-specific env vars.
- [AIRTABLE-CREATORS-API.md](AIRTABLE-CREATORS-API.md) — Creators API credentials in Airtable.
- [SHOPMY-CREATOR-AUTH.md](SHOPMY-CREATOR-AUTH.md) — ShopMy cookies/credentials.
- `scripts/set-amazon-assoc-credentials-airtable.js` — One-time script to push email/password from `.env` into Airtable.
