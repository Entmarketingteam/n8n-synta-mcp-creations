-- ============================================================================
-- CREATORMETRICS: COMPREHENSIVE AFFILIATE PLATFORM SCHEMA
-- ============================================================================
-- This schema supports: LTK, ShopMy, Amazon Associates, Mavely
-- Architecture: Raw Snapshots → Normalized Sales → Unified Views
-- ============================================================================
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/abhhegllhwbmanwvqanc/sql/new
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: RAW SNAPSHOT TABLES (Platform-Specific)
-- These preserve ALL data from each platform exactly as received
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 LTK SNAPSHOTS (Already exists - shown for reference)
-- ----------------------------------------------------------------------------
-- You already have: ltk_snapshots
-- Fields: id, extracted_at, creator_name, source, user_info (jsonb), 
--         commissions (jsonb), performance (jsonb), items_sold (jsonb), 
--         items_sold_count, created_at

-- ----------------------------------------------------------------------------
-- 1.2 SHOPMY SNAPSHOTS
-- Captures all data from ShopMy API endpoints
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shopmy_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Extraction metadata
    extracted_at timestamptz NOT NULL DEFAULT now(),
    creator_name text NOT NULL,
    source text NOT NULL DEFAULT 'n8n_api',
    
    -- User profile data (from /api/Users/find_by_email)
    shopmy_user_id text,
    user_info jsonb DEFAULT '{}'::jsonb,
    /*
    user_info contains:
    {
        "id": "user_123",
        "email": "creator@example.com",
        "name": "Creator Name",
        "username": "creatorhandle",
        "profile_image": "https://...",
        "bio": "...",
        "created_at": "2024-01-15T...",
        "is_verified": true,
        "follower_count": 50000,
        "social_links": {...}
    }
    */
    
    -- Payments data (from /api/Payments/by_user/{id})
    payments jsonb DEFAULT '[]'::jsonb,
    /*
    payments array contains:
    [{
        "id": "payment_123",
        "amount": 1500.00,
        "status": "paid",
        "payment_method": "paypal",
        "paid_at": "2025-01-15T...",
        "period_start": "2024-12-01",
        "period_end": "2024-12-31",
        "invoice_url": "https://..."
    }]
    */
    
    -- Payout summary (from /api/Payouts/payout_summary/{id})
    payout_summary jsonb DEFAULT '{}'::jsonb,
    /*
    payout_summary contains:
    {
        "total_earned": 25000.00,
        "total_paid": 23500.00,
        "pending_balance": 1500.00,
        "next_payout_date": "2025-02-15",
        "payment_threshold": 50.00,
        "lifetime_earnings": 45000.00,
        "this_month": 2500.00,
        "last_month": 3200.00
    }
    */
    
    -- Pins/Links data (from /api/Pins?User_id={id})
    pins jsonb DEFAULT '[]'::jsonb,
    pins_count integer DEFAULT 0,
    /*
    pins array contains:
    [{
        "id": "pin_123",
        "url": "https://shopmy.us/...",
        "product_name": "Product Name",
        "brand": "Brand Name",
        "retailer": "Retailer",
        "image_url": "https://...",
        "original_price": 89.99,
        "sale_price": 69.99,
        "commission_rate": 15.0,
        "clicks": 245,
        "orders": 12,
        "commission_earned": 125.85,
        "created_at": "2024-06-15T...",
        "category": "Fashion"
    }]
    */
    
    -- Commissions data (from /api/Payouts/download_commissions)
    commissions jsonb DEFAULT '[]'::jsonb,
    commissions_count integer DEFAULT 0,
    /*
    commissions array contains:
    [{
        "id": "commission_123",
        "order_id": "ORDER_ABC",
        "pin_id": "pin_123",
        "product_name": "Product Name",
        "brand": "Brand Name",
        "retailer": "Retailer",
        "order_amount": 89.99,
        "commission_amount": 13.50,
        "commission_rate": 15.0,
        "status": "pending" | "approved" | "paid" | "reversed",
        "ordered_at": "2025-01-10T...",
        "approved_at": "2025-01-15T...",
        "paid_at": null,
        "customer_location": "US"
    }]
    */
    
    -- Aggregated metrics (calculated)
    total_clicks integer DEFAULT 0,
    total_orders integer DEFAULT 0,
    total_commission numeric(12,2) DEFAULT 0,
    pending_commission numeric(12,2) DEFAULT 0,
    
    created_at timestamptz DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_shopmy_snapshots_creator ON shopmy_snapshots(creator_name);
