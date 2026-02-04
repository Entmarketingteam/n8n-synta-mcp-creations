# CreatorMetrics Database Schema Map

## Visual Overview

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                    CREATORMETRICS UNIFIED SCHEMA                                          ║
║                              Instagram + LTK + Amazon → Single Database                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         📱 CONTENT LAYER                                                    │
│                                   (What Nicki Creates & Posts)                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────┐
    │                      social_posts                                │
    │  ════════════════════════════════════════════════════════════   │
    │  PK: id (uuid)                                                   │
    │  FK: user_id → profiles                                          │
    │  ─────────────────────────────────────────────────────────────   │
    │  • platform: 'instagram' | 'facebook' | 'tiktok'                │
    │  • post_type: 'reel' | 'story' | 'carousel' | 'static'          │
    │  • external_id: Instagram post ID                                │
    │  • caption: Full post text                                       │
    │  • posted_at: When published                                     │
    │  ─────────────────────────────────────────────────────────────   │
    │  METRICS:                                                        │
    │  • views, likes, comments, shares, saves                         │
    │  • engagement_rate, reach, impressions                           │
    │  ─────────────────────────────────────────────────────────────   │
    │  AI-ENHANCED (from migration):                                   │
    │  • hook: First line of caption                                   │
    │  • themes[]: ['leggings', 'workout', 'amazon']                   │
    │  • hashtags[]: Extracted hashtags                                │
    │  • mentions[]: @tagged accounts                                  │
    │  • performance_tier: 'viral' | 'strong' | 'average' | 'low'     │
    │  • embedding: vector(768) for semantic search                    │
    │  • attributed_revenue: Total $ from this post                    │
    └─────────────────────────────────────────────────────────────────┘
                                        │
                                        │ 1:many
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      🔗 ATTRIBUTION LAYER                                                   │
│                              (Connecting Content → Sales)                                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────┐
    │                      attributions                                │
    │  ════════════════════════════════════════════════════════════   │
    │  PK: id (uuid)                                                   │
    │  FK: post_id → social_posts                                      │
    │  FK: sale_id → sales                                             │
    │  FK: product_id → products                                       │
    │  ─────────────────────────────────────────────────────────────   │
    │  • attribution_type: 'direct' | 'assisted' | 'view_through'     │
    │  • confidence_score: 0.0 - 1.0                                   │
    │  • attributed_at: When attribution made                          │
    │  ─────────────────────────────────────────────────────────────   │
    │  THE BRIDGE: Links IG posts to actual sales!                     │
    └─────────────────────────────────────────────────────────────────┘
                    │                                    │
                    │                                    │
        ┌───────────┘                                    └───────────┐
        │                                                            │
        ▼                                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       💰 REVENUE LAYER                                                      │
│                                  (Where Money Comes From)                                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────┐          ┌────────────────────────────────────┐
│           ltk_collages             │          │              sales                 │
│  ══════════════════════════════   │          │  ══════════════════════════════   │
│  PK: id (uuid)                     │          │  PK: id (uuid)                     │
│  FK: user_id → profiles            │          │  FK: user_id → profiles            │
│  FK: linked_post_ids[] → social_   │          │  FK: product_id → products         │
│      posts (array of post IDs)     │          │  ───────────────────────────────── │
│  ───────────────────────────────── │          │  COMMON FIELDS:                    │
│  • ltk_id: LTK's collage ID        │          │  • platform: 'ltk' | 'amazon' |    │
│  • ltk_url: liketk.it/xxxxx        │          │              'howl' | 'mavely'     │
│  • published_at: When posted       │          │  • sale_date: When purchased       │
│  ───────────────────────────────── │          │  • product_name: Item name         │
│  METRICS:                          │          │  • order_amount: Sale price        │
│  • clicks: Total clicks            │          │  • commission_amount: Your cut     │
│  • total_commission: $ earned      │          │  • status: 'pending' | 'paid'        │
│  • total_orders: # of purchases     │          │  ───────────────────────────────── │
│  ───────────────────────────────── │          │  AMAZON-SPECIFIC:                   │
│  AI-ENHANCED:                      │          │  • asin: Amazon product ID         │
│  • themes[]: Detected themes        │          │  • tracking_id: nickientenman-20   │
│  • embedding: vector(768)           │          │  • link_type: 'Shoppable Post'     │
└────────────────────────────────────┘          │  • device_type: 'PHONE'            │
        │                                        │  • seller: 'Amazon' | '3rd Party'  │
        │ 1:many                                 └────────────────────────────────────┘
        ▼                                                        │
