# ShopMy Creator Data Pipeline (Payout Summary)

API-only workflow: schedule → login → payout_summary + payments + brand rates → transform → GSheet/Airtable. No browser, no cookie storage.

## Workflow

- **File:** `workflows/shopmy-payout-summary-creators.json`
- **Trigger:** Schedule (default every 6 hours); can add Manual/Webhook if needed.

## Flow summary

1. **Creator Config** – Array of creators: `creator_name`, `email`, `password` (e.g. `$env.SHOPMY_NICKI_PASSWORD`), `user_id`.
2. **Loop Creators** → **ShopMy Login** (POST `api/Auth/session`).
3. **Extract Session** – `creator_name`, `user_id`, `session_id`, `csrf_token`, `auth_success`.
4. **Auth OK?** – If false → Auth Failed → Continue Loop.
5. **Get Payout Summary** → **Get Payment History** → **Get Brand Rates** (with `x-csrf-token`, `x-session-id` headers).
6. **Transform & Combine** – One JSON per creator: summary totals, months, normal/opportunity/referral commissions, payments, brand_rates.
7. **Store to GSheet** / **Store to Airtable** (env: `SHOPMY_GSHEET_URL`, `SHOPMY_AIRTABLE_BASE`, `SHOPMY_AIRTABLE_TABLE`) → **Continue Loop**.

## Setup

- Set **Creator Config** with at least one creator; use env or credentials for `password`.
- Get **user_id** once (e.g. run `shopmy-api-creators` with find_by_email, or from browser).
- Optional: set `SHOPMY_GSHEET_URL`, `SHOPMY_AIRTABLE_BASE`, `SHOPMY_AIRTABLE_TABLE`; disable Store nodes if not used.

## Docs

- [SHOPMY-PAYOUT-SUMMARY-PIPELINE.md](../docs/SHOPMY-PAYOUT-SUMMARY-PIPELINE.md) – Auth model, env vars, data shape, relation to other ShopMy workflows.
- [SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md](../docs/SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md) – Where secrets live and how to run pipelines.