CREATE INDEX IF NOT EXISTS idx_shopmy_snapshots_extracted ON shopmy_snapshots(extracted_at DESC);

-- ----------------------------------------------------------------------------
-- 1.3 AMAZON ASSOCIATES SNAPSHOTS
-- Captures all data from Amazon Associates (API or scraped reports)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS amazon_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Extraction metadata
    extracted_at timestamptz NOT NULL DEFAULT now(),
    creator_name text NOT NULL,
    source text NOT NULL DEFAULT 'n8n_api', -- 'n8n_api', 'n8n_scraper', 'manual_csv'
    report_date date NOT NULL, -- Date of the report
    
    -- Tracking ID info (which tag this data belongs to)
    tracking_id text NOT NULL, -- e.g., 'nickientenman-20', 'nicki-igreel-20'
    tracking_tag_name text, -- Friendly name for the tag
    
    -- Fee-Earnings Report Data
    earnings_report jsonb DEFAULT '[]'::jsonb,
    /*
    earnings_report array contains:
    [{
        "date": "2025-01-15",
        "tracking_id": "nickientenman-20",
        "category": "Health & Personal Care",
        "items_shipped": 3,
        "revenue": 89.97,
        "ad_fees": 3.60,  -- This is the commission
        "rate": 4.00,
        "direct_qualifying_revenue": 89.97,
        "indirect_qualifying_revenue": 0,
        "bounty_events": 0,
        "bounty_earnings": 0
    }]
    */
    
    -- Fee-Orders Report Data
    orders_report jsonb DEFAULT '[]'::jsonb,
    orders_count integer DEFAULT 0,
    /*
    orders_report array contains:
    [{
        "date": "2025-01-15",
        "order_id": "ORDER123",
        "tracking_id": "nickientenman-20",
        "asin": "B01N5IB20Q",
        "product_title": "Collagen Peptides Powder",
        "category": "Health",
        "seller": "Amazon.com" | "Third Party",
        "items_ordered": 1,
        "items_shipped": 1,
        "price": 29.99,
        "link_type": "Shoppable Post" | "Text/Image" | "Influencer Page",
        "device_type": "Mobile" | "Desktop" | "Tablet",
        "customer_country": "US"
    }]
    */
    
    -- Fee-Tracking Report Data (aggregated by tracking ID)
    tracking_report jsonb DEFAULT '{}'::jsonb,
    /*
    tracking_report contains:
    {
        "tracking_id": "nickientenman-20",
        "clicks": 15420,
        "conversion_rate": 2.34,
        "items_ordered": 361,
        "items_shipped": 358,
        "revenue": 12500.00,
        "ad_fees": 500.00
    }
    */
    
    -- Fee-LinkType Report Data
    link_type_report jsonb DEFAULT '[]'::jsonb,
    /*
    link_type_report array contains:
    [{
        "link_type": "Shoppable Post",
        "clicks": 8500,
        "conversion_rate": 3.2,
        "items_ordered": 272,
        "items_shipped": 270,
        "revenue": 8500.00,
        "ad_fees": 340.00
    }]
    */
    
    -- Fee-DailyTrends Report Data
    daily_trends jsonb DEFAULT '[]'::jsonb,
    /*
    daily_trends array contains:
    [{
        "date": "2025-01-15",
        "clicks": 520,
        "items_ordered_3p": 5,
        "items_ordered_amz": 12,
        "total_items_ordered": 17,
        "conversion_rate": 3.27
    }]
    */
    
    -- Category Performance (Fee-BonusEarnings)
    category_performance jsonb DEFAULT '[]'::jsonb,
    /*
    category_performance array contains:
    [{
        "date": "2025-01-15",
        "category": "Clothing",
        "items_shipped": 25,
        "revenue": 750.00,
        "ad_fees": 30.00
    }]
    */
    
    -- Bounty Data
    bounties jsonb DEFAULT '[]'::jsonb,
    /*
    bounties array contains:
    [{
        "program_name": "Prime Video Channels",
        "quantity": 5,
        "bounty_amount": 2.50,
        "total_earnings": 12.50,
        "date": "2025-01-15"
    }]
    */
    
    -- Aggregated metrics (calculated from reports)
    total_clicks integer DEFAULT 0,
    total_items_shipped integer DEFAULT 0,
    total_revenue numeric(12,2) DEFAULT 0,
    total_ad_fees numeric(12,2) DEFAULT 0, -- Commission
    total_bounties numeric(12,2) DEFAULT 0,
    
    created_at timestamptz DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_amazon_snapshots_creator ON amazon_snapshots(creator_name);
