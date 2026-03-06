/**
 * Flip Calculator Engine
 * All formulas match the spreadsheet from theflipsecrets.com
 */

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function calculateFlip(inputs) {
  const {
    purchasePrice,
    rehabBudget,
    closingCosts,
    holdingCosts,
    arv,
    projectMonths,
    // HML (Hard Money Loan)
    hmlLtvArv = 0.70,       // 70% LTV of ARV
    hmlPoints = 0.01,        // 1%
    hmlInterestRate = 0.10,  // 10%
    hmlAdminFees = 0,
    // GAP Lending
    gapPoints = 0,
    gapInterestRate = 0.15,  // 15%
    interestType = 'annual', // 'annual' or 'monthly'
    // Resale costs
    reCommissions = 0.05,    // 5%
    resaleClosingCosts = 0.015, // 1.5%
    // Deal evaluation
    profitMinPercent = 0.10, // 10%
    profitMinDollar = 35000,
    // GAP equity
    gapEquityShare = false,
    gapEquityPercent = 0,
    // Contingency
    contingencyPercent = 0,
  } = inputs;

  // Total Project Costs
  const contingencyAmount = rehabBudget * contingencyPercent;
  const totalProjectCosts = purchasePrice + rehabBudget + contingencyAmount + closingCosts + holdingCosts;

  // HML Calculations
  const hmlLoanAmount = arv * hmlLtvArv;
  const hmlPointsCost = hmlLoanAmount * hmlPoints;
  const hmlTotalInterest = hmlLoanAmount * hmlInterestRate * (projectMonths / 12);
  const hmlTotalFees = hmlPointsCost + hmlTotalInterest + hmlAdminFees;

  // Down Payment (what you need out of pocket beyond HML)
  const downPayment = Math.max(0, totalProjectCosts - hmlLoanAmount);

  // GAP Lending (covers the down payment gap)
  const gapLoanAmount = downPayment;
  let gapInterest;
  if (interestType === 'annual') {
    gapInterest = gapLoanAmount * gapInterestRate * (projectMonths / 12);
  } else {
    gapInterest = gapLoanAmount * gapInterestRate * projectMonths;
  }
  const gapPointsCost = gapLoanAmount * gapPoints;
  const gapTotalFees = gapPointsCost + gapInterest;

  // Total cost including all fees
  const tpcPlusCost = totalProjectCosts + hmlTotalFees + gapTotalFees;
  const asPercentOfArv = arv > 0 ? tpcPlusCost / arv : 0;

  // Resale scenario at ARV
  const totalResaleCosts = arv * (reCommissions + resaleClosingCosts);
  const projection = arv - totalResaleCosts - tpcPlusCost;

  // Deal evaluation
  const meetsMinDollar = projection >= profitMinDollar;
  const meetsMinPercent = arv > 0 ? (projection / arv) >= profitMinPercent : false;
  const isDeal = meetsMinDollar && meetsMinPercent;

  // GAP equity calculations
  let gapReturn = null;
  let gapRoi = null;
  if (gapEquityShare && gapEquityPercent > 0) {
    gapReturn = projection * gapEquityPercent;
    gapRoi = gapLoanAmount > 0 ? (gapReturn + gapTotalFees) / gapLoanAmount : 0;
  }

  return {
    // Inputs echoed back
    inputs: {
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
      reCommissions,
      resaleClosingCosts,
      profitMinPercent,
      profitMinDollar,
      gapEquityShare,
      gapEquityPercent,
      contingencyPercent,
    },
    // Computed values
    computed: {
      contingencyAmount: round2(contingencyAmount),
      totalProjectCosts: round2(totalProjectCosts),
      hmlLoanAmount: round2(hmlLoanAmount),
      hmlPointsCost: round2(hmlPointsCost),
      hmlTotalInterest: round2(hmlTotalInterest),
      hmlTotalFees: round2(hmlTotalFees),
      downPayment: round2(downPayment),
      gapLoanAmount: round2(gapLoanAmount),
      gapPointsCost: round2(gapPointsCost),
      gapInterest: round2(gapInterest),
      gapTotalFees: round2(gapTotalFees),
      tpcPlusCost: round2(tpcPlusCost),
      asPercentOfArv: round4(asPercentOfArv),
      totalResaleCosts: round2(totalResaleCosts),
      projection: round2(projection),
      isDeal,
      dealVerdict: isDeal ? 'YES' : 'NOPE',
      gapReturn: gapReturn !== null ? round2(gapReturn) : null,
      gapRoi: gapRoi !== null ? round4(gapRoi) : null,
    },
  };
}

module.exports = { calculateFlip };
