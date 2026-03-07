# Expo West Exhibitor Scraper

Scrapes exhibitor data from Natural Products Expo West (expowest.com) via the SmallWorldLabs / Swapcard exhibitor directory.

Supports the **2024 archive** and **2026 live** directories. Outputs CSV and/or JSON.

## Key Technical Notes

Expo West does **not** use a traditional ASP.NET/ViewState architecture. The exhibitor directory is hosted on **SmallWorldLabs** (powered by **Swapcard**), which renders content via JavaScript and communicates through a **GraphQL API**.

This scraper provides three strategies:

| Strategy | Speed | Reliability | Requires |
|---|---|---|---|
| `requests` (default) | Fast | Works if pages are server-rendered | Nothing extra |
| `--use-playwright` | Slower | Handles JS-rendered pages | `playwright install chromium` |
| `--use-graphql` | Fastest | Direct API access | API token + Event ID |

## Setup

```bash
cd expo-west-scraper
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Only if using --use-playwright:
python -m playwright install chromium
```

## Usage

```bash
# Scrape 2026 exhibitors (default)
python scraper.py

# Scrape 2024 archive
python scraper.py --year 2024

# Only organic exhibitors
python scraper.py --organic

# Only first-time exhibitors
python scraper.py --first-time

# Use Playwright for JS-rendered pages (recommended)
python scraper.py --use-playwright

# Use Swapcard GraphQL API (fastest, requires credentials)
export SWAPCARD_API_TOKEN="your-token"
export SWAPCARD_EVENT_ID="your-event-id"
python scraper.py --use-graphql

# Output both CSV and JSON
python scraper.py --format both

# Custom output path
python scraper.py --output my-exhibitors.csv

# Enrich with detail pages (slower, more data)
python scraper.py --use-playwright --enrich

# Verbose logging
python scraper.py --verbose
```

## Output Fields

| Field | Description |
|---|---|
| `name` | Company name |
| `booth` | Booth number |
| `category` | Product category |
| `description` | Company description (max 500 chars) |
| `website` | Company website URL |
| `phone` | Phone number |
| `address` | Street address |
| `city` | City |
| `state` | State/Province |
| `country` | Country |
| `profile_url` | Link to exhibitor profile on the directory |
| `logo_url` | Company logo URL |
| `tags` | Additional tags/labels |

## Getting Swapcard API Credentials

For the fastest and most complete data extraction:

1. Sign up as an organizer/exhibitor on [Swapcard](https://www.swapcard.com)
2. Navigate to your event's Exhibitor Center
3. Generate an API key under Settings > API Access
4. Find your Event ID in the Swapcard dashboard URL or via the GraphQL playground
5. Set `SWAPCARD_API_TOKEN` and `SWAPCARD_EVENT_ID` env vars

## Directory URLs

- **2026 Exhibitor Directory**: https://expowest26.smallworldlabs.com/exhibitors
- **2024 Exhibitor Directory**: https://expowest24.smallworldlabs.com/exhibitors
- **2024 Organic Exhibitors**: https://expowest24.smallworldlabs.com/organic-exhibitors
- **Official Expo West**: https://www.expowest.com/en/exhibitor-list/2026-exhibitor-list.html

## Terms of Use

Exhibitor information is provided solely for attendee use to search for products and services. Using this data for solicitation or commercial purposes may violate the Expo West Terms of Service. Ensure your usage complies with their policies and `robots.txt`.
