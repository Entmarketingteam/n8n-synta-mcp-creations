# Amazon Creators API – Access and Usage

This doc covers **Creators API** (OAuth 2.0) for product/catalog data and how to store credentials in n8n. Use it to pull catalog data and to be ready if Amazon adds a Reporting API for Associates under Creators API.

---

## 1. Register for Creators API

1. Sign in to [Amazon Associates Central](https://affiliate-program.amazon.com).
2. Open **Tools** → **Creators API** (or "CreatorsAPI" under the Tools menu).
3. Click **Create Application**, enter an application name.
4. Click **Create Credential**.
5. Copy and store securely:
   - **Credential ID** (replaces legacy AWS Access Key)
   - **Credential Secret** (replaces AWS Secret Key) — **shown once only**
   - **Version** (assigned by region):
     - **2.1** – North America (NA): US, CA, MX, BR
     - **2.2** – Europe (EU): UK, DE, FR, IT, ES, NL, BE, EG, IN, IE, PL, SA, SE, TR, AE
     - **2.3** – Far East (FE): JP, SG, AU

If you lose the Secret, generate a new credential; the old one cannot be retrieved.

---

## 2. Token flow (OAuth 2.0)

Creators API uses **client credentials** grant. Request a Bearer token from the Cognito token endpoint for your region; use that token for all catalog (and future reporting) calls.

### Token endpoints by region

| Region | Version | Token endpoint |
|--------|---------|-----------------|
| NA (North America) | 2.1 | `https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token` |
| EU (Europe) | 2.2 | `https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token` |
| FE (Far East) | 2.3 | `https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token` |

### Request

- **Method:** POST
- **Content-Type:** `application/x-www-form-urlencoded`
- **Body:**
  ```
  grant_type=client_credentials&client_id=YOUR_CREDENTIAL_ID&client_secret=YOUR_CREDENTIAL_SECRET&scope=creatorsapi/default
  ```

Alternative: use **Basic** auth with `Authorization: Basic base64(credential_id:credential_secret)` and body `grant_type=client_credentials&scope=creatorsapi/default`.

### Response

```json
{
  "access_token": "eyJraWQiOiJ...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

- **access_token:** Use as `Bearer <token>` in API requests.
- **expires_in:** 3600 seconds (1 hour). Cache the token and request a new one before expiry.

### Example cURL (get token)

```bash
curl -X POST "https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CREDENTIAL_ID&client_secret=YOUR_CREDENTIAL_SECRET&scope=creatorsapi/default"
```

---

## 3. Catalog API calls

- **Base URL:** `https://creatorsapi.amazon/catalog/v1/`
- **Parameters:** lowerCamelCase (e.g. `itemIds`, `partnerTag`, `marketplace`).

### Required headers

| Header | Value |
|--------|--------|
| **Authorization** | `Bearer <access_token>, Version <credential_version>` (e.g. `Version 2.1` for NA) |
| **Content-Type** | `application/json` |
| **x-marketplace** | Target marketplace domain (e.g. `www.amazon.com`, `www.amazon.co.uk`) |

### Example: GetItems (cURL)

First obtain an access token (see above), then:

```bash
curl -X POST "https://creatorsapi.amazon/catalog/v1/getItems" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN, Version 2.1" \
  -H "Content-Type: application/json" \
  -H "x-marketplace: www.amazon.com" \
  -d '{
    "itemIds": ["B09B2SBHQK", "B09B8V1LZ3"],
    "itemIdType": "ASIN",
    "marketplace": "www.amazon.com",
    "partnerTag": "yourtag-20",
    "resources": [
      "images.primary.small",
      "itemInfo.title",
      "itemInfo.features",
      "parentASIN"
    ]
  }'
```

### Example: SearchItems (cURL)

```bash
curl -X POST "https://creatorsapi.amazon/catalog/v1/searchItems" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN, Version 2.1" \
  -H "Content-Type: application/json" \
  -H "x-marketplace: www.amazon.com" \
  -d '{
    "keywords": "headphones",
    "partnerTag": "yourtag-20",
    "marketplace": "www.amazon.com",
    "resources": ["images.primary.small", "itemInfo.title", "offersV2.listings.price"]
  }'
```

### Operations

| Operation | Path | Purpose |
|-----------|------|---------|
| GetItems | POST `/catalog/v1/getItems` | Item attributes, images, offers by ASIN (up to 10 per request) |
| SearchItems | POST `/catalog/v1/searchItems` | Search by keywords, brand, etc. |
| GetBrowseNodes | POST `/catalog/v1/getBrowseNodes` | Browse node info (category hierarchy) |
| GetVariations | POST `/catalog/v1/getVariations` | Variation child ASINs for a parent |

---

## 4. Storing credentials in n8n

- **Do not** put Credential ID or Secret in workflow JSON or in plain text in the editor.
- **Airtable (recommended for per-creator credentials):** Nicki Entenmann’s (and other creators’) Creators API credentials are stored in Airtable: base `appQnKyfyRyhHX44h`, table `tblNovDWyu1iHoJf0`. The **Amazon Creators API – Get Token** workflow reads from this table (filter by Creator, e.g. "Nicki Entenmann") and uses **Credential_ID** and **Credential_Secret** to request a Bearer token. See [AIRTABLE-CREATORS-API.md](AIRTABLE-CREATORS-API.md) for the table schema and field names.
- **Alternative – n8n Credentials or env vars:**
  1. Create a credential that can hold two secret values (e.g. **Header Auth** with two headers, or a **Custom** credential type if your n8n supports it).
  2. Or store **Credential ID** and **Credential Secret** in n8n **Environment Variables** (e.g. `AMAZON_CREATORS_API_CLIENT_ID`, `AMAZON_CREATORS_API_CLIENT_SECRET`) and reference them in a Code node or HTTP Request node.
- **Get Creators API Token** in n8n:
  - **With Airtable:** Manual → **Read from Airtable** (base `appQnKyfyRyhHX44h`, table `tblNovDWyu1iHoJf0`, filter by Creator) → **HTTP Request** (POST token using `Credential_ID` and `Credential_Secret` from the row) → **Output Token**.
  - **Without Airtable:** Use an **HTTP Request** node: POST to the token endpoint for your region, body `grant_type=client_credentials&client_id={{ $env.AMAZON_CREATORS_API_CLIENT_ID }}&client_secret={{ $env.AMAZON_CREATORS_API_CLIENT_SECRET }}&scope=creatorsapi/default`.
  - Or use a **Code** node that uses `$getWorkflowStaticData()` to cache the token and refresh when `expires_in` is near (e.g. refresh when &lt; 5 minutes left).
- Other workflows that call Creators API can use **Execute Workflow** to run the "Get Creators API Token" workflow first and pass the returned `access_token` (and version) into the next node.

A minimal workflow that reads from Airtable and returns a valid Bearer token is in `workflows/amazon-creators-api-get-token.json` (import into n8n and attach your Airtable credential to the "Read from Airtable" node).

---

## 5. Rate limits (summary)

- New credentials: **1 TPS**, **8640 TPD** for the first 30 days.
- Limits scale with shipped item revenue attributed to Creators API (see Amazon’s API Rates doc).
- Use the **primary account** and retain all URL parameters from API responses so attribution is correct.

---

## 6. References

- [Migrating to Creators API from PA-API](https://docs.creators.amazon/) (Amazon)
- [Register for Creators API](https://affiliate-program.amazon.com) → Tools → Creators API
- Catalog operations: GetItems, SearchItems, GetBrowseNodes, GetVariations (lowerCamelCase request/response)
