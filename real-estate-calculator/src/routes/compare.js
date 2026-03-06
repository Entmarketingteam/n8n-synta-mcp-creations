const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Compare multiple deals side-by-side
router.post('/', (req, res) => {
  const db = getDb();
  const { dealIds } = req.body;

  if (!dealIds || !Array.isArray(dealIds) || dealIds.length < 2) {
    return res.status(400).json({ error: 'Provide at least 2 deal IDs to compare' });
  }

  const placeholders = dealIds.map(() => '?').join(', ');
  const deals = db.prepare(`
    SELECT d.*, p.address, p.city, p.state, p.zip, p.square_footage, p.year_built,
           p.bedrooms, p.bathrooms, p.property_type, p.source_type
    FROM deals d
    JOIN properties p ON d.property_id = p.id
    WHERE d.id IN (${placeholders})
  `).all(...dealIds);

  const comparison = deals.map(d => {
    const results = d.computed_results ? JSON.parse(d.computed_results) : null;
    return {
      id: d.id,
      address: `${d.address}, ${d.city || ''} ${d.state || ''}`.trim(),
      dealType: d.deal_type,
      purchasePrice: d.purchase_price,
      arv: d.arv,
      rehabBudget: d.rehab_budget,
      totalProjectCosts: results?.computed?.totalProjectCosts || null,
      projection: results?.computed?.projection || null,
      dealVerdict: results?.computed?.dealVerdict || null,
      monthlyCashflow: results?.computed?.monthlyCashflow || results?.rental?.monthlyCashflow || null,
      cashOnCash: results?.computed?.cashOnCashReturn || results?.brrrMetrics?.brrrCashOnCash || null,
      squareFootage: d.square_footage,
      yearBuilt: d.year_built,
      sourceType: d.source_type,
      pricePerSqft: d.square_footage ? Math.round(d.purchase_price / d.square_footage) : null,
    };
  });

  // Rank deals
  comparison.sort((a, b) => {
    if (a.dealType === 'flip') return (b.projection || 0) - (a.projection || 0);
    return (b.monthlyCashflow || 0) - (a.monthlyCashflow || 0);
  });

  res.json({ comparison });
});

module.exports = router;
