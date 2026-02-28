# ShopMy Creator Data Pipeline - Payout Summary Edition

## What's Changed (vs CSV Download Approach)

| Old Approach | New Approach |
|-------------|--------------|
| `POST /download_commissions` → S3 URL → Download CSV → Parse | `GET /payout_summary/{user_id}` → Structured JSON |
| Multiple steps, file handling | Single API call, direct data |
| CSV parsing required | Native JSON, ready to use |
| Limited data fields | **Rich data**: commissions, opportunities, referrals, brand rates |

---

## Workflow Overview

```
Schedule (6hr)
    ↓
Creator Config (credentials array)
    ↓
Loop Creators (one at a time)
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Per Creator:                                                 │
│   1. POST /api/Auth/session (login)                         │
│   2. Extract session_id + csrf_token                        │
│   3. GET /api/Payouts/payout_summary/{user_id}  ← THE KEY   │
│   4. GET /api/Payments/by_user/{user_id}                    │
│   5. GET /api/CustomRates/all_rates/{user_id}               │
│   6. Transform & Combine all data                           │
│   7. Store to GSheet + Airtable                             │
└─────────────────────────────────────────────────────────────┘
    ↓
Loop to next creator
```

---

## API Endpoints Used

### Authentication
```
POST https://apiv3.shopmy.us/api/Auth/session
Body: { "username": "email@example.com", "password": "password" }
Response: { "success": true } + session cookies
```

### Data Endpoints (require session headers)

| Endpoint | What It Returns |
|----------|-----------------|
| `GET /api/Payouts/payout_summary/{user_id}` | **EVERYTHING** - monthly totals, all commission types, pending/paid status |
| `GET /api/Payments/by_user/{user_id}` | Payment history (PayPal transfers) |
| `GET /api/CustomRates/all_rates/{user_id}` | Brand-specific commission rates |

### Required Headers for Authenticated Requests
```
x-csrf-token: {uuid}
x-session-id: {timestamp}
Origin: https://shopmy.us
Referer: https://shopmy.us/
```

---

## Data You Get from Payout Summary

The `payout_summary` endpoint returns a goldmine:

```json
{
  "data": {
    "todayAmount": 0,
    "months": ["2/28/26", "1/31/26", ...],  // Monthly breakdown dates
    
    "payouts": [/* ALL commissions - 100 items */],
    
    "normal_commissions": [
      {
        "transaction_date": "2026-02-03",
        "merchant": "Kopari Beauty",
        "Product_title": "Tropical Coconut Melt",
        "order_amount": "$144.00",
        "commission_amount": "$16.80",
        "amountEarned": "16.80",
        "statusDisplay": "Pending",
        "isPaid": false,
        "isLocked": false
      }
    ],
    
    "opportunity_commissions": [
      {
        "title": "Target Opportunity - Wellness Month",
        "commission_amount": "$1,200.00",
        "statusDisplay": "Paid"
      }
    ],
    
    "shopper_referral_bonuses": [/* Referral earnings */],
    
    "referralTotals": ["148435", "202030"]  // Lifetime referral stats
  }
}
```

---

## Setup Instructions

### Step 1: Import Workflow

1. Open n8n: https://entagency.app.n8n.cloud
2. Click **"Add Workflow"** → **"Import from File"**
3. Upload `shopmy_payout_summary_workflow.json`

### Step 2: Set Environment Variables

Go to **Settings → Variables** and add:

```
SHOPMY_NICKI_PASSWORD = [Nicki's ShopMy password]
```

For multiple creators, add more:
```
SHOPMY_SARA_PASSWORD = [Sara's password]
SHOPMY_ELLEN_PASSWORD = [Ellen's password]
SHOPMY_COURTNEY_PASSWORD = [Courtney's password]
SHOPMY_ANN_PASSWORD = [Ann's password]
```

### Step 3: Configure Creator List

Edit the **"Creator Config"** node to add all creators:

```javascript
={{ [
  {
    "creator_name": "Nicki Entenmann",
    "email": "marketingteam@nickient.com",
    "password": $env.SHOPMY_NICKI_PASSWORD || "",
    "user_id": "65244"
  },
  {
    "creator_name": "Sara Preston",
    "email": "sara@example.com",
    "password": $env.SHOPMY_SARA_PASSWORD || "",
    "user_id": "XXXXX"
  },
  {
    "creator_name": "Ellen Ludwig",
    "email": "ellen@example.com",
    "password": $env.SHOPMY_ELLEN_PASSWORD || "",
    "user_id": "XXXXX"
  }
] }}
```

