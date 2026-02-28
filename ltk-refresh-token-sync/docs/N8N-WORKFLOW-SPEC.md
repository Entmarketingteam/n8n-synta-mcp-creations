# n8n Workflow Spec: LTK Token Refresh

Workflow ID: `ZsuR4dbEpTUH7q06`

## Overview

Refreshes LTK OAuth2 tokens for all active creators stored in Airtable. Runs on a schedule, processes one creator at a time, writes fresh tokens back immediately, and alerts via Gmail on repeated failures.

## Airtable Configuration

- **Base ID:** `appQnKyfyRyhHX44h`
- **Table ID:** `tbl5TEfzBwGPeT1rX`
- **Table Name:** `LTK_Credentials`

### Fields Used

| Field | Type | Read/Write | Purpose |
|---|---|---|---|
| Creator | Single line text | Read | Display name for logging/alerts |
| Refresh_Token | Long text | Read + Write | Current refresh token |
| Access_Token | Long text | Write | Updated on each refresh |
| ID_Token | Long text | Write | Updated on each refresh |
| Last_Refreshed | Date time | Write | Timestamp of last successful refresh |
| Status | Single select | Read + Write | `active` / `expired` / `error` |
| Consecutive_Failures | Number | Read + Write | Failure streak count |
| Error_Message | Long text | Write | Last error detail |
| Token_Expires_At | Date time | Write | JWT exp claim as datetime |
| Refresh_Token_Captured_At | Date time | Read | Used by health monitoring |
| Alert_Sent | Checkbox | Read + Write | Prevents duplicate alerts |
| Priority | Single select | Read | For future batch ordering |

## Node Chain

```
1. Schedule Trigger
   ├─ Type: Schedule
   ├─ Interval: Every 4 hours
   └─ Timezone: America/Chicago (or your preference)

2. Airtable: Get All Creators
   ├─ Operation: List records
   ├─ Base: appQnKyfyRyhHX44h
   ├─ Table: LTK_Credentials
   ├─ Filter: {Status} != "disabled"
   └─ Auth: Header Auth (Bearer + Personal Access Token)

3. Split In Batches
   ├─ Batch Size: 1
   └─ Continue On Fail: true

4. HTTP Request: Refresh Token
   ├─ Method: POST
   ├─ URL: https://creator-auth.shopltk.com/oauth/token
   ├─ Headers:
   │   └─ Content-Type: application/x-www-form-urlencoded
   ├─ Body (form-urlencoded):
   │   ├─ grant_type: refresh_token
   │   ├─ client_id: iKyQz7GfBMBPqUqCbbKSNBUlM2VpNWUT
   │   ├─ refresh_token: {{ $json.fields.Refresh_Token }}
   │   └─ redirect_uri: https://creator.shopltk.com/login/callback
   └─ Continue On Fail: true

5. IF: Refresh OK?
   ├─ Condition: {{ $json.statusCode }} == 200
   │   (or check that $json.access_token exists)
   ├─ TRUE → Node 6 (Parse Success)
   └─ FALSE → Node 8 (Handle Error)

6. Code: Parse Token Response (SUCCESS branch)
   └─ JavaScript:
      const response = $input.first().json;
      const creatorRecord = $('Split In Batches').first().json;

      // Decode JWT to get exp
      const payload = JSON.parse(
        Buffer.from(response.access_token.split('.')[1], 'base64').toString()
      );
      const expiresAt = new Date(payload.exp * 1000).toISOString();

      return [{
        json: {
          recordId: creatorRecord.id,
          fields: {
            Access_Token: response.access_token,
            ID_Token: response.id_token,
            // Use new refresh_token if rotated, else keep existing
            Refresh_Token: response.refresh_token || creatorRecord.fields.Refresh_Token,
            Last_Refreshed: new Date().toISOString(),
            Token_Expires_At: expiresAt,
            Status: "active",
            Error_Message: "",
            Consecutive_Failures: 0,
            Alert_Sent: false
          }
        }
      }];

7. HTTP Request: Update Airtable (SUCCESS)
   ├─ Method: PATCH
   ├─ URL: https://api.airtable.com/v0/appQnKyfyRyhHX44h/tbl5TEfzBwGPeT1rX
   ├─ Headers:
   │   ├─ Authorization: Bearer {{ $credentials.airtablePAT }}
   │   └─ Content-Type: application/json
   └─ Body (JSON):
      {
        "records": [{
          "id": "{{ $json.recordId }}",
          "fields": {{ $json.fields }}
        }]
      }
   NOTE: Use HTTP Request node, NOT native Airtable node (avoids 422 bug).

8. Code: Handle Error (FAILURE branch)
   └─ JavaScript:
      const creatorRecord = $('Split In Batches').first().json;
      const errorBody = $input.first().json;
      const prevFailures = creatorRecord.fields.Consecutive_Failures || 0;
      const newFailures = prevFailures + 1;
      const alertSent = creatorRecord.fields.Alert_Sent || false;

      return [{
        json: {
          recordId: creatorRecord.id,
          creatorName: creatorRecord.fields.Creator,
          shouldAlert: newFailures >= 3 && !alertSent,
          fields: {
            Error_Message: JSON.stringify(errorBody).substring(0, 1000),
            Consecutive_Failures: newFailures,
            Status: newFailures >= 3 ? "error" : creatorRecord.fields.Status
          }
        }
      }];

9. HTTP Request: Update Airtable (ERROR)
   ├─ Same structure as Node 7 but with error fields
   └─ Uses $json.recordId and $json.fields

10. IF: Should Alert?
    ├─ Condition: {{ $json.shouldAlert }} == true
    ├─ TRUE → Node 11 (Send Alert)
    └─ FALSE → Node 12 (Wait)

11. Gmail: Send Alert
    ├─ To: (your alert email address)
    ├─ Subject: LTK Token Refresh Failed: {{ $json.creatorName }}
    └─ Body:
       Token refresh has failed 3 consecutive times for {{ $json.creatorName }}.

       Error: {{ $json.fields.Error_Message }}

       Action needed: Re-capture the refresh token from browser.
       See TOKEN-CAPTURE-GUIDE.md for instructions.

    Then: Update Airtable to set Alert_Sent = true

12. Wait
    ├─ Duration: 2 seconds
    └─ Purpose: Rate limit protection between creators

13. Loop Back → Split In Batches (next creator)
```

## Environment / Credentials

| Credential | Type | Used By |
|---|---|---|
| Airtable PAT | Header Auth (Bearer) | Nodes 2, 7, 9 |
| Gmail | OAuth2 | Node 11 |

### Required Airtable PAT Scopes

- `data.records:read`
- `data.records:write`

## Key Implementation Notes

1. **Use HTTP Request for Airtable updates** — The native Airtable node (v2) has a bug where expression-based record IDs cause 422 errors. Always use HTTP Request with the Airtable REST API.

2. **Content-Type for LTK token endpoint** — Must be `application/x-www-form-urlencoded`, not JSON. Explicitly set the header.

3. **redirect_uri must match exactly** — `https://creator.shopltk.com/login/callback` — any deviation causes `invalid_grant`.

4. **client_id** — `iKyQz7GfBMBPqUqCbbKSNBUlM2VpNWUT` — extracted from the `azp` claim in LTK's JWT tokens.

5. **Refresh token rotation** — LTK (via Auth0) may return a new refresh_token in the response. Always check and save it. If not present, keep the existing one.

6. **Continue on fail** — Both the Split In Batches node and the HTTP Request (refresh) node must have "Continue On Fail" enabled so one creator's failure doesn't block others.
