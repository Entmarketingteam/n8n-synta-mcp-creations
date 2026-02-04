-- =============================================
-- LTK REPORT SNAPSHOTS (n8n → Supabase mesh)
-- Run in Supabase project: abhhegllhwbmanwvqanc
-- =============================================
-- Purpose: Store LTK API snapshots pushed by n8n (same data as
-- "LTK Reports to Google Sheets") so CreatorMetrics / Railway app
-- can use it. Does NOT replace Airtable token or Sheets; n8n
-- writes to BOTH Sheets and this table in parallel.

CREATE TABLE IF NOT EXISTS ltk_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extracted_at timestamptz NOT NULL DEFAULT now(),
  creator_name text NOT NULL,
  source text NOT NULL DEFAULT 'n8n_airtable',
  user_info jsonb,
  commissions jsonb,
  performance jsonb,
  items_sold jsonb,
  items_sold_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ltk_snapshots_extracted ON ltk_snapshots(extracted_at DESC);
CREATE INDEX idx_ltk_snapshots_creator ON ltk_snapshots(creator_name);

COMMENT ON TABLE ltk_snapshots IS 'LTK API snapshots from n8n (Airtable token flow). One row per workflow run. Same data as Google Sheet append.';

-- RLS: allow service_role (n8n) to insert; allow authenticated app users to read.
ALTER TABLE ltk_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do anything on ltk_snapshots"
  ON ltk_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read ltk_snapshots"
  ON ltk_snapshots
  FOR SELECT
  TO authenticated
  USING (true);