┌────────────────────────────────────┐                           │
│           products                 │◄──────────────────────────┘
│  ══════════════════════════════   │
│  PK: id (uuid)                     │
│  FK: user_id → profiles            │
│  ───────────────────────────────── │
│  • platform: 'ltk' | 'amazon'      │
│  • external_id: Platform's ID      │
│  • name: Product name              │
│  • brand: Brand name               │
│  • category: Product category      │
│  • product_url: Link to product    │
│  • image_url: Product image        │
│  ───────────────────────────────── │
│  METRICS:                          │
│  • total_clicks: Lifetime clicks   │
│  • total_sales: # of orders        │
│  • total_revenue: $ generated      │
│  • conversion_rate: clicks→sales   │
│  ───────────────────────────────── │
│  AI-ENHANCED:                      │
│  • detected_category: AI-assigned │
│  • performance_tier: Rating       │
│  • embedding: vector(768)          │
└────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      🛒 AMAZON-SPECIFIC LAYER                                               │
│                                   (Amazon Influencer Program)                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
│   amazon_tracking_tags   │    │   amazon_daily_metrics   │    │  amazon_link_performance │
│  ══════════════════════ │    │  ══════════════════════ │    │  ══════════════════════ │
│  • tracking_id           │    │  • metric_date           │    │  • link_type             │
│  • tag_name              │    │  • clicks                │    │  • clicks                │
│  • platform_source       │    │  • conversion_rate       │    │  • conversion_rate       │
│  ─────────────────────── │    │  • items_ordered_3p      │    │  • items_ordered         │
│  nickientenman-20        │    │  • items_ordered_amz     │    │  • commission             │
│    → Main ($40,532)      │    │  • total_items_ordered   │    │  ─────────────────────── │
│  nicki-metads-20         │    └──────────────────────────┘    │  Shoppable Post: $19k    │
│    → Meta Ads ($5,334)   │                                     │  Text/Image: $18k        │
│  nicki-igreel-20         │    ┌──────────────────────────┐    │  Influencer Page: $7k    │
│    → IG Reels ($1,185)   │    │  amazon_category_daily   │    └──────────────────────────┘
│  nicki-fb-20             │    │  ══════════════════════ │
│    → Facebook ($434)     │    │  • metric_date           │    ┌──────────────────────────┐
└──────────────────────────┘    │  • category              │    │     amazon_orders        │
                                 │  • total_revenue         │    │  ══════════════════════ │
                                 │  • commission_income     │    │  • asin                  │
                                 │  ─────────────────────── │    │  • product_title         │
                                 │  Top Categories:         │    │  • category              │
                                 │  Clothing: $12,087       │    │  • price, quantity       │
                                 │  Beauty: $7,278          │    │  • tracking_id           │
                                 │  Home: $7,172            │    │  • link_type             │
                                 └──────────────────────────┘    │  • device_type           │
                                                                  │  • order_date            │
                                 ┌──────────────────────────┐    └──────────────────────────┘
                                 │     amazon_bounties      │
                                 │  ══════════════════════ │
                                 │  • program_name          │
                                 │  • quantity              │
                                 │  • bounty_amount         │
                                 │  (Subscribe & Save $)    │
                                 └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      📊 ANALYTICS LAYER                                                     │
│                                   (Aggregations & Insights)                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
│     brand_summaries      │    │      content_themes       │    │        insights         │
│  ══════════════════════ │    │  ══════════════════════ │    │  ══════════════════════ │
│  • brand                 │    │  • theme_name            │    │  • insight_type          │
│  • platform              │    │  • keywords[]             │    │  • title                 │
│  • total_clicks          │    │  • avg_engagement         │    │  • description          │
│  • total_commission      │    │  • total_posts           │    │  • action_items[]        │
│  • total_orders          │    │  • total_revenue         │    │  • priority              │
│  • avg_order_value       │    │  • revenue_per_1k_views   │    │  • related_posts[]      │
│  • commission_per_click  │    │  ─────────────────────── │    │  • dismissed_at          │
│  ─────────────────────── │    │  leggings: $2.89/1K ⭐   │    └──────────────────────────┘
│  Lululemon: $1,831       │    │  jeans: $1.29/1K         │
│  Abercrombie: $1,724     │    │  dress: $0.43/1K         │
│  Amazon: $47,486 🔥      │    │  shoes: $0.39/1K         │
└──────────────────────────┘    └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         🎨 UX LAYER                                                         │
│                                   (User Experience Features)                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
│     search_history       │    │       saved_views        │    │       export_jobs        │
│  ══════════════════════ │    │  ══════════════════════ │    │  ══════════════════════ │
│  • query                 │    │  • name                  │    │  • table_name            │
│  • search_type           │    │  • visible_columns[]      │    │  • format                │
│  • result_count          │    │  • filters (jsonb)        │    │  • status                │
│  • filters_applied       │    │  • sort_by                │    │  • progress_percent      │
│  (Recent search feature) │    │  • frozen_columns[]       │    │  • file_url              │
└──────────────────────────┘    └──────────────────────────┘    └──────────────────────────┘

┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
│       change_log         │    │     status_history        │    │    user_preferences      │
│  ══════════════════════ │    │  ══════════════════════ │    │  ══════════════════════ │
│  • table_name            │    │  • old_status            │    │  • default_rows_per_page │
│  • record_id             │    │  • new_status            │    │  • table_settings        │
│  • field_name            │    │  • changed_by            │    │  • theme                 │
│  • old_value, new_value  │    │  • reason                │    │  • compact_mode          │
│  (Undo functionality)    │    │  (Audit trail)           │    │  (Personalization)      │
└──────────────────────────┘    └──────────────────────────┘    └──────────────────────────┘
```

## 🔗 THE ACTUAL DATA CONNECTIONS

```
═══════════════════════════════════════════════════════════════════════════════════════════════════════════
                              HOW THE DATA ACTUALLY CONNECTS
═══════════════════════════════════════════════════════════════════════════════════════════════════════

INSTAGRAM → LTK CONNECTION
────────────────────────────────────────────────────────────────────────────────────────────────────────────

  ┌─────────────────────────────────────┐              ┌─────────────────────────────────────┐
  │  IG STORIES/REELS CSV              │              │  LTK POSTS CSV                      │
  │  ═══════════════════════════════    │              │  ═══════════════════════════════    │
  │                                     │              │                                     │
  │  Description column:                │    MATCH     │  share_url column:                  │
  │  "...shop my favorites!        ─────┼──────────────┼▶ https://liketk.it/5hcAu           │
  │   liketk.it/5hcAu..."               │     ON       │                                     │
  │                                     │   "5hcAu"    │  clicks: 2543                       │
  │  Link clicks: 197                   │              │  commissions: $594                  │
  │  Views: 20,829                      │              │  orders: 68                         │
  │  Post ID: 18035344190399145         │              │                                     │
  └─────────────────────────────────────┘              └─────────────────────────────────────┘

  CONNECTION KEY: Extract "liketk.it/XXXXX" from IG Description → Match to LTK share_url


INSTAGRAM → AMAZON CONNECTIONS (3 Paths)
────────────────────────────────────────────────────────────────────────────────────────────────────────────

PATH 1: Via LTK (Amazon products tracked in LTK) - $678
─────────────────────────────────────────────────────────

  ┌─────────────────────────────────────┐              ┌─────────────────────────────────────┐
  │  LTK POST (liketk.it/xxxxx)         │              │  LTK ANALYTICS (products)           │
  │  ═══════════════════════════════    │              │  ═══════════════════════════════    │
  │                                     │              │                                     │
  │  share_url: liketk.it/5hcAu    ─────┼──────────────┼▶ 965 Amazon products!              │
  │  (collage of products)              │              │                                     │
  │                                     │              │  url column:                        │
  └─────────────────────────────────────┘              │  amazon.com/dp/B0DJG695LH           │
                                                       │  ?tag=onamznickient-20              │
                                                       │        ↑                            │
                                                       │  Amazon tracking ID embedded!      │
                                                       └─────────────────────────────────────┘


PATH 2: Via Amazon Tracking Tags (Direct) - $47,486
───────────────────────────────────────────────────────

  ┌─────────────────────────────────────┐              ┌─────────────────────────────────────┐
  │  IG STORY LINK STICKER              │              │  AMAZON FEE-TRACKING                │
  │  ═══════════════════════════════    │              │  ═══════════════════════════════    │
  │                                     │              │                                     │
  │  Link clicks: 197                   │    MATCH     │  tracking_id: nicki-igreel-20       │
  │  (URL not in export, but uses)      │     ON       │  platform_source: IG Reels          │
  │  urlgeni.us/amzn/xxxxx         ─────┼──────────────┼▶ commission: $1,185                 │
  │  with tag=nicki-igreel-20           │    TAG       │                                     │
  │                                     │              │  tracking_id: nickientenman-20       │
  └─────────────────────────────────────┘              │  commission: $40,532                │
                                                       └─────────────────────────────────────┘


