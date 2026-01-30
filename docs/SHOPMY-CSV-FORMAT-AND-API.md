# ShopMy CSV export – API flow and CSV formats

Reference: HAR (`shopmy.us.har`) and sample CSVs (Links, Domains, Commissions, Payment report).

---

## 1. Links tab – DOWNLOAD button (same flow for all three views)

**Flow:** Click DOWNLOAD → GET `apiv3.shopmy.us/api/Pins?downloadAllToCsv=1&...` → response JSON `{ "downloaded_url": "https://...s3.../csv-<ts>.csv" }` → fetch that URL for CSV.

| Page | URL | groupByMode | sortOrder (example) |
|------|-----|-------------|----------------------|
| My Links | /links | mentions | createdAt |
| By Website | /links/domains | domains | orderVolumeTotal |
| All Orders | /links/creator-orders | creator-orders | createdAt |

**Request (GET):**  
`https://apiv3.shopmy.us/api/Pins?downloadAllToCsv=1&User_id=<id>&sortDirection=desc&sortOrder=<...>&groupByMode=<mode>&hideOtherRetailers=1`

**Response:** `{ "downloaded_url": "https://production-shopmyshelf-uploads.s3.us-east-2.amazonaws.com/csv-<timestamp>.csv" }`

### CSV column formats (Links)

**My Links (mentions)**  
`Created On,Name,Title,Order Count,Clicks,Order Volume,Commissions Earned,Affiliate Merchant,Short URL,Collection Name,Collection URL,URL`

**By Website (domains)**  
`Domain,# Links,Clicks,Orders,Volume,Earned`

**All Orders (creator-orders)**  
`Transaction Date,Order Total,Commission,Merchant,Domain,Status,Code,Title,Locked,Payment Date`

---

## 2. Earnings tab (/payouts) – Commissions download

**Flow:** On Earnings, click “Download” for Commissions → **POST** `apiv3.shopmy.us/api/Payouts/download_commissions` → response JSON `{ "success": true, "url": "https://...s3.../Commissions-<ts>.csv" }` → fetch that URL for CSV.

**Request (POST):**  
`https://apiv3.shopmy.us/api/Payouts/download_commissions`  
Body (JSON):  
- Normal commissions: `{ "type": "normal_commissions", "User_id": <id>, "timezoneOffset": 360 }`  
- Opportunity commissions: `{ "type": "opportunity_commissions", "User_id": <id>, "timezoneOffset": 360 }`

**Response:** `{ "success": true, "url": "https://production-shopmyshelf-uploads.s3.us-east-2.amazonaws.com/Commissions-<timestamp>.csv" }`  
Note: field is `url`, not `downloaded_url`.

### CSV column formats (Earnings – Commissions)

**Normal commissions**  
`Transaction Date,Order Total,Commission,Merchant,Domain,Status,Code,Title,Locked,Payment Date`

**Opportunity commissions**  
`Completion Date,Payment Date,Opportunity,Amount Earned,Status`

---

## 3. Earnings tab – Payment report download

**Flow:** On Earnings, click the payment report download → browser downloads a **blob** URL; filename is `shopmy_payment_report.csv`. No separate API URL in the HAR; the app builds the CSV from `GET api/Payments/by_user/<id>` (or similar) and triggers a blob download.

**CSV columns:**  
`Payment Date,Source,Amount,Agent Amount,Referral Bonus`

---

## Summary for automation

| Source | Trigger | API / mechanism | Response CSV URL |
|--------|--------|------------------|-------------------|
| links (My Links) | DOWNLOAD on /links | GET Pins?downloadAllToCsv=1&groupByMode=mentions | `downloaded_url` |
| domains | DOWNLOAD on /links/domains | GET Pins?downloadAllToCsv=1&groupByMode=domains | `downloaded_url` |
| creator-orders | DOWNLOAD on /links/creator-orders | GET Pins?downloadAllToCsv=1&groupByMode=creator-orders | `downloaded_url` |
| commissions-normal | Download on /payouts (Commissions) | POST Payouts/download_commissions, type=normal_commissions | `url` |
| commissions-opportunity | Download on /payouts (Opportunity) | POST Payouts/download_commissions, type=opportunity_commissions | `url` |
| payment-report | Download on /payouts (Payments) | Blob download (shopmy_payment_report.csv) | N/A (browser download) |

The Browserbase runner currently handles the three **Links** downloads (click DOWNLOAD → intercept Pins response → fetch `downloaded_url`). Earnings (Commissions + payment report) can be added by visiting /payouts, clicking the same buttons, and for Commissions intercepting POST `Payouts/download_commissions` and fetching `url`; for the payment report, waiting for the browser download event.
