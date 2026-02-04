-- =============================================
-- CREATORMETRICS: AMAZON INFLUENCER TABLES
-- Adds Amazon-specific tracking & attribution
-- Run AFTER the main enhancement migration
-- =============================================

-- =============================================
-- AMAZON TRACKING TAGS
-- Links tracking IDs to content sources
-- =============================================

CREATE TABLE IF NOT EXISTS amazon_tracking_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Tag info
  tracking_id text NOT NULL,        -- 'nickientenman-20'
  tag_name text,                    -- 'Main Storefront'
  platform_source text,             -- 'instagram_reels', 'facebook', 'storefront'
  
  -- Performance totals (updated from Fee-Tracking)
  total_clicks integer DEFAULT 0,
  total_orders integer DEFAULT 0,
  total_items_shipped integer DEFAULT 0,
  total_revenue numeric(12,2) DEFAULT 0,
  total_commission numeric(12,2) DEFAULT 0,
  
  -- Metadata
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, tracking_id)
);

CREATE INDEX idx_amazon_tags_user ON amazon_tracking_tags(user_id);

-- =============================================
-- AMAZON DAILY METRICS
-- From Fee-DailyTrends - daily performance
-- =============================================

CREATE TABLE IF NOT EXISTS amazon_daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Date
  metric_date date NOT NULL,
  
  -- Performance metrics
  clicks integer DEFAULT 0,
  conversion_rate numeric(5,2) DEFAULT 0,      -- percentage
  items_ordered_3rd_party integer DEFAULT 0,
  items_ordered_amazon integer DEFAULT 0,
  total_items_ordered integer DEFAULT 0,
  
  -- Calculated
  revenue_estimate numeric(12,2),
  commission_estimate numeric(12,2),
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, metric_date)
);

CREATE INDEX idx_amazon_daily_user_date ON amazon_daily_metrics(user_id, metric_date DESC);

-- =============================================
-- AMAZON LINK TYPE PERFORMANCE
-- From Fee-LinkType - where sales originate
-- =============================================

CREATE TABLE IF NOT EXISTS amazon_link_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Period (for historical tracking)
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Link type
  link_type text NOT NULL,           -- 'Shoppable Post link creation', 'Influencer Page', etc.
  
  -- Performance metrics  
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  click_through_rate numeric(5,2),
  conversion_rate numeric(5,2),
  items_ordered integer DEFAULT 0,
  items_shipped integer DEFAULT 0,
  ordered_revenue numeric(12,2) DEFAULT 0,
  commission numeric(12,2) DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, period_start, period_end, link_type)
);

CREATE INDEX idx_amazon_link_user ON amazon_link_performance(user_id, period_start DESC);

-- =============================================
-- AMAZON CATEGORY PERFORMANCE  
-- From Fee-BonusEarnings - category daily summary
-- =============================================

CREATE TABLE IF NOT EXISTS amazon_category_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  tracking_id text,
  
  -- Date and category
  metric_date date NOT NULL,
  category text NOT NULL,
  
  -- Performance
  total_revenue numeric(12,2) DEFAULT 0,
  commission_income numeric(12,2) DEFAULT 0,
  bonus numeric(12,2) DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, metric_date, category, tracking_id)
);

CREATE INDEX idx_amazon_cat_user_date ON amazon_category_daily(user_id, metric_date DESC);
CREATE INDEX idx_amazon_cat_category ON amazon_category_daily(category);

-- =============================================
-- AMAZON ORDERS (Detailed)
-- From Fee-Orders - individual order with attribution
-- =============================================

CREATE TABLE IF NOT EXISTS amazon_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Product info
  asin text NOT NULL,
  product_title text,
  category text,
  price numeric(10,2),
  quantity integer DEFAULT 1,
  
  -- Attribution
  tracking_id text,                  -- Which tag
  link_type text,                    -- How they clicked
  device_type text,                  -- 'PHONE', 'DESKTOP', etc.
  indirect_sales text,               -- 'di' = direct, 'ndi' = indirect
  
  -- Timing
  order_date date NOT NULL,
  
  -- For linking to IG content (if we can match)
  attributed_post_id uuid REFERENCES social_posts(id),
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_amazon_orders_user_date ON amazon_orders(user_id, order_date DESC);
CREATE INDEX idx_amazon_orders_asin ON amazon_orders(asin);
CREATE INDEX idx_amazon_orders_category ON amazon_orders(category);
CREATE INDEX idx_amazon_orders_link_type ON amazon_orders(link_type);

-- =============================================
-- AMAZON BOUNTIES (Subscribe & Save)
-- From Bounty files - subscription bonuses
-- =============================================

CREATE TABLE IF NOT EXISTS amazon_bounties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Bounty info
  program_name text NOT NULL,        -- 'Subscribe & Save – Beauty & Grooming'
  tracking_id text,
  
  -- Transaction
  ship_date date,
  quantity integer DEFAULT 1,        -- Can be negative for returns
  bounty_amount numeric(10,2),
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_amazon_bounties_user ON amazon_bounties(user_id, ship_date DESC);

