# Q4 2025 Data Connections Map
## October 1 - December 19, 2025

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                              Q4 2025 REVENUE SUMMARY                                                       ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                                            ║
║   AMAZON ASSOCIATES                           LTK                                                          ║
║   ═══════════════════                         ═══                                                          ║
║   Commission: $54,568.87                      Commission: $8,609.54                                        ║
║   Bounties: $317.50                           (incl. $1,534 Amazon via LTK)                                ║
║   Creator Connections: $4,949.52                                                                           ║
║   ─────────────────────────────               ─────────────────────────────                                ║
║   TOTAL: $59,835.89                           TOTAL: $8,609.54                                             ║
║                                                                                                            ║
║   Clicks: 241,067                             Clicks: 34,211                                               ║
║   Orders: 35,987                              Orders: 1,026                                                ║
║   Conversion: 14.93%                          Conversion: 2.06%                                            ║
║                                                                                                            ║
║                                    COMBINED Q4 TOTAL: ~$68,445                                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

## Data Connection Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         📱 INSTAGRAM LAYER                                                  │
│                                                                                                             │
│   IG_Stories CSV (1,369 stories)              IG_Reels CSV (76 posts)                                      │
│   ═════════════════════════════               ═══════════════════════                                      │
│   • Views: 24.7M                              • Views: 7.7M                                                │
│   • Link Clicks: 209,932 ⭐                   • 63 Reels, 13 Carousels                                     │
│   • 759 stories have link clicks              • 1 post with LTK link (5xj8v)                              │
│                                                                                                             │
│   KEY FIELDS:                                 KEY FIELDS:                                                  │
│   • Post ID (unique identifier)               • Post ID (unique identifier)                               │
│   • Description (caption text)                • Description (has liketk.it/XXXXX)                         │
│   • Link clicks (sticker clicks)              • Views, Likes, Shares                                      │
│   • Permalink (IG URL)                        • Permalink                                                 │
│                                                                                                             │
│   ⚠️ Link URLs NOT in export!                 ✅ LTK links ARE in Description!                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                          │                                      │
                          │                                      │
         ┌────────────────┘                                      └────────────────┐
         │                                                                        │
         ▼                                                                        ▼
┌────────────────────────────────────┐                    ┌────────────────────────────────────┐
│     AMAZON (Direct via Stories)    │                    │     LTK (via Reel captions)        │
│     ═══════════════════════════    │                    │     ═══════════════════════        │
│                                    │                    │                                    │
│  Stories link stickers go to:      │                    │  Description: "...shop.ltk!        │
│  • urlgeni.us/amzn/xxx             │                    │   liketk.it/5xj8v..."              │
│  • amzn.to/xxx                     │                    │                                    │
│  • amazon.com?tag=xxx              │                    │  Extract code "5xj8v"              │
│                                    │                    │         ↓                          │
│  Tag determines attribution:       │                    │  Match to LTK Posts CSV            │
│  • nicki-igreel-20 → Reels         │                    │  share_url = liketk.it/5xj8v       │
│  • nickientenman-20 → Bio/Store    │                    │                                    │
└────────────────────────────────────┘                    └────────────────────────────────────┘
                          │                                                  │
                          │                                                  │
                          ▼                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         💰 REVENUE LAYER                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐    ┌────────────────────────────────────────────────┐
│            AMAZON TRACKING TAGS                     │    │                LTK DATA                        │
│  ═════════════════════════════════════════════════ │    │  ═════════════════════════════════════════════ │
│                                                     │    │                                                │
│  nickientenman-20 (Main Storefront)                │    │  LTK-export-posts.csv (231 collages)          │
│    Clicks: 184,754                                  │    │    • share_url: liketk.it/XXXXX                │
│    Orders: 31,314                                   │    │    • clicks, commissions, orders               │
│    Commission: $47,617.88 (87%)                     │    │    Total Commission: $8,966.43                 │
│                                                     │    │                                                │
│  nicki-metads-20 (Meta/IG Ads)                     │    │  LTK-export-activelinks.csv (3000 products)   │
│    Clicks: 51,433                                   │    │    • url: retailer URLs                        │
│    Orders: 3,694                                    │    │    • 943 Amazon products ($0 - tracked in AMZ) │
│    Commission: $5,294.77 (10%)                      │    │    • rstyle.me links for non-Amazon            │
│                                                     │    │                                                │
│  nicki-igreel-20 (IG Reels Organic) ⭐             │    │  LTK-earnings-export.csv (2,658 transactions) │
│    Clicks: 3,135                                    │    │    • rstyle.me/+XXXXX links                    │
│    Orders: 707                                      │    │    • Brand, Product, Commission                │
│    Commission: $1,187.39 (2%)                       │    │                                                │
│    Conv Rate: 22.55% (HIGHEST!)                     │    │  Top Brands:                                   │
│                                                     │    │    Abercrombie: $3,300                         │
│  nicki-fb-20 (Facebook)                            │    │    Amazon (via LTK): $1,534                    │
│    Clicks: 1,745                                    │    │    Nike: $692                                  │
│    Orders: 272                                      │    │    Nordstrom: $556                             │
│    Commission: $444.83 (1%)                         │    │                                                │
└────────────────────────────────────────────────────┘    └────────────────────────────────────────────────┘
```

## The Connection Points

### 1️⃣ IG → LTK (via Caption)
```
IG_Reels CSV                          LTK-export-posts.csv
═════════════                         ════════════════════