**Finding User IDs:**
1. Log into ShopMy as the creator
2. Open DevTools → Network tab
3. Look for API calls like `/api/Payouts/payout_summary/65244`
4. The number is the user_id

### Step 4: Configure Storage Destinations

**Option A: Google Sheets**
1. Open "Store to GSheet" node
2. Connect Google Sheets credentials
3. Set `SHOPMY_GSHEET_URL` env variable to your spreadsheet URL

**Option B: Airtable**
1. Open "Store to Airtable" node
2. Connect Airtable credentials
3. Set `SHOPMY_AIRTABLE_BASE` and `SHOPMY_AIRTABLE_TABLE` env variables

**Option C: Both** (workflow sends to both by default)

### Step 5: Test & Activate

1. Click **"Test Workflow"**
2. Check each node output
3. Verify data in GSheet/Airtable
4. Toggle to **Active**

---

## Output Data Structure

The workflow outputs this structure per creator:

```json
{
  "creator_name": "Nicki Entenmann",
  "user_id": "65244",
  "extracted_at": "2026-02-03T22:30:00Z",
  
  "summary": {
    "today_amount": 0,
    "total_normal_commissions": 1234.56,
    "total_opportunity_commissions": 3245.00,
    "total_referral_bonuses": 1.00,
    "total_all": 4480.56
  },
  
  "months": ["2/28/26", "1/31/26", ...],
  
  "normal_commissions": [
    {
      "date": "2026-02-03",
      "merchant": "Kopari Beauty",
      "product": "Tropical Coconut Melt",
      "order_amount": "$144.00",
      "commission": "$16.80",
      "earned": "16.80",
      "status": "Pending",
      "is_paid": false,
      "is_locked": false
    }
  ],
  
  "opportunity_commissions": [
    {
      "date": "2026-01-30",
      "title": "Vivrelle Opportunity - Monthly Bonus",
      "order_amount": null,
      "commission": "$350.00",
      "earned": "350.00",
      "status": "Next Payment",
      "is_paid": false
    }
  ],
  
  "referral_bonuses": [...],
  
  "payments": [
    {
      "id": 123456,
      "amount": 1647.31,
      "user_amount": 1647.31,
      "source": "PAYPAL",
      "sent_at": "2026-01-30T..."
    }
  ],
  
  "brand_rates": [
    {
      "brand": "CARÉS Body",
      "rate": 15,
      "rate_returning": 10
    }
  ],
  
  "pending_count": 45,
  "paid_count": 55
}
```

---

## Scaling to Multiple Creators

### Option A: Hardcoded Array (Good for 2-5 creators)
Edit Creator Config node directly.

### Option B: Airtable Lookup (Better for 10+)
Replace Creator Config with Airtable node:
```
Airtable → Get Records from "Creators" table
         → Fields: creator_name, email, user_id
         → Password from env vars by name lookup
```

### Option C: Google Sheets Lookup
Same pattern but with Google Sheets as source.

---

## Troubleshooting

### "Auth Failed" for a creator
- Check password is correct
- Verify email matches ShopMy account
- Try logging in manually to confirm account works

### Empty payout_summary data
- User ID might be wrong
- Account may be new with no data
- Session may have expired (workflow retries 2x)

### 403 Forbidden errors
- ShopMy may have detected automation
- Try adding delays between creators (add Wait node)
- Reduce frequency from 6hr to 12hr

### Missing opportunity commissions
- These only show up when creator has brand deals
- Check manually if they should have opportunity data

---

## Comparison: Old vs New Approach

### Old (CSV Download)
```
1. POST /download_commissions → Get S3 URL
2. GET S3 URL → Download CSV file
3. Parse CSV → Extract data
4. Store parsed data
```
**Issues**: File handling, parsing errors, limited fields

### New (Payout Summary)
```
1. GET /payout_summary → Get ALL data as JSON
2. Transform JSON → Store
```
**Benefits**: 
- Single call gets everything
- No file handling
- Richer data (brand rates, referrals, opportunity details)
- Faster execution

---

## Related Workflows

Once this is working, the same pattern applies to:

- **Mavely**: Similar auth (NextAuth.js + JWT)
- **LTK**: Harder (Auth0 OAuth2 + PKCE, needs browser)
- **Amazon Influencer**: Hardest (Cookie-based, needs browser)

Let me know when you want to tackle Mavely next!
