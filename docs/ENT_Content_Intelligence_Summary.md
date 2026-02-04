# ENT Content Intelligence System - Project Summary

**Date:** December 19, 2025  
**Status:** Schema Enhancement Ready  
**Next Session:** Run migrations, load data, test workflows

---

## 🎯 What We're Building

A unified intelligence system that connects:
- **Instagram content performance** (what posts get engagement)
- **LTK affiliate sales** (what products make money)
- **Attribution** (which content drives which sales)

The goal: Know that "leggings content = $2.89 per 1K views" so you can make data-driven content decisions.

---

## 📊 Your Data Inventory

### Instagram (Meta Business Suite Exports)
| File | Rows | Date Range |
|------|------|------------|
| May-Jul 2025 CSV | 1,391 | Stories/Reels/Posts |
| Jan-Mar 2025 CSV | 1,262 | Stories/Reels/Posts |
| Aug-Oct 2025 CSV | 1,409 | Stories/Reels/Posts |
| Stories Aug-Nov 2025 | 1,439 | Stories only |
| **Total** | **~5,500 posts** | Jan 2025 - Nov 2025 |

### LTK Exports
| File Type | Rows | What It Contains |
|-----------|------|------------------|
| `ltkposts-card.csv` | 131 | LTK collages (liketk.it links) with clicks/commissions |
| `analytics-card.csv` | 3,000 | Product-level performance |
| `brands-card.csv` | 131 | Brand-level summaries |
| `earnings-export.csv` | 2,798 | Individual transactions |

---

## 💰 Key Insights Discovered

### Revenue by Content Theme
| Theme | IG Posts | Total Views | LTK Commission | $/1K Views |
|-------|----------|-------------|----------------|------------|
| **LEGGINGS** | 40 | 668,866 | $1,931 | **$2.89** 🔥 |
| **JEANS** | 38 | 713,963 | $922 | **$1.29** |
| **DRESS** | 29 | 530,030 | $228 | $0.43 |
| **SHOES** | 56 | 1,298,976 | $501 | $0.39 |
| **AMAZON** | 102 | 1,755,423 | $0 | $0.00 ⚠️ |
| **WORKOUT** | 124 | 2,469,536 | $0 | $0.00 |

### Top Performing Products
1. **Lululemon Glow Up Tight** - $1,511 commission (185 orders)
2. **A&F 90s Relaxed Jean** - $435 commission
3. **New Balance 9060** - $151 commission

### Top Brands
1. Lululemon - $1,831 total
2. Abercrombie - $1,724 total
3. Amazon - $678 total
4. Nordstrom - $436 total

---

## 🏗️ Architecture Decision

### DON'T create new parallel tables
Your existing CreatorMetrics Supabase schema already has:
- ✅ `social_posts` - Multi-platform content tracking
- ✅ `sales` - Affiliate transactions
- ✅ `products` - Product catalog
- ✅ `attributions` - Links posts → sales (THE KEY FEATURE!)
- ✅ `insights` - AI recommendations
- ✅ `platform_connections` - OAuth tokens

### DO enhance existing schema with:
1. Vector embeddings for semantic search
2. Theme/hook detection columns
3. 2 new tables for LTK-specific data

---

## 📁 Files Created This Session

### Ready to Use
| File | Purpose | Location |
|------|---------|----------|
| `ENT_Content_Intelligence_Meta_LTK.json` | n8n workflow (standalone version) | `/mnt/user-data/outputs/` |
| `supabase_unified_schema_v2.sql` | Standalone schema (if starting fresh) | `/mnt/user-data/outputs/` |

### Need to Create
| File | Purpose | Status |
|------|---------|--------|
| `creatormetrics_enhancement.sql` | Migration for YOUR existing schema | **NEXT STEP** |
| `ENT_CreatorMetrics_Loader.json` | n8n workflow using YOUR schema | **NEXT STEP** |

---

## ✅ Next Steps (In Order)