PATH 3: Via Amazon Link Type (Attribution)
──────────────────────────────────────────

  ┌─────────────────────────────────────┐              ┌─────────────────────────────────────┐
  │  AMAZON FEE-ORDERS                  │              │  AMAZON FEE-LINKTYPE               │
  │  ═══════════════════════════════    │              │  ═══════════════════════════════    │
  │                                     │              │                                     │
  │  LinkType: "Shoppable Post"    ─────┼──────────────┼▶ Shoppable Post: $19,148           │
  │  LinkType: "Short Mobile"      ─────┼──────────────┼▶ Short Mobile: $1,503               │
  │  LinkType: "Influencer Page"   ─────┼──────────────┼▶ Influencer Page: $6,923           │
  │                                     │              │                                     │
  └─────────────────────────────────────┘              └─────────────────────────────────────┘


COMPLETE REVENUE FLOW
────────────────────────────────────────────────────────────────────────────────────────────────────────────

                    ┌─────────────────────────────────────────────┐
                    │           INSTAGRAM CONTENT                │
                    │  ═══════════════════════════════════════    │
                    │  Stories: 1,400+ posts                      │
                    │  Reels: 100+ posts                          │
                    │  Link clicks tracked: 734 stories           │
                    └─────────────────┬───────────────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
              ▼                                               ▼
    ┌─────────────────────┐                     ┌─────────────────────┐
    │    LTK ROUTE        │                     │   AMAZON DIRECT     │
    │  ═══════════════    │                     │  ═══════════════    │
    │                     │                     │                     │
    │  liketk.it links    │                     │  urlgeni.us links   │
    │  in IG captions     │                     │  amzn.to links      │
    │        ↓            │                     │  Story link stickers│
    │  LTK Posts CSV      │                     │        ↓            │
    │  (share_url)        │                     │  Amazon Tags:       │
    │        ↓            │                     │  • nicki-igreel-20  │
    │  LTK Analytics      │                     │  • nickientenman-20 │
    │  (965 Amazon items!)│                     │        ↓            │
    │        ↓            │                     │  Fee-Earnings CSV   │
    │  LTK Earnings       │                     │  Fee-Orders XML     │
    │                     │                     │                     │
    │  $6,267 total       │                     │  $47,486 total       │
    │  ($678 is Amazon)   │                     │                     │
    └─────────────────────┘                     └─────────────────────┘
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────────────┐
                    │        TOTAL AFFILIATE REVENUE              │
                    │        ════════════════════════             │
                    │                                             │
                    │        LTK:    $6,267  (12%)                │
                    │        Amazon: $47,486 (88%)                │
                    │        ─────────────────────                │
                    │        TOTAL:  $53,753                      │
                    └─────────────────────────────────────────────┘
```

## Data Flow Diagram

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                         DATA FLOW                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝

                                    ┌─────────────────┐
                                    │   INSTAGRAM     │
                                    │  Meta Business  │
                                    │    Suite CSV    │
                                    │   (5,500 posts) │
                                    └────────┬────────┘
                                             │
                                             ▼
┌─────────────────┐              ┌─────────────────────────┐              ┌─────────────────┐
│      LTK        │              │                         │              │     AMAZON      │
│  ─────────────  │              │      social_posts      │              │  ─────────────  │
│ ltkposts (131)  │──────┐       │    ═══════════════     │       ┌──────│ Fee-Earnings    │
│ analytics (3K)  │      │       │   Central Content       │       │      │ (14,067 sales)  │
│ earnings (2.8K) │      │       │      Repository         │       │      │ Fee-Orders     │
│ brands (131)    │      │       │                         │       │      │ Fee-Tracking    │
└─────────────────┘      │       └───────────┬─────────────┘       │      └─────────────────┘
                         │                   │                     │
                         │                   │                     │
                         ▼                   ▼                     ▼
              ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
              │   ltk_collages  │  │  attributions    │  │      amazon_* tables          │
              │ ═══════════════ │  │ ═══════════════ │  │ ═══════════════════════════   │
              │ Clicks: 10K     │  │ Links posts to  │  │ tracking_tags: Platform       │
              │ Commission: $6K │  │ sales & products│  │ daily_metrics: Trends         │
              └────────┬────────┘  └────────┬────────┘  │ category_daily: Categories   │
                       │                    │           │ link_performance: Sources    │
                       │                    │           │ orders: 31K transactions      │
                       ▼                    ▼           └──────────────┬──────────────┘
              ┌─────────────────┐  ┌─────────────────┐                 │
              │    products     │  │     sales       │◄────────────────┘
              │ ═══════════════ │  │ ═══════════════ │
              │ 3K+ products    │  │ All platforms   │
              │ with embeddings │  │ unified sales   │
              └─────────────────┘  └─────────────────┘
                                           │
                                           ▼
                               ┌─────────────────────┐
                               │   brand_summaries   │
                               │ ═══════════════════ │
                               │ Amazon: $47,486     │
                               │ LTK Total: $6,267   │
                               │ ─────────────────── │
                               │ TOTAL: $53,753      │
                               └─────────────────────┘
```