-- =============================================
-- ENHANCED SALES TABLE
-- Add Amazon-specific fields to existing sales table
-- =============================================

-- Add extracted LTK link for direct matching
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_posts' AND column_name = 'ltk_link') THEN
    ALTER TABLE social_posts ADD COLUMN ltk_link text;
    COMMENT ON COLUMN social_posts.ltk_link IS 'Extracted liketk.it/XXXXX from caption - connects to ltk_collages.share_url';
  END IF;
  
  -- Also add amazon_tag for direct Amazon attribution
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_posts' AND column_name = 'amazon_tag') THEN
    ALTER TABLE social_posts ADD COLUMN amazon_tag text;
    COMMENT ON COLUMN social_posts.amazon_tag IS 'Amazon tracking tag used (nicki-igreel-20, etc) - connects to amazon_tracking_tags';
  END IF;
  
  -- Link clicks from stories export
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_posts' AND column_name = 'link_clicks') THEN
    ALTER TABLE social_posts ADD COLUMN link_clicks integer DEFAULT 0;
    COMMENT ON COLUMN social_posts.link_clicks IS 'Link sticker clicks from IG stories export';
  END IF;
END $$;

-- Index for LTK matching
CREATE INDEX IF NOT EXISTS idx_social_posts_ltk_link ON social_posts(ltk_link) WHERE ltk_link IS NOT NULL;

-- Add ltk_code to ltk_collages for easier matching  
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ltk_collages' AND column_name = 'ltk_code') THEN
    ALTER TABLE ltk_collages ADD COLUMN ltk_code text;
    COMMENT ON COLUMN ltk_collages.ltk_code IS 'Just the code part (5hcAu) extracted from share_url for matching';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ltk_collages_code ON ltk_collages(ltk_code) WHERE ltk_code IS NOT NULL;

-- =============================================
-- ENHANCED SALES TABLE
-- Add Amazon-specific fields to existing sales table
-- =============================================

-- Add Amazon fields if they don't exist
DO $$ 
BEGIN
  -- ASIN for Amazon products
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'asin') THEN
    ALTER TABLE sales ADD COLUMN asin text;
  END IF;
  
  -- Tracking ID for attribution
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'tracking_id') THEN
    ALTER TABLE sales ADD COLUMN tracking_id text;
  END IF;
  
  -- Link type for attribution
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'link_type') THEN
    ALTER TABLE sales ADD COLUMN link_type text;
  END IF;
  
  -- Device type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'device_type') THEN
    ALTER TABLE sales ADD COLUMN device_type text;
  END IF;
  
  -- Seller (Amazon vs 3rd Party)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'seller') THEN
    ALTER TABLE sales ADD COLUMN seller text;
  END IF;
END $$;

-- Index for Amazon lookups
CREATE INDEX IF NOT EXISTS idx_sales_asin ON sales(asin) WHERE asin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_tracking_id ON sales(tracking_id) WHERE tracking_id IS NOT NULL;

-- =============================================
-- VIEWS: Combined Analytics
-- =============================================

-- Amazon performance by category
CREATE OR REPLACE VIEW amazon_category_performance AS
SELECT 
  user_id,
  category,
  sum(commission_income) as total_commission,
  sum(total_revenue) as total_revenue,
  avg(commission_income / NULLIF(total_revenue, 0) * 100) as avg_commission_rate,
  count(DISTINCT metric_date) as active_days
FROM amazon_category_daily
GROUP BY user_id, category
ORDER BY total_commission DESC;

-- Amazon vs LTK comparison view
CREATE OR REPLACE VIEW affiliate_platform_comparison AS
SELECT 
  user_id,
  'amazon' as platform,
  sum(total_commission) as total_commission,
  sum(total_orders) as total_orders,
  sum(total_revenue) as total_revenue
FROM amazon_tracking_tags
GROUP BY user_id

UNION ALL

SELECT 
  user_id,
  'ltk' as platform,
  sum(total_commission) as total_commission,
  sum(total_orders) as total_orders,
  sum(total_revenue) as total_revenue  
FROM ltk_collages
GROUP BY user_id;

-- Daily performance across all platforms
CREATE OR REPLACE VIEW daily_affiliate_metrics AS
SELECT 
  user_id,
  metric_date,
  'amazon' as platform,
  clicks,
  total_items_ordered as orders,
  conversion_rate
FROM amazon_daily_metrics

UNION ALL

SELECT 
  sp.user_id,
  sp.posted_at::date as metric_date,
  'ltk' as platform,
  lc.clicks,
  lc.total_orders as orders,
  CASE WHEN lc.clicks > 0 
    THEN (lc.total_orders::numeric / lc.clicks * 100) 
    ELSE 0 END as conversion_rate
FROM social_posts sp
JOIN ltk_collages lc ON sp.id = ANY(lc.linked_post_ids)
GROUP BY sp.user_id, sp.posted_at::date, lc.clicks, lc.total_orders;

