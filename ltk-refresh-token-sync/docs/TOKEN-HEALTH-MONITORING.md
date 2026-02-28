# LTK Token Health Monitoring

## Airtable View: "Token Health"

Create this view on the `LTK_Credentials` table:

- **Filter:** Status is not `disabled`
- **Sort:** Consecutive_Failures (descending), then Token_Expires_At (ascending)
- **Group by:** Status
- **Fields to show:** Creator, Status, Consecutive_Failures, Last_Refreshed, Token_Expires_At, Refresh_Token_Captured_At, Error_Message, Alert_Sent

This gives an at-a-glance view of which creators need attention, with errors at the top.

## Daily Health Check Workflow (new n8n workflow)

### Purpose

Sends a daily email digest summarizing token health across all creators. Catches aging refresh tokens before they expire.

### Node Chain

```
1. Schedule Trigger
   ├─ Type: Schedule
   ├─ Runs: Daily at 9:00 AM
   └─ Timezone: America/Chicago

2. Airtable: List All Active Creators
   ├─ Base: appQnKyfyRyhHX44h
   ├─ Table: LTK_Credentials
   └─ Filter: {Status} != "disabled"

3. Code: Evaluate Token Health
   └─ JavaScript:
      const now = Date.now();
      const DAY = 86400000;
      const records = $input.all().map(item => item.json);

      const results = { healthy: [], warning: [], critical: [] };

      for (const rec of records) {
        const f = rec.fields;
        const name = f.Creator;
        const daysSinceCapture = f.Refresh_Token_Captured_At
          ? (now - new Date(f.Refresh_Token_Captured_At).getTime()) / DAY
          : null;
        const daysSinceRefresh = f.Last_Refreshed
          ? (now - new Date(f.Last_Refreshed).getTime()) / DAY
          : null;
        const failures = f.Consecutive_Failures || 0;

        const entry = {
          name,
          daysSinceCapture: daysSinceCapture ? Math.round(daysSinceCapture) : 'unknown',
          daysSinceRefresh: daysSinceRefresh ? Math.round(daysSinceRefresh * 10) / 10 : 'unknown',
          failures,
          status: f.Status
        };

        if (
          (daysSinceCapture && daysSinceCapture > 80) ||
          failures > 0 ||
          f.Status === 'error'
        ) {
          results.critical.push(entry);
        } else if (
          (daysSinceCapture && daysSinceCapture > 60) ||
          (daysSinceRefresh && daysSinceRefresh > 1)
        ) {
          results.warning.push(entry);
        } else {
          results.healthy.push(entry);
        }
      }

      const hasIssues = results.warning.length > 0 || results.critical.length > 0;

      return [{ json: { ...results, hasIssues, total: records.length } }];

4. IF: Has Issues?
   ├─ Condition: {{ $json.hasIssues }} == true
   ├─ TRUE → Node 5 (Send Digest)
   └─ FALSE → End (all healthy, no email needed)

5. Gmail: Send Daily Digest
   ├─ To: (your alert email)
   ├─ Subject: LTK Token Health Report — {{ $json.critical.length }} critical, {{ $json.warning.length }} warning
   └─ Body: (formatted from the results object — see template below)
```

### Email Template

```
LTK Token Health Report
========================

Summary: {{ total }} creators tracked
  Healthy:  {{ healthy.length }}
  Warning:  {{ warning.length }}
  Critical: {{ critical.length }}

CRITICAL (action needed):
{% for c in critical %}
  - {{ c.name }}: {{ c.failures }} failures, refresh token {{ c.daysSinceCapture }} days old, status={{ c.status }}
{% endfor %}

WARNING (monitor):
{% for w in warning %}
  - {{ w.name }}: refresh token {{ w.daysSinceCapture }} days old, last refreshed {{ w.daysSinceRefresh }} days ago
{% endfor %}

---
Action: For critical creators, re-capture their refresh token.
See TOKEN-CAPTURE-GUIDE.md for instructions.
```

## Alert Thresholds

| Level | Condition | Action |
|---|---|---|
| **Healthy** | Failures = 0, token < 60 days old, refreshed in last 24h | None |
| **Warning** | Token 60-80 days old OR not refreshed in 24h+ | Monitor, plan re-capture |
| **Critical** | Token > 80 days old OR any failures OR status = `error` | Re-capture refresh token immediately |

## Refresh Token Lifespan

LTK refresh tokens (via Auth0) typically last **30-90 days**. The exact policy may vary. The `Refresh_Token_Captured_At` field tracks when the initial manual capture happened. Even with rotation (new refresh_token on each use), the token lineage eventually expires.

**Recommended cadence:** Plan to re-capture refresh tokens every 60 days as preventive maintenance, before they hit the 90-day hard limit.

## Access Token Lifespan

From the JWT `exp` claim, LTK access tokens expire **10 hours** after issuance. The 4-hour refresh cycle ensures tokens are always fresh with a comfortable margin.