## Key Relationships

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                    RELATIONSHIP DIAGRAM                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝

profiles (user)
    │
    ├──< social_posts (1:many)
    │         │
    │         ├──< attributions (1:many) ──> sales
    │         │                               │
    │         └──< ltk_collages.linked_post_ids[] (many:many via array)
    │
    ├──< products (1:many)
    │         │
    │         └──< sales.product_id (1:many)
    │
    ├──< sales (1:many)
    │         │
    │         ├── platform = 'ltk' | 'amazon' | 'howl' | 'mavely'
    │         ├── asin (Amazon only)
    │         └── tracking_id (Amazon only)
    │
    ├──< ltk_collages (1:many)
    │
    ├──< amazon_tracking_tags (1:many)
    │
    ├──< amazon_daily_metrics (1:many)
    │
    ├──< amazon_link_performance (1:many)
    │
    ├──< amazon_category_daily (1:many)
    │
    ├──< amazon_orders (1:many)
    │
    ├──< amazon_bounties (1:many)
    │
    ├──< brand_summaries (1:many)
    │
    ├──< insights (1:many)
    │
    ├──< saved_views (1:many)
    │
    ├──< search_history (1:many)
    │
    └──< user_preferences (1:1)


LEGEND:
────────────────────────
──<  = One-to-Many
──>  = Foreign Key reference
═══  = Table name
```

## Revenue Attribution Flow

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                              HOW CONTENT BECOMES REVENUE                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝

    IG REEL POSTED                    USER CLICKS                     PURCHASE MADE
    ══════════════                    ═══════════                     ═════════════
         │                                 │                               │
         │                                 │                               │
         ▼                                 ▼                               ▼
┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
│  social_posts   │              │                 │              │     sales        │
│ ─────────────── │              │   LTK Route     │              │ ───────────────  │
│ caption: "Best   │──┬──────────▶│ liketk.it/xxx   │─────────────▶│ platform: ltk    │
│ leggings ever!"  │  │           │                 │              │ commission: $15   │
│ themes: [legs]  │  │           └─────────────────┘              └────────┬────────┘
│ views: 50,000   │  │                                                     │
└─────────────────┘  │           ┌─────────────────┐                       │
                     │           │                 │                       │
                     └──────────▶│  Amazon Route   │              ┌────────┴────────┐
                                 │ amzn.to/xxx     │              │  attributions   │
                                 │ tag: nicki-     │              │ ─────────────── │
                                 │ igreel-20       │              │ post_id: ←──────┼──┐
                                 └────────┬────────┘              │ sale_id: ↑      │  │
                                          │                       │ confidence: 0.9 │  │
                                          ▼                       └─────────────────┘  │
                                 ┌─────────────────┐                                   │
                                 │     sales       │                                   │
                                 │ ─────────────── │                                   │
                                 │ platform: amz   │◄──────────────────────────────────┘
                                 │ tracking_id:    │
                                 │ nicki-igreel-20 │     THE CONNECTION:
                                 │ commission: $8  │     ════════════════
                                 └─────────────────┘     Tracking tag tells us
                                                         which IG content drove
                                                         the Amazon sale!

═══════════════════════════════════════════════════════════════════════════════════════════════════════
REVENUE SUMMARY BY PATH:
═══════════════════════════════════════════════════════════════════════════════════════════════════════

    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │   IG CONTENT    │────▶│   CLICK PATH    │────▶│    REVENUE      │
    └─────────────────┘     └─────────────────┘     └─────────────────┘
    
    5,500 posts              LTK Collages             LTK: $6,267 (12%)
    2.5M+ views              ────────────────────────────────────────────
                             Amazon Links             Amazon: $47,486 (88%)
                             • Shoppable Post: $19K   ════════════════════
                             • Text/Image: $18K       TOTAL: $53,753
                             • Storefront: $7K
```