-- =============================================
-- FUNCTIONS: Amazon Analytics
-- =============================================

-- Get top Amazon categories for a user
CREATE OR REPLACE FUNCTION get_amazon_top_categories(
  p_user_id uuid,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  category text,
  total_commission numeric,
  total_revenue numeric,
  commission_rate numeric,
  order_count bigint
)
LANGUAGE sql AS $$
  SELECT 
    category,
    sum(commission_income) as total_commission,
    sum(total_revenue) as total_revenue,
    avg(commission_income / NULLIF(total_revenue, 0) * 100) as commission_rate,
    count(*) as order_count
  FROM amazon_category_daily
  WHERE user_id = p_user_id
  GROUP BY category
  ORDER BY total_commission DESC
  LIMIT p_limit;
$$;

-- Get link type performance
CREATE OR REPLACE FUNCTION get_amazon_link_performance(
  p_user_id uuid
)
RETURNS TABLE (
  link_type text,
  total_clicks bigint,
  total_orders bigint,
  total_commission numeric,
  conversion_rate numeric,
  revenue_per_click numeric
)
LANGUAGE sql AS $$
  SELECT 
    link_type,
    sum(clicks) as total_clicks,
    sum(items_ordered) as total_orders,
    sum(commission) as total_commission,
    avg(conversion_rate) as conversion_rate,
    sum(commission) / NULLIF(sum(clicks), 0) as revenue_per_click
  FROM amazon_link_performance
  WHERE user_id = p_user_id
  GROUP BY link_type
  ORDER BY total_commission DESC;
$$;

-- Compare tracking tags (platform attribution)
CREATE OR REPLACE FUNCTION get_amazon_tag_comparison(
  p_user_id uuid
)
RETURNS TABLE (
  tracking_id text,
  tag_name text,
  platform_source text,
  total_commission numeric,
  pct_of_total numeric,
  total_clicks integer,
  total_orders integer
)
LANGUAGE sql AS $$
  WITH totals AS (
    SELECT sum(total_commission) as grand_total
    FROM amazon_tracking_tags
    WHERE user_id = p_user_id
  )
  SELECT 
    t.tracking_id,
    t.tag_name,
    t.platform_source,
    t.total_commission,
    (t.total_commission / NULLIF(totals.grand_total, 0) * 100) as pct_of_total,
    t.total_clicks,
    t.total_orders
  FROM amazon_tracking_tags t, totals
  WHERE t.user_id = p_user_id
  ORDER BY t.total_commission DESC;
$$;

-- =============================================
-- FUNCTIONS: LTK Link Extraction & Matching
-- =============================================

-- Extract LTK code from caption text
CREATE OR REPLACE FUNCTION extract_ltk_code(caption text)
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  ltk_match text;
BEGIN
  -- Match liketk.it/XXXXX pattern
  SELECT (regexp_match(caption, 'liketk\.it/([a-zA-Z0-9]+)'))[1] INTO ltk_match;
  RETURN ltk_match;
END; $$;

-- Extract LTK code from share_url
CREATE OR REPLACE FUNCTION extract_ltk_code_from_url(share_url text)
RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  -- Match https://liketk.it/XXXXX pattern
  RETURN (regexp_match(share_url, 'liketk\.it/([a-zA-Z0-9]+)'))[1];
END; $$;

-- Populate ltk_link on social_posts from caption
CREATE OR REPLACE FUNCTION populate_ltk_links()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE social_posts
  SET ltk_link = 'liketk.it/' || extract_ltk_code(caption)
  WHERE caption ILIKE '%liketk.it/%'
    AND ltk_link IS NULL;
END; $$;

-- Populate ltk_code on ltk_collages from share_url
CREATE OR REPLACE FUNCTION populate_ltk_codes()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE ltk_collages
  SET ltk_code = extract_ltk_code_from_url(share_url)
  WHERE share_url IS NOT NULL
    AND ltk_code IS NULL;
END; $$;

-- Match social_posts to ltk_collages and create attributions
CREATE OR REPLACE FUNCTION match_posts_to_ltk()
RETURNS TABLE (
  post_id uuid,
  ltk_collage_id uuid,
  ltk_code text,
  commission numeric
)
LANGUAGE sql AS $$
  SELECT 
    sp.id as post_id,
    lc.id as ltk_collage_id,
    lc.ltk_code,
    lc.total_commission as commission
  FROM social_posts sp
  JOIN ltk_collages lc ON extract_ltk_code(sp.caption) = lc.ltk_code
  WHERE sp.caption ILIKE '%liketk.it/%';
$$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE amazon_tracking_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_link_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_category_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_bounties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own amazon_tracking_tags" ON amazon_tracking_tags
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own amazon_daily_metrics" ON amazon_daily_metrics
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own amazon_link_performance" ON amazon_link_performance
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own amazon_category_daily" ON amazon_category_daily
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own amazon_orders" ON amazon_orders
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own amazon_bounties" ON amazon_bounties
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- DONE!
-- Amazon Influencer Program fully integrated
-- =============================================
