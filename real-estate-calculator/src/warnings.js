/**
 * Smart Warnings System
 * Context-aware warnings and reminders displayed near relevant inputs
 */

const warningRules = [
  // ARV
  {
    field: 'arv',
    check: () => true,
    level: 'info',
    message: 'Have you pulled 3+ recent comps within 0.5mi? ARV is the #1 mistake new investors make.',
  },
  // Property age warnings
  {
    field: 'rehabBudget',
    check: (inputs) => inputs.yearBuilt && inputs.yearBuilt < 1950,
    level: 'critical',
    message: 'Pre-1950 property: Foundation issues common. Budget extra $5-15k. Check for knob-and-tube wiring, cast iron pipes, and balloon framing.',
  },
  {
    field: 'rehabBudget',
    check: (inputs) => inputs.yearBuilt && inputs.yearBuilt >= 1950 && inputs.yearBuilt < 1980,
    level: 'warning',
    message: 'Pre-1980 property: Check for lead paint, asbestos in popcorn ceilings/floor tiles, and outdated electrical.',
  },
  {
    field: 'rehabBudget',
    check: (inputs) => inputs.yearBuilt && inputs.yearBuilt >= 1980 && inputs.yearBuilt < 2000,
    level: 'info',
    message: 'Check for polybutylene pipes (common 1978-1995) — insurers often refuse coverage. Budget $5-10k for repipe.',
  },
  // Holding costs
  {
    field: 'holdingCosts',
    check: () => true,
    level: 'info',
    message: 'Include: insurance, property taxes, utilities, lawn care/snow removal, HOA if applicable, and loan payments during hold period.',
  },
  // Flooring
  {
    field: 'rehabBudget',
    check: (inputs) => inputs.squareFootage && inputs.squareFootage > 1500,
    level: 'warning',
    message: 'Flooring for 1500+ sqft is often 2-3x what newbies estimate. Budget $3-8/sqft installed. Check subfloor condition — water damage underneath means extra $1-3/sqft.',
  },
  // Pest
  {
    field: 'rehabBudget',
    check: () => true,
    level: 'warning',
    message: 'Always get a termite/pest inspection ($50-100). Termite damage can cost $10k+. Look for mud tubes on foundation and soft/hollow-sounding wood.',
  },
  // Property lines
  {
    field: 'purchasePrice',
    check: () => true,
    level: 'info',
    message: 'Verify the survey. Fences DO NOT equal property lines. Encroachments can kill a deal or require costly legal action.',
  },
  // Septic
  {
    field: 'holdingCosts',
    check: (inputs) => inputs.propertyType !== 'condo' && (!inputs.city || inputs.zip),
    level: 'warning',
    message: 'If property has a septic system: inspection is mandatory. Septic replacement = $15-30k. Check for soggy spots in yard.',
  },
  // Foundation
  {
    field: 'rehabBudget',
    check: () => true,
    level: 'warning',
    message: 'Foundation red flags: stair-step cracks in brick, bowing basement walls, uneven floors, doors that don\'t close. Budget $5-25k if issues found.',
  },
  // Roof
  {
    field: 'rehabBudget',
    check: (inputs) => inputs.yearBuilt && (new Date().getFullYear() - inputs.yearBuilt) > 15,
    level: 'warning',
    message: 'Roof likely 15+ years old. Budget $8-15k for replacement. Check for multiple layers of shingles — tear-off adds $2-4k.',
  },
  // HVAC
  {
    field: 'rehabBudget',
    check: (inputs) => inputs.yearBuilt && (new Date().getFullYear() - inputs.yearBuilt) > 12,
    level: 'info',
    message: 'HVAC may be 12+ years old (15-20yr lifespan). Budget $5-10k for replacement. Check age on the unit data plate.',
  },
  // Electrical
  {
    field: 'rehabBudget',
    check: (inputs) => inputs.yearBuilt && inputs.yearBuilt < 1990,
    level: 'warning',
    message: 'Check electrical panel: < 200 amp or Federal Pacific/Zinsco panel = mandatory upgrade ($2-5k). Also check for ungrounded outlets.',
  },
  // Off-market
  {
    field: 'contingencyPercent',
    check: (inputs) => inputs.sourceType === 'offmarket' || inputs.sourceType === 'wholesaler',
    level: 'critical',
    message: 'Off-market/wholesale deal: No seller disclosures? Budget 15-20% contingency. Hidden issues are common.',
  },
  // HML rate
  {
    field: 'hmlInterestRate',
    check: (inputs) => inputs.hmlInterestRate && inputs.hmlInterestRate > 0.12,
    level: 'warning',
    message: 'HML rate above 12% is high. Average HML rates are 9-12%. Shop around — check local REI groups for lender recommendations.',
  },
  // Commissions
  {
    field: 'reCommissions',
    check: (inputs) => inputs.reCommissions && inputs.reCommissions > 0.06,
    level: 'info',
    message: 'RE commissions above 6%? Negotiate or consider flat-fee MLS listing to save 1-3%.',
  },
  // Project months
  {
    field: 'projectMonths',
    check: (inputs) => inputs.projectMonths && inputs.projectMonths < 4,
    level: 'warning',
    message: 'Under 4 months is aggressive. Permit delays, contractor availability, and inspections often extend timelines. Budget 1-2 extra months.',
  },
  // GAP lending
  {
    field: 'gapInterestRate',
    check: (inputs) => inputs.gapInterestRate && inputs.gapInterestRate > 0.18,
    level: 'critical',
    message: 'GAP interest above 18% eats into profits fast. Consider partners, private money, or HELOC alternatives.',
  },
  // Water heater
  {
    field: 'rehabBudget',
    check: (inputs) => inputs.yearBuilt && (new Date().getFullYear() - inputs.yearBuilt) > 10,
    level: 'info',
    message: 'Water heater lifespan is 8-12 years. Budget $1-2k for replacement if old. Check for rust and leaks at base.',
  },
  // Windows
  {
    field: 'rehabBudget',
    check: (inputs) => inputs.yearBuilt && inputs.yearBuilt < 1995,
    level: 'info',
    message: 'Old single-pane windows? Budget $300-700 per window for replacement. Buyers/appraisers notice this.',
  },
];

function getWarnings(inputs) {
  return warningRules
    .filter(rule => rule.check(inputs))
    .map(rule => ({
      field: rule.field,
      level: rule.level,
      message: rule.message,
    }));
}

function getWarningsForField(field, inputs) {
  return warningRules
    .filter(rule => rule.field === field && rule.check(inputs))
    .map(rule => ({
      level: rule.level,
      message: rule.message,
    }));
}

module.exports = { getWarnings, getWarningsForField, warningRules };
