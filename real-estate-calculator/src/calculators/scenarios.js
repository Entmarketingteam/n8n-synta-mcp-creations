/**
 * Multi-price scenario generator
 * Generates a table of sale prices and corresponding profits
 */

function generateScenarios(arv, tpcPlusCost, reCommissions, resaleClosingCosts, options = {}) {
  const {
    stepSize = 5000,
    stepsBelow = 4,
    stepsAbove = 4,
  } = options;

  const scenarios = [];
  const totalCostPercent = reCommissions + resaleClosingCosts;

  for (let i = -stepsBelow; i <= stepsAbove; i++) {
    const salePrice = arv + (i * stepSize);
    const closingCosts = salePrice * totalCostPercent;
    const netProceeds = salePrice - closingCosts;
    const profit = netProceeds - tpcPlusCost;

    scenarios.push({
      salePrice,
      closingCosts: round2(closingCosts),
      netProceeds: round2(netProceeds),
      profit: round2(profit),
      profitPercent: salePrice > 0 ? round4(profit / salePrice) : 0,
      isProfitable: profit > 0,
    });
  }

  return scenarios;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

module.exports = { generateScenarios };