Description column:                   share_url column:
"...shop.ltk! liketk.it/5xj8v..."  →  https://liketk.it/5xj8v

MATCH KEY: Extract "5xj8v" from caption, match to share_url
```

### 2️⃣ IG Stories → Amazon (via Tracking Tag)
```
IG_Stories CSV                        Amazon Fee-Tracking
══════════════                        ═══════════════════

Link clicks: 209,932              →   nicki-igreel-20: $1,187 (IG Reels)
(URL not captured, but uses)          nickientenman-20: $47,617 (Bio/Store)
urlgeni.us or amzn.to links           nicki-metads-20: $5,294 (Meta Ads)

CONNECTION: Tag embedded in shortened URL determines attribution
```

### 3️⃣ LTK → Amazon (via Product URL)
```
LTK-export-activelinks.csv            Amazon Fee-Earnings
══════════════════════════            ═══════════════════

url column:                       →   Tracked separately
"amazon.com/dp/B0XXX?tag=onamzn"      943 Amazon products in LTK
                                      $1,534 commission via LTK
```

### 4️⃣ LTK Earnings → Individual Sales
```
LTK-earnings-export.csv
═══════════════════════

"Direct to retailer link" column:
https://rstyle.me/+le7fO1UkylzWrO1_D9HJdw

This is LTK's tracking URL that redirects to retailer.
The rstyle ID connects to the product that was clicked.
```

## Database Schema Connections

```
                    ┌─────────────────────┐
                    │    social_posts     │
                    │  ═════════════════  │
                    │  id (PK)            │
                    │  caption            │
                    │  link_clicks        │←─── From IG Stories export
                    │  ltk_code           │←─── Extracted from caption (5xj8v)
                    │  amazon_tag         │←─── Which tag was used
                    └──────────┬──────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │                                     │
            ▼                                     ▼
┌─────────────────────┐              ┌─────────────────────┐
│    ltk_collages     │              │  amazon_tracking    │
│  ═════════════════  │              │  ═════════════════  │
│  id (PK)            │              │  tracking_id        │
│  ltk_code           │←─── "5xj8v"  │  platform_source    │
│  share_url          │              │  clicks             │
│  clicks             │              │  commission         │
│  commission         │              └─────────────────────┘
│  orders             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│       sales         │
│  ═════════════════  │
│  platform           │←─── 'ltk' or 'amazon'
│  rstyle_id          │←─── From earnings export
│  tracking_id        │←─── Amazon tag
│  commission         │
└─────────────────────┘
```

## Summary Stats

| Metric | Amazon | LTK | Combined |
|--------|--------|-----|----------|
| Commission | $54,544.87 | $8,609.54 | $63,154.41 |
| Clicks | 241,067 | 34,211 | 275,278 |
| Orders | 35,987 | 1,026 | 37,013 |
| Conversion | 14.93% | 2.06% | - |
| Avg Order Value | $20.29 | $8.39 | - |

**Amazon is 6.3X larger than LTK!**

## Top IG Stories by Link Clicks (Q4 2025)

| Clicks | Views | Topic |
|--------|-------|-------|
| 4,111 | 56K | Leggings |
| 2,444 | 46K | "Best ever" product |
| 2,327 | 18K | Investment leggings |
| 2,130 | 35K | NICKI10 code |
| 1,923 | 36K | Joining link |
| 1,827 | 17K | Leggings (100/10) |
| 1,658 | 27K | 7-year-old product |
| 1,540 | 32K | Curling iron sale |

**Leggings content = highest link clicks!** 🔥
