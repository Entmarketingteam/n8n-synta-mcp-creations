const costData = require('../../data/cost-multipliers.json');

function getCostMultiplier(metro) {
  return costData.metros[metro] || costData.metros.national_average;
}

function adjustCostForLocation(baseCost, metro, isLaborIntensive = false) {
  const data = getCostMultiplier(metro);
  const multiplier = isLaborIntensive ? data.laborMultiplier : data.multiplier;
  return Math.round(baseCost * multiplier * 100) / 100;
}

function getBrrrViability(metro) {
  const data = getCostMultiplier(metro);
  return {
    metro: data.label,
    brrrScore: data.brrrScore,
    rentToPriceRatio: data.rentToPriceRatio,
    description: getScoreDescription(data.brrrScore),
  };
}

function getScoreDescription(score) {
  if (score <= 3) return 'Low viability - High prices, low rent-to-price ratio. Flips may work better.';
  if (score <= 6) return 'Moderate - Possible with strong deal sourcing and value-add.';
  if (score <= 9) return 'High viability - Strong rent-to-price ratios. Great BRRR market.';
  return 'Exceptional - Rare combination of low prices and strong rents.';
}

function getAllMetros() {
  return Object.entries(costData.metros).map(([key, data]) => ({
    key,
    ...data,
  }));
}

module.exports = { getCostMultiplier, adjustCostForLocation, getBrrrViability, getAllMetros };
