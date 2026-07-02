# Substack Watch (cloud-native)

Always-on service that watches Substack publications for new posts and ingests
them — including **paid-subscription / paywalled** full text via a logged-in
cookie. This is the cloud replacement for the Mac LaunchAgent
`com.entagency.substack-watch`, which kept flapping (`broke → recovered → broke`
in `#ops-alerts`) because it depended on the Mac being awake + the Firecrawl /
agent-server bridge.

**Why it can't flap anymore:** it runs on a server IP (Railway), detects new
posts via Substack's *public* RSS feed (`{pub}.substack.com/feed`) — no browser,
no WAF, no Mac session to lose — and every network call retries with backoff.
Alerts are debounced, so you're only paged on *sustained* failure, once.

## How it works

```
Railway (always-on)
  └─ APScheduler every POLL_INTERVAL_MINUTES ─▶ watch cycle
        for each publication:
          fetch RSS  ──(retry 2s/4s/8s/16s)──▶  parse ▶ dedup ▶ save new post
                                                         │
                          Airtable (state + Markdown)  ◀─┘   (or local files)
          on new posts ─▶ Slack "new posts" (optional)
          on sustained failure ─▶ Slack alert ONCE, then "recovered" ONCE
```

## Endpoints

| Method | Path      | Purpose |
|--------|-----------|---------|
| GET    | `/health` | Liveness, last-run heartbeat, per-feed health (for the staleness guard) |
| POST   | `/watch`  | Run one cycle now (manual trigger / external cron). Optional `X-Watch-Token`. |

## Self-healing harness (what keeps you from getting paged)

- **Retries + exponential backoff** on every feed fetch and Airtable call
  (`MAX_RETRIES`, default 4 → 2s/4s/8s/16s). Transient blips never surface.
- **Debounced alerting** (`ALERT_AFTER_FAILURES`, default 3): a feed must fail
  that many consecutive cycles before Slack is paged — and it's paged **once**,
  not every cycle. Exactly one "recovered" fires when it heals. This is what
  kills the broke/recovered sawtooth.
- **Per-publication isolation:** one dead feed can't abort the others or crash
  the cycle (the old job exited 1 on the first error).
- **Health persistence:** failure counts survive restarts (`state/health.json`)
  so a redeploy doesn't immediately re-page.
- **Endpoint auth:** set `WATCH_TOKEN` to require a token on `POST /watch`.
- **No secrets in code/logs:** cookie + keys come from Doppler; nothing is logged.

## Deploy (Railway)

1. Point a new Railway service at this directory (`substack-watch/`), Nixpacks
   build. `railway.toml` sets the start command + `/health` healthcheck.
2. Inject secrets from Doppler (`example-project` / `dev`) — see `.env.example`.
   Minimum: `SUBSTACK_PUBLICATIONS`. Recommended: `AIRTABLE_*` + `SLACK_*`.
   For paid content: `SUBSTACK_COOKIE`.
3. Deploy. Confirm `GET /health` returns `status: ok`.
4. Retire the Mac LaunchAgent: `launchctl bootout gui/$(id -u)/com.entagency.substack-watch`
   and remove its plist, so the two can't double-post.

## Configuration

All via env (Doppler). Full list in `.env.example`. Key ones:

| Var | Default | Purpose |
|-----|---------|---------|
| `SUBSTACK_PUBLICATIONS` | — | Comma-separated slugs/feed URLs to watch |
| `POLL_INTERVAL_MINUTES` | `30` | Scheduler cadence |
| `MAX_RETRIES` | `4` | Backoff attempts per network call |
| `ALERT_AFTER_FAILURES` | `3` | Consecutive failing cycles before one alert |
| `AIRTABLE_API_KEY` / `AIRTABLE_BASE_ID` | — | State + Markdown sink (else local files) |
| `SLACK_BOT_TOKEN` / `SLACK_CHANNEL_ID` | — | Notifications (optional) |
| `SUBSTACK_COOKIE` | — | Logged-in cookie for paywalled full text |

Publications can also be listed in `publications.json` (see the `.example`).

## Airtable table

Table `Substack Posts` (or `AIRTABLE_TABLE_NAME`) with fields:
`GUID` (dedup key), `Title`, `URL`, `Publication`, `Author/Pub`, `Published`,
`Content` (Markdown), `Status` (single select incl. `Done`).

## Local dev / tests

```bash
pip install -r requirements.txt
python -m unittest discover -s tests -v      # offline, no network/Airtable
# one-shot cycle without the scheduler:
DISABLE_SCHEDULER=1 SUBSTACK_PUBLICATIONS=arbitrage-andy python -c \
  "import app; print(app._do_cycle())"
```

With no Airtable configured it falls back to `state/` (dedup) + `output/`
(Markdown files), so you can try it with zero external setup.