### Step 1: Create Enhancement Migration
Add to your existing CreatorMetrics Supabase:
```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enhance social_posts
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS hook text;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS themes text[];
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS hashtags text[];
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS performance_tier text;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Enhance products  
ALTER TABLE products ADD COLUMN IF NOT EXISTS detected_category text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS performance_tier text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(768);

-- New table: LTK Collages
CREATE TABLE ltk_collages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  share_url text UNIQUE,
  hero_image text,
  published_at timestamptz,
  clicks integer DEFAULT 0,
  commissions numeric DEFAULT 0,
  orders integer DEFAULT 0,
  items_sold integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- New table: Brand Summaries
CREATE TABLE brand_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  brand_name text,
  platform text,
  total_clicks integer DEFAULT 0,
  total_commissions numeric DEFAULT 0,
  total_orders integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, brand_name, platform)
);

-- Indexes
CREATE INDEX idx_social_posts_themes ON social_posts USING gin(themes);
CREATE INDEX idx_social_posts_embedding ON social_posts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Step 2: Create n8n Workflow for Your Schema
Workflow that:
1. Accepts CSV uploads (auto-detects type)
2. Processes Meta IG → `social_posts` table
3. Processes LTK Analytics → `products` table
4. Processes LTK Posts → `ltk_collages` table
5. Processes LTK Earnings → `sales` table
6. Generates embeddings via Google AI
7. Detects themes/hooks automatically

### Step 3: Load Historical Data
Upload all your CSV files to populate the database:
- 5,500 IG posts
- 3,000 LTK products
- 131 LTK collages
- 2,798 transactions

### Step 4: Build Smart Repurposing Endpoint
API that:
1. Takes a topic/transcript
2. Searches similar high-performing content
3. Finds matching top-selling products
4. Generates repurposed content with affiliate recommendations

---

## 🔧 Technical Setup Required

### Supabase
- Project: Your existing CreatorMetrics project
- Run enhancement migration (Step 1)
- Note: You need the `vector` extension enabled

### n8n Environment Variables
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key
```

### n8n Credentials Needed
1. **Google AI API** - HTTP Query Auth with API key
2. **Supabase** - HTTP Header Auth with Bearer token

---

## 📈 Expected Outcomes

Once complete, you'll be able to:

1. **Ask:** "What content themes make the most money?"
   - Answer: Leggings @ $2.89/1K views, Jeans @ $1.29/1K views

2. **Ask:** "Find similar content to my top performers"
   - Vector search returns semantically similar posts

3. **Ask:** "What products should I feature in workout content?"
   - Cross-reference workout posts with top-selling products

4. **Ask:** "Generate a carousel about leggings"
   - AI uses your winning hooks + top Lululemon products

---

## 🔗 Related Sessions

Previous transcripts for full context:
- `/mnt/transcripts/2025-12-18-00-40-04-n8n-mcp-interactions-api-integration.txt`
- `/mnt/transcripts/2025-12-18-01-30-26-n8n-google-ai-workflows-implementation.txt`
- `/mnt/transcripts/2025-12-18-13-50-41-n8n-video-analysis-ai-agent-expansion.txt`
- `/mnt/transcripts/2025-12-19-14-41-00-meta-csv-vector-db-content-intelligence.txt`

---

## 💡 Key Decisions Made

1. **Supabase over Pinecone** - Free tier sufficient, stores full data + vectors together
2. **Google text-embedding-004** - 768 dimensions, free tier available
3. **Enhance existing schema** - Don't duplicate, add to CreatorMetrics
4. **Theme detection** - Auto-categorize content (leggings, jeans, workout, etc.)
5. **LTK collages table** - Track the liketk.it links separately

---

## ⚠️ Known Issues / Gaps

1. **Amazon tracking gap** - 102 posts, 1.7M views, $0 tracked commission
   - Amazon sales may not be flowing through LTK
   - Consider separate Amazon Associates tracking

2. **Date matching limitation** - LTK posts matched to IG by date only
   - No direct link between specific IG post and LTK collage
   - Attribution table helps but isn't perfect

3. **Historical data only** - Need to set up ongoing sync
   - Meta API for real-time IG data
   - LTK API (if available) for real-time sales

---

## 🛒 Amazon Influencer Program Data (NEW!)

### Data Files Analyzed
| File | Format | Records | Purpose |
|------|--------|---------|---------|
| Fee-Earnings | CSV | 14,067 | Product-level commissions |
| Fee-Orders | XML | 29,494 | Order-level with link attribution |
| Fee-DailyTrends | XML | 68 days | Daily clicks/conversion |
| Bounty | CSV | 83 | Fixed bounties (Prime, S&S) |

### Amazon Performance Summary
```
TOTAL REVENUE:        $287,528.78
TOTAL COMMISSIONS:    $21,811.96  (7.6% rate)
CLICKS:               216,215
ORDERS:               31,320
CONVERSION:           14.49%
```

### Top Categories by Commission
1. Clothing & Accessories - $4,853 (22%)
2. Home - $3,917 (18%)
3. Beauty & Grooming - $3,644 (17%)
4. Luxury Beauty - $2,047 (9%)
5. Toys & Games - $1,414 (6%)

