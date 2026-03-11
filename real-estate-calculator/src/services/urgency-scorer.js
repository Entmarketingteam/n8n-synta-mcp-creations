/**
 * Urgency Scorer — calculates a composite "distress score" for each property
 * based on how many distress signals it has and their severity.
 *
 * Scoring Rules:
 *   - Water Shut-off:        +50
 *   - Lis Pendens:           +40
 *   - Probate:               +50
 *   - Tax Lien:              +35
 *   - Nuisance Lien:         +30
 *   - Code Violation:        +20
 *   - Expired Permit:        +25
 *   - Sale Cancellation:     +45
 *   - Absentee Owner:        +15
 *   - Burnout (fire damage): +55
 *
 * Bonuses:
 *   - Equity > 50%:  +20
 *   - Equity > 70%:  +30  (replaces +20)
 *   - Owner age > 60: +10  (if available)
 *   - List stack count ≥ 2: +25
 *   - List stack count ≥ 3: +50  (replaces +25)
 */

const SIGNAL_POINTS = {
  water_shutoff: 50,
  lis_pendens: 40,
  probate: 50,
  tax_lien: 35,
  nuisance_lien: 30,
  code_violation: 20,
  expired_permit: 25,
  sale_cancellation: 45,
  absentee_owner: 15,
  burnout: 55,
};

function scoreProperty(property, signals) {
  let score = 0;

  // Sum signal points
  for (const sig of signals) {
    const base = SIGNAL_POINTS[sig.signal_type] || 10;
    const severityMultiplier = (sig.severity || 1) / 3; // normalized 0.33–1.67
    score += Math.round(base * Math.max(severityMultiplier, 0.5));
  }

  // Equity bonus
  const equity = property.estimated_equity_percent || 0;
  if (equity >= 70) score += 30;
  else if (equity >= 50) score += 20;

  // List-stack bonus
  const stackCount = signals.length;
  if (stackCount >= 3) score += 50;
  else if (stackCount >= 2) score += 25;

  return Math.min(score, 200); // cap at 200
}

function getUrgencyLabel(score) {
  if (score >= 120) return 'critical';
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function getUrgencyColor(score) {
  if (score >= 120) return 'red';
  if (score >= 80) return 'orange';
  if (score >= 50) return 'yellow';
  return 'gray';
}

module.exports = { scoreProperty, getUrgencyLabel, getUrgencyColor, SIGNAL_POINTS };
