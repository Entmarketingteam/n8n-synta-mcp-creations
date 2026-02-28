# LTK Token Capture Guide

How to onboard a new creator into the LTK token refresh system.

## Prerequisites

- Creator has an active LTK account at `creator.shopltk.com`
- You have access to the Airtable base `appQnKyfyRyhHX44h`, table `LTK_Credentials`
- Chrome browser with DevTools

## Step 1: Log in as the creator

1. Open Chrome and navigate to `https://creator.shopltk.com`
2. Log in with the creator's credentials
3. Wait for the dashboard to fully load

## Step 2: Extract the refresh token

1. Open Chrome DevTools: `Cmd+Option+I` (Mac) or `F12` (Windows)
2. Go to **Application** tab
3. In the left sidebar, expand **Local Storage**
4. Click on `https://creator.shopltk.com`
5. Look for a key that starts with `@@auth0spajs@@`
6. Click the key — the value is a JSON object
7. Find the `body.refresh_token` field inside the JSON
8. Copy the entire refresh token value (starts with `v1.`)

> **Tip:** You can also paste this in the Console tab to extract it directly:
> ```js
> Object.entries(localStorage)
>   .filter(([k]) => k.includes('auth0spajs'))
>   .map(([k, v]) => JSON.parse(v)?.body?.refresh_token)
>   .find(Boolean)
> ```

## Step 3: Add the creator to Airtable

Open the `LTK_Credentials` table and add a new record:

| Field | Value |
|---|---|
| Creator | Display name (e.g., "Jane Smith") |
| Refresh_Token | The token you copied in Step 2 |
| Status | `active` |
| Refresh_Token_Captured_At | Today's date/time |
| Priority | `normal` (or `high` for key creators) |
| Slug | Creator's LTK username/slug |
| Publisher_ID | From the JWT or LTK admin panel |

Leave `Access_Token`, `ID_Token`, `Token_Expires_At` blank — the workflow fills these on the next run.

## Step 4: Verify

The n8n token refresh workflow runs every 4 hours. After the next run:

1. Check the Airtable record — `Access_Token`, `ID_Token`, and `Token_Expires_At` should be populated
2. `Last_Refreshed` should show a recent timestamp
3. `Consecutive_Failures` should be `0`
4. `Status` should remain `active`

If `Status` changed to `error`, check the `Error_Message` field for details.

## Finding the Publisher ID

The Publisher ID is embedded in the JWT tokens. If you have a valid Access_Token, decode the middle segment:

```js
JSON.parse(atob(accessToken.split('.')[1]))
// Look for: http://shopltk.com/profile → publisher_id
```

Or find it in the LTK admin/partner panel.

## Troubleshooting

**"invalid_grant" on first refresh:**
- The refresh token may have expired before the workflow ran
- Re-capture it from the browser (the creator may need to log in again)
- Make sure the token starts with `v1.`

**Token works once but fails on second refresh:**
- LTK rotates refresh tokens — ensure the workflow is writing the new refresh_token back to Airtable
- Check that `Refresh_Token` field updated after the first successful run

**Creator's LTK session expired:**
- They need to log in again at `creator.shopltk.com`
- Re-capture the refresh token after login
- Update the Airtable record with the new token and reset `Refresh_Token_Captured_At`
