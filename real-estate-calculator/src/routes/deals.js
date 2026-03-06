const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { calculateFlip } = require('../calculators/flip');
const { calculateRental } = require('../calculators/rental');
const { calculateBrrr } = require('../calculators/brrr');
const { generateScenarios } = require('../calculators/scenarios');
const { getWarnings } = require('../warnings');

// Create a new deal
router.post('/', (req, res) => {
  const db = getDb();
  const { property, deal } = req.body;

  // Create or find property
  let propertyId = property.id;
  if (!propertyId) {
    propertyId = uuidv4();
    db.prepare(`
      INSERT INTO properties (id, address, city, state, zip, county, square_footage, lot_size,
        bedrooms, bathrooms, year_built, property_type, source_type, source_group_name,
        source_contact_name, source_listing_url, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      propertyId, property.address, property.city, property.state, property.zip,
      property.county, property.squareFootage, property.lotSize, property.bedrooms,
      property.bathrooms, property.yearBuilt, property.propertyType || 'sfh',
      property.sourceType, property.sourceGroupName, property.sourceContactName,
      property.sourceListingUrl, property.notes
    );
  }

  // Create deal
  const dealId = uuidv4();
  const d = deal;
  db.prepare(`
    INSERT INTO deals (id, property_id, deal_type, purchase_price, rehab_budget, closing_costs,
      holding_costs, arv, project_months, contingency_percent, hml_ltv_arv, hml_points,
      hml_interest_rate, hml_admin_fees, gap_points, gap_interest_rate, interest_type,
      re_commissions, resale_closing_costs, profit_min_percent, profit_min_dollar,
      gap_equity_share, gap_equity_percent, monthly_rent, vacancy_rate, property_management_fee,
      monthly_insurance, monthly_taxes, monthly_hoa, capex_reserve_percent,
      maintenance_reserve_percent, refinance_rate, refinance_ltv, refinance_term,
      refinance_closing_costs, mortgage_rate, mortgage_term, down_payment_percent,
      annual_appreciation, annual_rent_increase)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    dealId, propertyId, d.dealType || 'flip', d.purchasePrice, d.rehabBudget || 0,
    d.closingCosts || 0, d.holdingCosts || 0, d.arv, d.projectMonths || 6,
    d.contingencyPercent || 0.10, d.hmlLtvArv || 0.70, d.hmlPoints || 0.01,
    d.hmlInterestRate || 0.10, d.hmlAdminFees || 0, d.gapPoints || 0,
    d.gapInterestRate || 0.15, d.interestType || 'annual', d.reCommissions || 0.05,
    d.resaleClosingCosts || 0.015, d.profitMinPercent || 0.10, d.profitMinDollar || 35000,
    d.gapEquityShare ? 1 : 0, d.gapEquityPercent || 0, d.monthlyRent,
    d.vacancyRate || 0.08, d.propertyManagementFee || 0.10, d.monthlyInsurance || 0,
    d.monthlyTaxes || 0, d.monthlyHoa || 0, d.capExReservePercent || 0.05,
    d.maintenanceReservePercent || 0.05, d.refinanceRate || 0.07, d.refinanceLtv || 0.75,
    d.refinanceTerm || 30, d.refinanceClosingCosts || 0, d.mortgageRate || 0,
    d.mortgageTerm || 30, d.downPaymentPercent || 0.20, d.annualAppreciation || 0.03,
    d.annualRentIncrease || 0.02
  );

  // Calculate and store results
  const results = runCalculation(d);
  db.prepare('UPDATE deals SET computed_results = ? WHERE id = ?')
    .run(JSON.stringify(results), dealId);

  // Get warnings
  const warnings = getWarnings({
    ...d,
    yearBuilt: property.yearBuilt,
    squareFootage: property.squareFootage,
    sourceType: property.sourceType,
    propertyType: property.propertyType,
  });

  res.json({
    id: dealId,
    propertyId,
    results,
    warnings,
  });
});

// Get deal by ID
router.get('/:id', (req, res) => {
  const db = getDb();
  const deal = db.prepare(`
    SELECT d.*, p.address, p.city, p.state, p.zip, p.square_footage, p.year_built,
           p.bedrooms, p.bathrooms, p.property_type, p.source_type, p.source_group_name,
           p.zillow_zestimate, p.zillow_rental_estimate
    FROM deals d
    JOIN properties p ON d.property_id = p.id
    WHERE d.id = ?
  `).get(req.params.id);

  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  deal.computed_results = deal.computed_results ? JSON.parse(deal.computed_results) : null;

  const warnings = getWarnings({
    purchasePrice: deal.purchase_price,
    rehabBudget: deal.rehab_budget,
    arv: deal.arv,
    projectMonths: deal.project_months,
    hmlInterestRate: deal.hml_interest_rate,
    gapInterestRate: deal.gap_interest_rate,
    reCommissions: deal.re_commissions,
    yearBuilt: deal.year_built,
    squareFootage: deal.square_footage,
    sourceType: deal.source_type,
    propertyType: deal.property_type,
    contingencyPercent: deal.contingency_percent,
  });

  res.json({ deal, warnings });
});

// Update deal
router.put('/:id', (req, res) => {
  const db = getDb();
  const { deal: d, property: p } = req.body;

  if (p) {
    const existing = db.prepare('SELECT property_id FROM deals WHERE id = ?').get(req.params.id);
    if (existing) {
      db.prepare(`
        UPDATE properties SET address = COALESCE(?, address), city = COALESCE(?, city),
        state = COALESCE(?, state), zip = COALESCE(?, zip), square_footage = COALESCE(?, square_footage),
        year_built = COALESCE(?, year_built), bedrooms = COALESCE(?, bedrooms),
        bathrooms = COALESCE(?, bathrooms), property_type = COALESCE(?, property_type),
        source_type = COALESCE(?, source_type), source_group_name = COALESCE(?, source_group_name),
        updated_at = datetime('now') WHERE id = ?
      `).run(p.address, p.city, p.state, p.zip, p.squareFootage, p.yearBuilt,
        p.bedrooms, p.bathrooms, p.propertyType, p.sourceType, p.sourceGroupName,
        existing.property_id);
    }
  }

  if (d) {
    const fields = [];
    const values = [];
    const mapping = {
      purchasePrice: 'purchase_price', rehabBudget: 'rehab_budget',
      closingCosts: 'closing_costs', holdingCosts: 'holding_costs',
      arv: 'arv', projectMonths: 'project_months',
      contingencyPercent: 'contingency_percent', hmlLtvArv: 'hml_ltv_arv',
      hmlPoints: 'hml_points', hmlInterestRate: 'hml_interest_rate',
      hmlAdminFees: 'hml_admin_fees', gapPoints: 'gap_points',
      gapInterestRate: 'gap_interest_rate', interestType: 'interest_type',
      reCommissions: 're_commissions', resaleClosingCosts: 'resale_closing_costs',
      profitMinPercent: 'profit_min_percent', profitMinDollar: 'profit_min_dollar',
      gapEquityShare: 'gap_equity_share', gapEquityPercent: 'gap_equity_percent',
      monthlyRent: 'monthly_rent', vacancyRate: 'vacancy_rate',
      propertyManagementFee: 'property_management_fee',
      monthlyInsurance: 'monthly_insurance', monthlyTaxes: 'monthly_taxes',
      monthlyHoa: 'monthly_hoa', dealType: 'deal_type', status: 'status',
    };

    for (const [key, col] of Object.entries(mapping)) {
      if (d[key] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(key === 'gapEquityShare' ? (d[key] ? 1 : 0) : d[key]);
      }
    }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(req.params.id);
      db.prepare(`UPDATE deals SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    // Recalculate
    const results = runCalculation(d);
    db.prepare('UPDATE deals SET computed_results = ? WHERE id = ?')
      .run(JSON.stringify(results), req.params.id);
  }

  res.json({ success: true });
});

// Delete deal
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// List all deals
router.get('/', (req, res) => {
  const db = getDb();
  const deals = db.prepare(`
    SELECT d.id, d.deal_type, d.status, d.purchase_price, d.arv, d.computed_results,
           p.address, p.city, p.state, p.source_type, d.created_at
    FROM deals d
    JOIN properties p ON d.property_id = p.id
    ORDER BY d.created_at DESC
  `).all();

  deals.forEach(d => {
    d.computed_results = d.computed_results ? JSON.parse(d.computed_results) : null;
  });

  res.json(deals);
});

// Run scenario analysis
router.post('/:id/scenarios', (req, res) => {
  const db = getDb();
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });

  const computed = deal.computed_results ? JSON.parse(deal.computed_results) : null;
  if (!computed) return res.status(400).json({ error: 'Run calculation first' });

  const tpcPlusCost = computed.computed?.tpcPlusCost || computed.acquisition?.totalAcquisitionCost || 0;
  const scenarios = generateScenarios(
    deal.arv,
    tpcPlusCost,
    deal.re_commissions,
    deal.resale_closing_costs,
    req.body.options || {}
  );

  res.json({ scenarios });
});

function runCalculation(d) {
  const dealType = d.dealType || 'flip';

  if (dealType === 'flip') {
    return calculateFlip(d);
  } else if (dealType === 'rental') {
    return calculateRental(d);
  } else if (dealType === 'brrr') {
    return calculateBrrr(d);
  }
  return calculateFlip(d);
}

module.exports = router;
