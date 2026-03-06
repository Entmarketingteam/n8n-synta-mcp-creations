/**
 * BRRR Calculator Engine
 * Buy, Rehab, Rent, Refinance, Repeat
 * Combines flip acquisition analysis with rental hold analysis
 */

const { calculateFlip } = require('./flip');
const { calculateRental } = require('./rental');

function calculateBrrr(inputs) {
  const {
    // Acquisition (same as flip)
    purchasePrice,
    rehabBudget,
    closingCosts,
    holdingCosts,
    arv,
    projectMonths,
    hmlLtvArv = 0.70,
    hmlPoints = 0.01,
    hmlInterestRate = 0.10,
    hmlAdminFees = 0,
    gapPoints = 0,
    gapInterestRate = 0.15,
    interestType = 'annual',
    contingencyPercent = 0,
    // Refinance terms
    refinanceRate = 0.07,     // 7% conventional
    refinanceLtv = 0.75,      // 75% LTV
    refinanceTerm = 30,       // 30 years
    refinanceClosingCosts = 0, // refinance closing costs
    // Rental income
    monthlyRent,
    vacancyRate = 0.08,
    propertyManagementFee = 0.10,
    monthlyInsurance = 0,
    monthlyTaxes = 0,
    monthlyHoa = 0,
    capExReservePercent = 0.05,
    maintenanceReservePercent = 0.05,
    annualAppreciation = 0.03,
    annualRentIncrease = 0.02,
  } = inputs;

  // Phase 1: Acquisition analysis (reuse flip calculator for costs)
  const flipAnalysis = calculateFlip({
    purchasePrice,
    rehabBudget,
    closingCosts,
    holdingCosts,
    arv,
    projectMonths,
    hmlLtvArv,
    hmlPoints,
    hmlInterestRate,
    hmlAdminFees,
    gapPoints,
    gapInterestRate,
    interestType,
    contingencyPercent,
    reCommissions: 0,
    resaleClosingCosts: 0,
    profitMinPercent: 0,
    profitMinDollar: 0,
  });

  const totalAcquisitionCost = flipAnalysis.computed.tpcPlusCost;

  // Phase 2: Refinance
  const newLoanAmount = arv * refinanceLtv;
  const cashBackFromRefi = newLoanAmount - refinanceClosingCosts;

  // Cash left in deal after refinance pays off HML + GAP
  const totalDebtPayoff = flipAnalysis.computed.hmlLoanAmount + flipAnalysis.computed.gapLoanAmount;
  const cashLeftInDeal = totalAcquisitionCost - cashBackFromRefi;
  const allMoneyOut = cashLeftInDeal <= 0;

  // Phase 3: Rental analysis (post-refinance)
  const rentalAnalysis = calculateRental({
    purchasePrice: arv, // property is now worth ARV after rehab
    rehabBudget: 0,     // already done
    closingCosts: 0,
    monthlyRent,
    vacancyRate,
    propertyManagementFee,
    monthlyInsurance,
    monthlyTaxes,
    monthlyHoa,
    capExReservePercent,
    maintenanceReservePercent,
    mortgageRate: refinanceRate,
    mortgageTerm: refinanceTerm,
    downPaymentPercent: 1 - refinanceLtv, // inverse of LTV
    annualAppreciation,
    annualRentIncrease,
  });

  // BRRR-specific returns
  const actualCashInvested = Math.max(0, cashLeftInDeal);
  const brrrCashOnCash = actualCashInvested > 0
    ? rentalAnalysis.computed.annualCashflow / actualCashInvested
    : Infinity; // infinite return if all money out

  return {
    inputs: {
      purchasePrice,
      rehabBudget,
      closingCosts,
      holdingCosts,
      arv,
      projectMonths,
      refinanceRate,
      refinanceLtv,
      refinanceTerm,
      refinanceClosingCosts,
      monthlyRent,
      vacancyRate,
      propertyManagementFee,
      monthlyInsurance,
      monthlyTaxes,
      monthlyHoa,
    },
    acquisition: {
      totalProjectCosts: flipAnalysis.computed.totalProjectCosts,
      hmlLoanAmount: flipAnalysis.computed.hmlLoanAmount,
      hmlTotalFees: flipAnalysis.computed.hmlTotalFees,
      downPayment: flipAnalysis.computed.downPayment,
      gapLoanAmount: flipAnalysis.computed.gapLoanAmount,
      gapTotalFees: flipAnalysis.computed.gapTotalFees,
      totalAcquisitionCost: round2(totalAcquisitionCost),
    },
    refinance: {
      arvAfterRehab: arv,
      refinanceLtv,
      newLoanAmount: round2(newLoanAmount),
      refinanceClosingCosts,
      cashBackFromRefi: round2(cashBackFromRefi),
      totalDebtPayoff: round2(totalDebtPayoff),
      cashLeftInDeal: round2(cashLeftInDeal),
      allMoneyOut,
    },
    rental: rentalAnalysis.computed,
    brrrMetrics: {
      actualCashInvested: round2(actualCashInvested),
      brrrCashOnCash: allMoneyOut ? 'INFINITE' : round4(brrrCashOnCash),
      monthlyCashflow: rentalAnalysis.computed.monthlyCashflow,
      annualCashflow: rentalAnalysis.computed.annualCashflow,
      isViable: rentalAnalysis.computed.monthlyCashflow > 0,
      verdict: rentalAnalysis.computed.monthlyCashflow > 0
        ? (allMoneyOut ? 'EXCELLENT - All money out + positive cashflow' : 'GOOD - Positive cashflow')
        : 'NEGATIVE CASHFLOW - Review numbers',
    },
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

module.exports = { calculateBrrr };
