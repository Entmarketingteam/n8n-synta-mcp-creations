-- Real Estate Calculator Schema

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  county TEXT,
  square_footage INTEGER,
  lot_size REAL,
  bedrooms INTEGER,
  bathrooms REAL,
  year_built INTEGER,
  property_type TEXT DEFAULT 'sfh',
  zoning_info TEXT,
  source_type TEXT,
  source_group_name TEXT,
  source_contact_name TEXT,
  source_listing_url TEXT,
  zillow_zestimate REAL,
  zillow_rental_estimate REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  deal_type TEXT NOT NULL DEFAULT 'flip',
  status TEXT DEFAULT 'analyzing',

  -- Core inputs
  purchase_price REAL NOT NULL,
  rehab_budget REAL DEFAULT 0,
  closing_costs REAL DEFAULT 0,
  holding_costs REAL DEFAULT 0,
  arv REAL NOT NULL,
  project_months INTEGER DEFAULT 6,
  contingency_percent REAL DEFAULT 0.10,

  -- HML inputs
  hml_ltv_arv REAL DEFAULT 0.70,
  hml_points REAL DEFAULT 0.01,
  hml_interest_rate REAL DEFAULT 0.10,
  hml_admin_fees REAL DEFAULT 0,

  -- GAP lending inputs
  gap_points REAL DEFAULT 0,
  gap_interest_rate REAL DEFAULT 0.15,
  interest_type TEXT DEFAULT 'annual',

  -- Resale costs
  re_commissions REAL DEFAULT 0.05,
  resale_closing_costs REAL DEFAULT 0.015,

  -- Deal evaluation
  profit_min_percent REAL DEFAULT 0.10,
  profit_min_dollar REAL DEFAULT 35000,

  -- GAP equity
  gap_equity_share INTEGER DEFAULT 0,
  gap_equity_percent REAL DEFAULT 0,

  -- Rental inputs (for rental/BRRR)
  monthly_rent REAL,
  vacancy_rate REAL DEFAULT 0.08,
  property_management_fee REAL DEFAULT 0.10,
  monthly_insurance REAL DEFAULT 0,
  monthly_taxes REAL DEFAULT 0,
  monthly_hoa REAL DEFAULT 0,
  capex_reserve_percent REAL DEFAULT 0.05,
  maintenance_reserve_percent REAL DEFAULT 0.05,

  -- BRRR refinance inputs
  refinance_rate REAL DEFAULT 0.07,
  refinance_ltv REAL DEFAULT 0.75,
  refinance_term INTEGER DEFAULT 30,
  refinance_closing_costs REAL DEFAULT 0,

  -- Mortgage (rental)
  mortgage_rate REAL DEFAULT 0,
  mortgage_term INTEGER DEFAULT 30,
  down_payment_percent REAL DEFAULT 0.20,

  -- Projections
  annual_appreciation REAL DEFAULT 0.03,
  annual_rent_increase REAL DEFAULT 0.02,

  -- Computed results stored as JSON
  computed_results TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS renovation_items (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_cost REAL DEFAULT 0,
  actual_cost REAL,
  cost_per_sqft REAL,
  diy_or_contractor TEXT DEFAULT 'contractor',
  supplier TEXT,
  supplier_notes TEXT,
  cost_saving_tip TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  room_id TEXT,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  file_size INTEGER,
  tags TEXT,
  ai_analysis TEXT,
  ai_analyzed_at TEXT,
  checklist_items TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES properties(id),
  deal_id TEXT REFERENCES deals(id),
  source_type TEXT NOT NULL,
  source_name TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  asking_price REAL,
  notes TEXT,
  status TEXT DEFAULT 'new',
  follow_up_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_deals_property ON deals(property_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_renovation_items_deal ON renovation_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_photos_deal ON photos(deal_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source_type);