CREATE INDEX IF NOT EXISTS idx_amazon_snapshots_tracking ON amazon_snapshots(tracking_id);
CREATE INDEX IF NOT EXISTS idx_amazon_snapshots_date ON amazon_snapshots(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_amazon_snapshots_extracted ON amazon_snapshots(extracted_at DESC);

-- ----------------------------------------------------------------------------
-- 1.4 MAVELY SNAPSHOTS
-- Captures all data from Mavely creators dashboard
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mavely_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Extraction metadata
    extracted_at timestamptz NOT NULL DEFAULT now(),
    creator_name text NOT NULL,
    source text NOT NULL DEFAULT 'n8n_api', -- 'n8n_api', 'n8n_scraper'
    
    -- Period for this snapshot
    period_start date,
    period_end date,
    
    -- User profile data
    mavely_user_id text,
    user_info jsonb DEFAULT '{}'::jsonb,
    /*
    user_info contains:
    {
        "id": "user_123",
        "email": "creator@example.com",
        "name": "Creator Name",
        "username": "creatorhandle",
        "profile_image": "https://...",
        "joined_at": "2024-01-15T...",
        "tier": "Gold" | "Silver" | "Bronze"
    }
    */
    
    -- Analytics Overview (from /analytics dashboard)
    analytics_overview jsonb DEFAULT '{}'::jsonb,
    /*
    analytics_overview contains:
    {
        "sales": 312972.00,
        "commission": 8774.00,
        "clicks": 23650,
        "conversion_rate": 14.93,
        "orders": 3530,
        "average_order_value": 88.66,
        "average_commission_per_order": 2.49,
        "revenue_per_click": 0.37
    }
    */
    
    -- Top performing links (from analytics)
    top_links jsonb DEFAULT '[]'::jsonb,
    top_links_count integer DEFAULT 0,
    /*
    top_links array contains:
    [{
        "link_id": "link_123",
        "url": "https://mave.ly/...",
        "short_url": "https://mave.ly/abc123",
        "product_name": "Product Name",
        "brand": "Brand Name",
        "retailer": "Target" | "Walmart" | "Amazon",
        "image_url": "https://...",
        "sales": 5420.00,
        "commission": 162.60,
        "clicks": 890,
        "transactions": 61,
        "conversion_rate": 6.85,
        "created_at": "2024-06-15T..."
    }]
    */
    
    -- Transactions/Orders (from earnings/transactions view)
    transactions jsonb DEFAULT '[]'::jsonb,
    transactions_count integer DEFAULT 0,
    /*
    transactions array contains:
    [{
        "id": "txn_123",
        "order_id": "ORDER_ABC",
        "link_id": "link_123",
        "product_name": "Product Name",
        "brand": "Brand Name",
        "retailer": "Target",
        "order_amount": 45.99,
        "commission_amount": 1.38,
        "commission_rate": 3.0,
        "status": "pending" | "approved" | "paid" | "reversed",
        "ordered_at": "2025-01-10T...",
        "approved_at": "2025-01-15T...",
        "paid_at": null
    }]
    */
    
    -- Retailer breakdown
    retailer_performance jsonb DEFAULT '[]'::jsonb,
    /*
    retailer_performance array contains:
    [{
        "retailer": "Target",
        "sales": 125000.00,
        "commission": 3750.00,
        "clicks": 8500,
        "orders": 1406,
        "conversion_rate": 16.54
    }]
    */
    
    -- Brand performance
    brand_performance jsonb DEFAULT '[]'::jsonb,
    /*
    brand_performance array contains:
    [{
        "brand": "Nike",
        "sales": 45000.00,
        "commission": 1350.00,
        "clicks": 3200,
        "orders": 506,
        "conversion_rate": 15.81
    }]
    */
    
    -- Traffic source breakdown
    traffic_sources jsonb DEFAULT '[]'::jsonb,
    /*
    traffic_sources array contains:
    [{
        "source": "Instagram" | "TikTok" | "YouTube" | "Direct" | "Other",
        "clicks": 12500,
        "sales": 156000.00,
        "commission": 4680.00,
        "percentage": 53.0
    }]
    */
    
    -- Payout/Earnings data
    earnings_summary jsonb DEFAULT '{}'::jsonb,
    /*
    earnings_summary contains:
    {
        "total_earned": 8774.00,
        "total_paid": 7500.00,
        "pending_balance": 1274.00,
        "next_payout_date": "2025-02-15",
        "payment_method": "PayPal",
        "minimum_payout": 25.00
    }
    */
    
    -- Aggregated metrics (calculated)
    total_sales numeric(12,2) DEFAULT 0,
    total_commission numeric(12,2) DEFAULT 0,
    total_clicks integer DEFAULT 0,
    total_orders integer DEFAULT 0,
    conversion_rate numeric(5,2) DEFAULT 0,
    
    created_at timestamptz DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mavely_snapshots_creator ON mavely_snapshots(creator_name);
CREATE INDEX IF NOT EXISTS idx_mavely_snapshots_period ON mavely_snapshots(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_mavely_snapshots_extracted ON mavely_snapshots(extracted_at DESC);


-- ============================================================================
-- SECTION 2: NORMALIZED TRANSACTION TABLES
-- Individual transactions extracted from snapshots for granular analysis
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 SHOPMY TRANSACTIONS (Detailed commission records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shopmy_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id uuid REFERENCES shopmy_snapshots(id) ON DELETE SET NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Source identifiers
    shopmy_commission_id text, -- ShopMy's commission ID
    shopmy_order_id text, -- ShopMy's order ID
    shopmy_pin_id text, -- Which pin/link generated this
    
    -- Transaction details
    transaction_date timestamptz NOT NULL,
    product_name text NOT NULL,
    brand text,
    retailer text,
    category text,
    
    -- Financial
    order_amount numeric(12,2) NOT NULL,
    commission_amount numeric(12,2) NOT NULL,
    commission_rate numeric(5,2),
    
    -- Status tracking
    status text NOT NULL CHECK (status IN ('pending', 'approved', 'paid', 'reversed')),
    ordered_at timestamptz,
    approved_at timestamptz,
    paid_at timestamptz,
    
    -- Additional metadata
    customer_location text,
    source_url text,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Prevent duplicates
    CONSTRAINT unique_shopmy_transaction UNIQUE (shopmy_commission_id)
);

CREATE INDEX IF NOT EXISTS idx_shopmy_txn_user ON shopmy_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_shopmy_txn_date ON shopmy_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_shopmy_txn_status ON shopmy_transactions(status);

-- ----------------------------------------------------------------------------
-- 2.2 AMAZON TRANSACTIONS (Detailed order/commission records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS amazon_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id uuid REFERENCES amazon_snapshots(id) ON DELETE SET NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Source identifiers
    amazon_order_id text,
    asin text, -- Amazon product ID
    tracking_id text NOT NULL, -- Which associate tag
    
    -- Transaction details
    transaction_date timestamptz NOT NULL,
    product_title text NOT NULL,
    category text,
    seller text, -- 'Amazon.com' or 'Third Party'
    
    -- Quantities
    items_ordered integer DEFAULT 1,
    items_shipped integer DEFAULT 0,
    
    -- Financial
    price numeric(12,2) NOT NULL, -- Item price
    revenue numeric(12,2), -- Total revenue
    ad_fees numeric(12,2) NOT NULL, -- Commission earned
    commission_rate numeric(5,2),
    
    -- Attribution
    link_type text, -- 'Shoppable Post', 'Text/Image', 'Influencer Page', etc.
    device_type text, -- 'Mobile', 'Desktop', 'Tablet'
    customer_country text,
    
    -- Bounty info (if applicable)
    is_bounty boolean DEFAULT false,
    bounty_program text,
    bounty_amount numeric(12,2),
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Prevent duplicates
    CONSTRAINT unique_amazon_transaction UNIQUE (amazon_order_id, asin, tracking_id)
);

CREATE INDEX IF NOT EXISTS idx_amazon_txn_user ON amazon_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_amazon_txn_date ON amazon_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_amazon_txn_tracking ON amazon_transactions(tracking_id);
CREATE INDEX IF NOT EXISTS idx_amazon_txn_asin ON amazon_transactions(asin);
CREATE INDEX IF NOT EXISTS idx_amazon_txn_link_type ON amazon_transactions(link_type);

-- ----------------------------------------------------------------------------
-- 2.3 MAVELY TRANSACTIONS (Detailed commission records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mavely_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id uuid REFERENCES mavely_snapshots(id) ON DELETE SET NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Source identifiers
    mavely_transaction_id text, -- Mavely's transaction ID
    mavely_order_id text, -- Mavely's order ID
    mavely_link_id text, -- Which link generated this
    
    -- Transaction details
    transaction_date timestamptz NOT NULL,
    product_name text NOT NULL,
    brand text,
    retailer text NOT NULL, -- 'Target', 'Walmart', etc.
    category text,
    
    -- Financial
    order_amount numeric(12,2) NOT NULL,
    commission_amount numeric(12,2) NOT NULL,
    commission_rate numeric(5,2),
    
    -- Status tracking
    status text NOT NULL CHECK (status IN ('pending', 'approved', 'paid', 'reversed')),
    ordered_at timestamptz,
    approved_at timestamptz,
    paid_at timestamptz,
    
    -- Traffic source
    traffic_source text, -- 'Instagram', 'TikTok', 'YouTube', 'Direct'
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Prevent duplicates
    CONSTRAINT unique_mavely_transaction UNIQUE (mavely_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_mavely_txn_user ON mavely_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_mavely_txn_date ON mavely_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_mavely_txn_status ON mavely_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mavely_txn_retailer ON mavely_transactions(retailer);


-- ============================================================================
-- SECTION 3: AGGREGATED METRICS TABLES
-- Pre-computed rollups for fast dashboard queries
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 DAILY PLATFORM METRICS
-- Daily rollup per platform per creator
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_platform_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    
    metric_date date NOT NULL,
    platform text NOT NULL CHECK (platform IN ('ltk', 'shopmy', 'amazon', 'mavely')),
    
    -- Click metrics
    clicks integer DEFAULT 0,
    
    -- Order metrics
    orders integer DEFAULT 0,
    items_sold integer DEFAULT 0,
    
    -- Financial metrics
    gross_sales numeric(12,2) DEFAULT 0,
    commission numeric(12,2) DEFAULT 0,
    
    -- Conversion
    conversion_rate numeric(5,2) DEFAULT 0,
    
    -- Breakdown by status
    pending_commission numeric(12,2) DEFAULT 0,
    approved_commission numeric(12,2) DEFAULT 0,
    paid_commission numeric(12,2) DEFAULT 0,
    reversed_commission numeric(12,2) DEFAULT 0,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT unique_daily_platform UNIQUE (user_id, metric_date, platform)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date ON daily_platform_metrics(user_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_platform ON daily_platform_metrics(platform);

-- ----------------------------------------------------------------------------
-- 3.2 MONTHLY PLATFORM METRICS
-- Monthly rollup per platform per creator
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_platform_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    
    metric_month date NOT NULL, -- First day of month
    platform text NOT NULL CHECK (platform IN ('ltk', 'shopmy', 'amazon', 'mavely')),
    
    -- Click metrics
    total_clicks integer DEFAULT 0,
    
    -- Order metrics  
    total_orders integer DEFAULT 0,
    total_items_sold integer DEFAULT 0,
    
    -- Financial metrics
    gross_sales numeric(12,2) DEFAULT 0,
    total_commission numeric(12,2) DEFAULT 0,
    
    -- Averages
    avg_order_value numeric(12,2) DEFAULT 0,
    avg_commission_per_order numeric(12,2) DEFAULT 0,
    conversion_rate numeric(5,2) DEFAULT 0,
    
    -- Top performers
    top_brands jsonb DEFAULT '[]'::jsonb,
    top_products jsonb DEFAULT '[]'::jsonb,
    top_categories jsonb DEFAULT '[]'::jsonb,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT unique_monthly_platform UNIQUE (user_id, metric_month, platform)
);

CREATE INDEX IF NOT EXISTS idx_monthly_metrics_user_month ON monthly_platform_metrics(user_id, metric_month DESC);


-- ============================================================================
-- SECTION 4: UNIFIED VIEWS
-- Cross-platform queries for dashboards and reporting
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 UNIFIED EARNINGS VIEW
-- All commission earnings across all platforms
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW unified_earnings AS

-- LTK Sales (from existing sales table; category may not exist on sales)
SELECT 
    s.id,
    s.user_id,
    'ltk'::text as platform,
    s.sale_date as transaction_date,
    s.product_name,
    s.brand,
    NULL::text as retailer,
    NULL::text as category,
    s.order_value as gross_amount,
    s.commission_amount,
    s.status,
    s.created_at
FROM sales s
WHERE s.platform = 'LTK'

UNION ALL

-- ShopMy Transactions
SELECT 
    st.id,
    st.user_id,
    'shopmy'::text as platform,
    st.transaction_date,
    st.product_name,
    st.brand,
    st.retailer,
    st.category,
    st.order_amount as gross_amount,
    st.commission_amount,
    st.status,
    st.created_at
FROM shopmy_transactions st

UNION ALL

-- Amazon Transactions
SELECT 
    at.id,
    at.user_id,
    'amazon'::text as platform,
    at.transaction_date,
    at.product_title as product_name,
    NULL::text as brand,
    at.seller as retailer,
    at.category,
    at.revenue as gross_amount,
    at.ad_fees as commission_amount,
    'approved'::text as status, -- Amazon doesn't have pending status in reports
    at.created_at
FROM amazon_transactions at

UNION ALL

-- Mavely Transactions
SELECT 
    mt.id,
    mt.user_id,
    'mavely'::text as platform,
    mt.transaction_date,
    mt.product_name,
    mt.brand,
    mt.retailer,
    mt.category,
    mt.order_amount as gross_amount,
    mt.commission_amount,
    mt.status,
    mt.created_at
FROM mavely_transactions mt;

-- ----------------------------------------------------------------------------
-- 4.2 EARNINGS SUMMARY VIEW
-- Aggregated earnings by period and platform
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW earnings_summary AS
SELECT 
    user_id,
    platform,
    DATE_TRUNC('day', transaction_date)::date as period_date,
    'daily'::text as period_type,
    COUNT(*) as transaction_count,
    SUM(gross_amount) as total_gross,
    SUM(commission_amount) as total_commission,
    AVG(commission_amount) as avg_commission
FROM unified_earnings
GROUP BY user_id, platform, DATE_TRUNC('day', transaction_date)

UNION ALL

SELECT 
    user_id,
    platform,
    DATE_TRUNC('week', transaction_date)::date as period_date,
    'weekly'::text as period_type,
    COUNT(*) as transaction_count,
    SUM(gross_amount) as total_gross,
    SUM(commission_amount) as total_commission,
    AVG(commission_amount) as avg_commission
FROM unified_earnings
GROUP BY user_id, platform, DATE_TRUNC('week', transaction_date)

UNION ALL

SELECT 
    user_id,
    platform,
    DATE_TRUNC('month', transaction_date)::date as period_date,
    'monthly'::text as period_type,
    COUNT(*) as transaction_count,
    SUM(gross_amount) as total_gross,
    SUM(commission_amount) as total_commission,
    AVG(commission_amount) as avg_commission
FROM unified_earnings
GROUP BY user_id, platform, DATE_TRUNC('month', transaction_date);

-- ----------------------------------------------------------------------------
-- 4.3 PLATFORM COMPARISON VIEW
-- Side-by-side platform metrics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW platform_comparison AS
SELECT 
    user_id,
    DATE_TRUNC('month', transaction_date)::date as month,
    SUM(CASE WHEN platform = 'ltk' THEN commission_amount ELSE 0 END) as ltk_commission,
    SUM(CASE WHEN platform = 'shopmy' THEN commission_amount ELSE 0 END) as shopmy_commission,
    SUM(CASE WHEN platform = 'amazon' THEN commission_amount ELSE 0 END) as amazon_commission,
    SUM(CASE WHEN platform = 'mavely' THEN commission_amount ELSE 0 END) as mavely_commission,
    SUM(commission_amount) as total_commission,
    
    COUNT(CASE WHEN platform = 'ltk' THEN 1 END) as ltk_transactions,
    COUNT(CASE WHEN platform = 'shopmy' THEN 1 END) as shopmy_transactions,
    COUNT(CASE WHEN platform = 'amazon' THEN 1 END) as amazon_transactions,
    COUNT(CASE WHEN platform = 'mavely' THEN 1 END) as mavely_transactions,
    COUNT(*) as total_transactions
FROM unified_earnings
GROUP BY user_id, DATE_TRUNC('month', transaction_date)
ORDER BY month DESC;

-- ----------------------------------------------------------------------------
-- 4.4 TOP PERFORMERS VIEW
-- Top products/brands across all platforms
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW top_performers AS
SELECT 
    user_id,
    product_name,
    brand,
    platform,
    COUNT(*) as order_count,
    SUM(gross_amount) as total_gross,
    SUM(commission_amount) as total_commission,
    AVG(commission_amount) as avg_commission_per_order
FROM unified_earnings
WHERE transaction_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY user_id, product_name, brand, platform
ORDER BY total_commission DESC;


-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS)
-- Ensure users can only access their own data
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE shopmy_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE mavely_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopmy_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mavely_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_platform_metrics ENABLE ROW LEVEL SECURITY;

-- Service role can do anything (for n8n pipelines)
CREATE POLICY "Service role full access on shopmy_snapshots"
    ON shopmy_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on amazon_snapshots"
    ON amazon_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on mavely_snapshots"
    ON mavely_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on shopmy_transactions"
    ON shopmy_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on amazon_transactions"
    ON amazon_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on mavely_transactions"
    ON mavely_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on daily_platform_metrics"
    ON daily_platform_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on monthly_platform_metrics"
    ON monthly_platform_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read their own data
CREATE POLICY "Users read own shopmy_snapshots"
    ON shopmy_snapshots FOR SELECT TO authenticated
    USING (creator_name IN (SELECT display_name FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users read own amazon_snapshots"
    ON amazon_snapshots FOR SELECT TO authenticated
    USING (creator_name IN (SELECT display_name FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users read own mavely_snapshots"
    ON mavely_snapshots FOR SELECT TO authenticated
    USING (creator_name IN (SELECT display_name FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users read own shopmy_transactions"
    ON shopmy_transactions FOR SELECT TO authenticated
    USING (user_id = auth.uid());
CREATE POLICY "Users read own amazon_transactions"
    ON amazon_transactions FOR SELECT TO authenticated
    USING (user_id = auth.uid());
CREATE POLICY "Users read own mavely_transactions"
    ON mavely_transactions FOR SELECT TO authenticated
    USING (user_id = auth.uid());
CREATE POLICY "Users read own daily_platform_metrics"
    ON daily_platform_metrics FOR SELECT TO authenticated
    USING (user_id = auth.uid());
CREATE POLICY "Users read own monthly_platform_metrics"
    ON monthly_platform_metrics FOR SELECT TO authenticated
    USING (user_id = auth.uid());


-- ============================================================================
-- SECTION 6: HELPER FUNCTIONS
-- Utility functions for data processing
-- ============================================================================

-- Function to update monthly metrics from daily metrics
CREATE OR REPLACE FUNCTION refresh_monthly_metrics(p_user_id uuid, p_month date)
RETURNS void AS $$
BEGIN
    INSERT INTO monthly_platform_metrics (
        user_id, metric_month, platform,
        total_clicks, total_orders, total_items_sold,
        gross_sales, total_commission,
        avg_order_value, avg_commission_per_order, conversion_rate
    )
    SELECT 
        user_id,
        DATE_TRUNC('month', metric_date)::date,
        platform,
        SUM(clicks),
        SUM(orders),
        SUM(items_sold),
        SUM(gross_sales),
        SUM(commission),
        CASE WHEN SUM(orders) > 0 THEN SUM(gross_sales) / SUM(orders) ELSE 0 END,
        CASE WHEN SUM(orders) > 0 THEN SUM(commission) / SUM(orders) ELSE 0 END,
        CASE WHEN SUM(clicks) > 0 THEN (SUM(orders)::numeric / SUM(clicks) * 100) ELSE 0 END
    FROM daily_platform_metrics
    WHERE user_id = p_user_id
      AND metric_date >= p_month
      AND metric_date < p_month + INTERVAL '1 month'
    GROUP BY user_id, DATE_TRUNC('month', metric_date), platform
    ON CONFLICT (user_id, metric_month, platform) 
    DO UPDATE SET
        total_clicks = EXCLUDED.total_clicks,
        total_orders = EXCLUDED.total_orders,
        total_items_sold = EXCLUDED.total_items_sold,
        gross_sales = EXCLUDED.gross_sales,
        total_commission = EXCLUDED.total_commission,
        avg_order_value = EXCLUDED.avg_order_value,
        avg_commission_per_order = EXCLUDED.avg_commission_per_order,
        conversion_rate = EXCLUDED.conversion_rate,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- SECTION 7: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE shopmy_snapshots IS 'Raw data snapshots from ShopMy API - preserves complete API responses';
COMMENT ON TABLE amazon_snapshots IS 'Raw data snapshots from Amazon Associates - preserves complete report data';
COMMENT ON TABLE mavely_snapshots IS 'Raw data snapshots from Mavely dashboard - preserves complete analytics data';

COMMENT ON TABLE shopmy_transactions IS 'Normalized individual transactions extracted from ShopMy snapshots';
COMMENT ON TABLE amazon_transactions IS 'Normalized individual transactions extracted from Amazon snapshots';
COMMENT ON TABLE mavely_transactions IS 'Normalized individual transactions extracted from Mavely snapshots';

COMMENT ON VIEW unified_earnings IS 'Unified view of all commission earnings across all platforms';
COMMENT ON VIEW earnings_summary IS 'Aggregated earnings by day/week/month per platform';
COMMENT ON VIEW platform_comparison IS 'Side-by-side monthly comparison of all platforms';
COMMENT ON VIEW top_performers IS 'Top performing products/brands across all platforms (last 90 days)';