### Traffic Sources (Link Types)
1. **Shoppable Post** - 12,538 orders (42.5%) ← IG Shopping
2. **Text/Image Links** - 10,325 orders (35%)
3. **Influencer Page** - 4,860 orders (16.5%) ← Amazon Storefront
4. **Short Mobile Link** - 817 orders (2.8%)

### The Amazon Connection
- Amazon tracks by DATE + LinkType + Category
- Your IG tracks by DATE + content type
- **MATCH ON DATE** to find which IG content drives Amazon sales!

### Files Created
| File | Purpose |
|------|---------|
| `creatormetrics_amazon_enhancement.sql` | Amazon-specific tables + correlation functions |

---

## 🛒 Amazon Influencer Program Data (continued)

### Revenue Comparison

| Platform | Commission | % of Total | Orders | Avg Order |
|----------|-----------|-----------|--------|-----------|
| **Amazon** | $47,486 | 88.3% | 31,320 | $20.27 |
| **LTK** | $6,267 | 11.7% | ~600 | $10.45 |
| **TOTAL** | **$53,753** | 100% | ~32,000 | - |

**Key Insight:** Amazon is 7.5X bigger than LTK! The "Amazon tracking gap" from IG analysis is now solved.

### Amazon Data Files

| File | Records | Purpose |
|------|---------|---------|
| Fee-Earnings.csv/xml | 14,067 | Individual product sales with ASIN |
| Fee-Orders.xml | 10MB | Orders with link type attribution |
| Fee-DailyTrends.xml | 68 days | Daily clicks, conversion, orders |
| Fee-BonusEarnings.xml | ~2,000 | Category daily commission totals |
| Fee-LinkType.xml | 8 types | Attribution by link source |
| Fee-Tracking.xml | 4 tags | Summary by tracking tag (platform) |
| Bounty.csv/xml | ~50 | Subscribe & Save bonuses |

### Platform Attribution (Tracking Tags)

| Tag | Platform | Commission | % |
|-----|----------|-----------|---|
| nickientenman-20 | Main/Storefront | $40,532 | 85% |
| nicki-metads-20 | Meta/IG Ads | $5,334 | 11% |
| nicki-igreel-20 | IG Reels | $1,185 | 2% |
| nicki-fb-20 | Facebook | $434 | 1% |

### Link Type Performance

| Link Type | Commission | Clicks | Conv % |
|-----------|-----------|--------|--------|
| Shoppable Post | $19,148 | 91,957 | 14.4% |
| Text/Image Links | $18,001 | 81,582 | 13.6% |
| Influencer Page | $6,923 | 28,389 | 17.9% |
| Short Mobile | $1,503 | 6,769 | 13.1% |

### Top Amazon Categories

1. Clothing & Accessories: $12,087
2. Beauty & Grooming: $7,278
3. Home: $7,172
4. Luxury Beauty: $5,001
5. Kitchen & Dining: $3,253

### New Database Tables

| Table | Purpose |
|-------|---------|
| amazon_tracking_tags | Platform attribution by tag |
| amazon_daily_metrics | Daily clicks/conversion/orders |
| amazon_link_performance | Attribution by link type |
| amazon_category_daily | Category performance by day |
| amazon_orders | Individual order details |
| amazon_bounties | Subscribe & Save bonuses |

---

## 🎨 UX Database Enhancements (From Article)

Based on "Best Practices for Usable and Efficient Data Tables" article, added these database features:

| Article Principle | Database Feature Added |
|-------------------|----------------------|
| #1 Search + Recent Queries | `search_history` table + full-text indexes |
| #4 Saved Filters | `saved_views` table with filters jsonb |
| #6 Data Export | `export_jobs` + `export_templates` tables |
| #7 Customizable Views | `saved_views` with columns, widths, order |
| #8 Undo/Audit Trail | `change_log` table + undo function |
| #13 Cursor Pagination | `get_posts_paginated()` function |
| #14 Status History | `status_history` table + auto-trigger |
| Fast Loading | `dashboard_stats` materialized view |

### Migration Order

1. Run `creatormetrics_enhancement_migration.sql` (core intelligence)
2. Run `creatormetrics_amazon_tables.sql` (Amazon integration)
3. Run `creatormetrics_ux_enhancement.sql` (UX support tables)

### Files Delivered

| File | Purpose |
|------|---------|
| `ENT_Content_Intelligence_Summary.md` | This summary document |
| `creatormetrics_enhancement_migration.sql` | Core schema enhancements |
| `creatormetrics_amazon_tables.sql` | Amazon Influencer tables |
| `creatormetrics_ux_enhancement.sql` | UX-supporting features |

---

**End of Summary**

*Resume next session with: "Let's create the n8n workflow for loading data into CreatorMetrics"*
