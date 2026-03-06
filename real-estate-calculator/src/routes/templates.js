const express = require('express');
const router = express.Router();
const renovationTemplates = require('../../data/renovation-templates.json');
const costMultipliers = require('../../data/cost-multipliers.json');
const walkthroughChecklist = require('../../data/walkthrough-checklist.json');

// Get renovation templates
router.get('/renovation', (req, res) => {
  const templates = {};
  for (const [key, value] of Object.entries(renovationTemplates)) {
    if (key !== 'categories') {
      templates[key] = {
        name: value.name,
        description: value.description,
        estimatedCostPerSqft: value.estimatedCostPerSqft,
        itemCount: value.items?.length || 0,
      };
    }
  }
  res.json({ templates, categories: renovationTemplates.categories });
});

// Get renovation template details
router.get('/renovation/:key', (req, res) => {
  const template = renovationTemplates[req.params.key];
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

// Get cost multipliers by metro
router.get('/cost-multipliers', (req, res) => {
  res.json(costMultipliers);
});

// Get walkthrough checklist
router.get('/walkthrough-checklist', (req, res) => {
  res.json(walkthroughChecklist);
});

// Get cost-cutting tips
router.get('/cost-tips', (req, res) => {
  res.json({
    tips: [
      {
        category: 'kitchen',
        tips: [
          { tip: 'Paint existing cabinets instead of replacing — saves $3-8k', savings: '$3,000 - $8,000' },
          { tip: 'Use butcher block or laminate countertops instead of granite', savings: '$2,000 - $5,000' },
          { tip: 'Buy scratch-and-dent appliances from Lowe\'s/Home Depot clearance', savings: '$500 - $2,000' },
          { tip: 'Peel-and-stick backsplash vs tile installation', savings: '$500 - $1,500' },
        ],
      },
      {
        category: 'bathroom',
        tips: [
          { tip: 'Reglaze tub instead of replacing ($300 vs $3,000)', savings: '$2,500' },
          { tip: 'Use a tub/shower insert instead of full tile', savings: '$1,000 - $3,000' },
          { tip: 'Stock vanity from Home Depot/IKEA vs custom', savings: '$500 - $2,000' },
        ],
      },
      {
        category: 'flooring',
        tips: [
          { tip: 'LVP (Luxury Vinyl Plank) is cheapest quality option — $2-4/sqft vs $6-12 hardwood', savings: '$2,000 - $10,000' },
          { tip: 'Buy from Floor & Decor, LL Flooring, or Costco for best prices', savings: '20-40%' },
          { tip: 'Install yourself if you have time — saves $1-3/sqft labor', savings: '$1,500 - $5,000' },
          { tip: 'Check Facebook Marketplace for leftover/surplus flooring', savings: '50-70%' },
        ],
      },
      {
        category: 'windows_doors',
        tips: [
          { tip: 'Interior hollow-core doors from Home Depot ($30-50 each vs $100+ solid)', savings: '$500 - $1,500' },
          { tip: 'Buy door hardware in bulk packs (Defiant, Kwikset contractor packs)', savings: '$200 - $500' },
          { tip: 'Habitat ReStore for used doors and windows at 50-75% off', savings: '50-75%' },
        ],
      },
      {
        category: 'paint',
        tips: [
          { tip: 'One color throughout (reduces paint cost and painter time)', savings: '$500 - $1,500' },
          { tip: 'Buy mis-tint paint from Home Depot/Lowe\'s ($5-10/gallon vs $30-50)', savings: '70-80%' },
          { tip: 'Rent a paint sprayer for large areas vs brush/roller', savings: 'Time + better finish' },
        ],
      },
      {
        category: 'general',
        tips: [
          { tip: 'Habitat for Humanity ReStore — cabinets, doors, fixtures, hardware at 50-90% off', savings: '50-90%' },
          { tip: 'Facebook Marketplace / Craigslist for materials, fixtures, and appliances', savings: '40-70%' },
          { tip: 'Wholesale supply houses (not retail) for plumbing and electrical', savings: '20-40%' },
          { tip: 'Negotiate contractor rates for multiple projects / repeat business', savings: '10-20%' },
          { tip: 'Do demo yourself — saves $2-5k on gut rehabs', savings: '$2,000 - $5,000' },
          { tip: 'Time your purchase: appliances on sale during holidays (Black Friday, Memorial Day)', savings: '20-40%' },
          { tip: 'Use contractor-grade fixtures vs designer (guests won\'t notice)', savings: '30-50%' },
        ],
      },
    ],
  });
});

module.exports = router;