## Vector Search Architecture

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                    SEMANTIC SEARCH FLOW                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝

    USER QUERY                    EMBEDDING                      VECTOR SEARCH
    ══════════                    ═════════                      ═════════════
         │                            │                               │
         ▼                            ▼                               ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────────────┐
│ "Find content   │         │  Google AI API  │         │  search_similar_posts()  │
│  about workout  │────────▶│ text-embedding  │────────▶│  ═══════════════════     │
│  leggings that  │         │   -004          │         │  Cosine similarity       │
│  performed well"│         │                 │         │  against all post       │
└─────────────────┘         │  Returns:       │         │  embeddings             │
                            │  vector(768)    │         │                         │
                            └─────────────────┘         │  Filters:               │
                                                        │  • user_id              │
                                                        │  • themes[]             │
                                                        │  • performance_tier     │
                                                        └───────────┬─────────────┘
                                                                    │
                                                                    ▼
                                                        ┌─────────────────────────┐
                                                        │      RESULTS            │
                                                        │  ═══════════════════    │
                                                        │  Top 5 similar posts    │
                                                        │  with match scores      │
                                                        │                         │
                                                        │  → Post A (0.94 match)  │
                                                        │    "Lulu leggings..."   │
                                                        │    Views: 89K, $156 rev │
                                                        │                         │
                                                        │  → Post B (0.91 match)  │
                                                        │    "Gym outfit..."      │
                                                        │    Views: 45K, $89 rev  │
                                                        └─────────────────────────┘


TABLES WITH EMBEDDINGS:
═══════════════════════

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  social_posts   │     │    products     │     │  ltk_collages   │
│ ─────────────── │     │ ─────────────── │     │ ─────────────── │
│ embedding:      │     │ embedding:      │     │ embedding:      │
│ vector(768)     │     │ vector(768)     │     │ vector(768)     │
│                 │     │                 │     │                 │
│ Indexed with    │     │ Indexed with    │     │ Indexed with    │
│ ivfflat for     │     │ ivfflat for     │     │ ivfflat for     │
│ fast similarity │     │ fast similarity │     │ fast similarity │
│ search          │     │ search          │     │ search          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## File to Table Mapping

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                    DATA SOURCE → TABLE MAPPING                                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝

SOURCE FILE                          TARGET TABLE                    RECORDS
══════════════════════════════════════════════════════════════════════════════════════════════════════════

INSTAGRAM (Meta Business Suite CSVs)
────────────────────────────────────────────────────────────────────────────────────────────────────────────
Content_Interactions_Jan.csv    ──▶  social_posts                   ~1,200
Content_Interactions_May.csv    ──▶  social_posts                   ~1,400
Content_Interactions_Sep.csv    ──▶  social_posts                   ~1,500
Content_Interactions_Nov.csv    ──▶  social_posts                   ~1,400
                                                                     ───────
                                                            TOTAL:   5,500 posts

LTK EXPORTS
────────────────────────────────────────────────────────────────────────────────────────────────────────────
ltkposts-card.csv               ──▶  ltk_collages                   131 collages
analytics-card.csv              ──▶  products                       3,000 products
earnings-export.csv             ──▶  sales (platform='ltk')         2,798 transactions
brands-card.csv                 ──▶  brand_summaries                131 brands

AMAZON INFLUENCER PROGRAM
────────────────────────────────────────────────────────────────────────────────────────────────────────────
Fee-Earnings.csv/xml            ──▶  sales (platform='amazon')      14,067 transactions
Fee-Orders.xml                  ──▶  amazon_orders                  ~15,000 orders
Fee-DailyTrends.xml             ──▶  amazon_daily_metrics            68 days
Fee-BonusEarnings.xml           ──▶  amazon_category_daily           ~2,000 rows
Fee-LinkType.xml                ──▶  amazon_link_performance        8 link types
Fee-Tracking.xml                ──▶  amazon_tracking_tags           4 tags
Bounty.csv/xml                  ──▶  amazon_bounties                ~50 bounties

═══════════════════════════════════════════════════════════════════════════════════════════════════════════
TOTAL RECORDS: ~42,000+
═══════════════════════════════════════════════════════════════════════════════════════════════════════════
```
