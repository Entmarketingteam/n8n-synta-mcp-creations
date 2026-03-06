const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Lookup property data via RapidAPI / Zillow
router.post('/lookup', async (req, res) => {
  const { address, city, state, zip } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return res.json({
      status: 'no_api_key',
      message: 'Set RAPIDAPI_KEY to enable Zillow property lookup. Manual input required.',
      manualFields: ['squareFootage', 'bedrooms', 'bathrooms', 'yearBuilt', 'lotSize', 'zestimate'],
    });
  }

  try {
    // Zillow search via RapidAPI
    const searchUrl = 'https://zillow-com1.p.rapidapi.com/propertyExtendedSearch';
    const params = new URLSearchParams({
      location: `${address}, ${city || ''} ${state || ''} ${zip || ''}`.trim(),
      status_type: 'ForSale',
    });

    const searchResponse = await fetch(`${searchUrl}?${params}`, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Zillow API returned ${searchResponse.status}`);
    }

    const data = await searchResponse.json();
    const property = data.props?.[0] || null;

    if (!property) {
      return res.json({ status: 'not_found', message: 'Property not found on Zillow' });
    }

    // Get detailed property info
    const detailUrl = 'https://zillow-com1.p.rapidapi.com/property';
    const detailResponse = await fetch(`${detailUrl}?zpid=${property.zpid}`, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
      },
    });

    let detail = {};
    if (detailResponse.ok) {
      detail = await detailResponse.json();
    }

    const result = {
      status: 'found',
      zpid: property.zpid,
      address: detail.address?.streetAddress || property.address,
      city: detail.address?.city || city,
      state: detail.address?.state || state,
      zip: detail.address?.zipcode || zip,
      squareFootage: detail.livingArea || property.livingArea,
      lotSize: detail.lotSize,
      bedrooms: detail.bedrooms || property.bedrooms,
      bathrooms: detail.bathrooms || property.bathrooms,
      yearBuilt: detail.yearBuilt,
      propertyType: detail.homeType,
      zestimate: detail.zestimate || property.price,
      rentZestimate: detail.rentZestimate,
      taxAssessedValue: detail.taxAssessedValue,
      lastSoldPrice: detail.lastSoldPrice,
      lastSoldDate: detail.dateSold,
      listingPrice: property.price,
      daysOnZillow: property.daysOnZillow,
      description: detail.description,
      photoUrls: (detail.photos || []).slice(0, 10).map(p => p.url || p),
    };

    // Optionally store enrichment data
    if (req.body.propertyId) {
      const db = getDb();
      db.prepare(`
        UPDATE properties SET
          zillow_zestimate = ?, zillow_rental_estimate = ?,
          square_footage = COALESCE(?, square_footage),
          year_built = COALESCE(?, year_built),
          bedrooms = COALESCE(?, bedrooms),
          bathrooms = COALESCE(?, bathrooms),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(result.zestimate, result.rentZestimate, result.squareFootage,
        result.yearBuilt, result.bedrooms, result.bathrooms, req.body.propertyId);
    }

    res.json(result);
  } catch (err) {
    console.error('Property lookup error:', err.message);
    res.status(500).json({ error: 'Property lookup failed', message: err.message });
  }
});

// Compare Zillow listing vs off-market
router.post('/compare-source', (req, res) => {
  const { zillowPrice, offMarketPrice, arv, rehabBudget, closingCosts } = req.body;

  const zillowScenario = {
    label: 'Zillow/MLS Listed',
    purchasePrice: zillowPrice,
    buyerAgentCommission: zillowPrice * 0.025, // 2.5% buyer agent
    inspectionContingency: true,
    estimatedTimeline: '30-45 days',
    totalAcquisition: zillowPrice + (zillowPrice * 0.025) + closingCosts,
    negotiationLeverage: 'Low - competing with other buyers',
  };

  const offMarketScenario = {
    label: 'Off-Market / Wholesale',
    purchasePrice: offMarketPrice,
    buyerAgentCommission: 0,
    inspectionContingency: false,
    estimatedTimeline: '7-14 days',
    totalAcquisition: offMarketPrice + closingCosts,
    negotiationLeverage: 'High - direct to seller, no competition',
  };

  const savings = zillowScenario.totalAcquisition - offMarketScenario.totalAcquisition;

  res.json({
    zillow: zillowScenario,
    offMarket: offMarketScenario,
    savings,
    recommendation: savings > 0
      ? `Off-market saves $${savings.toLocaleString()}. Worth pursuing if you trust your due diligence.`
      : `Zillow listing is ${Math.abs(savings).toLocaleString()} cheaper. Inspection contingency adds protection.`,
  });
});

module.exports = router;
