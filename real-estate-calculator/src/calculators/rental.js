/**
 * Rental Calculator Engine
 * Calculates monthly cashflow, cap rate, cash-on-cash return, and projections
 */

function calculateRental(inputs) {
  const {
    purchasePrice,
    rehabBudget = 0,
    closingCosts = 0,
    // Rental income
    monthlyRent,
    vacancyRate = 0.08,         // 8% vacancy
    // Expenses
    propertyManagementFee = 0.10, // 10% of rent
    monthlyInsurance = 0,
    monthlyTaxes = 0,
    monthlyHoa = 0,
    // Reserves
    capExReservePercent = 0.05,   // 5% of rent
    maintenanceReservePercent = 0.05, // 5% of rent
    // Mortgage
    mortgageRate = 0,
    mortgageTerm = 30,            // years
    downPaymentPercent = 0.20,    // 20%
    // Projections
    annualAppreciation = 0.03,    // 3%
    annualRentIncrease = 0.02,    // 2%
  } = inputs;

  const totalInvestment = purchasePrice + rehabBudget + closingCosts;
  const downPayment = purchasePrice * downPaymentPercent;
  const loanAmount = purchasePrice - downPayment;
  const cashInvested = downPayment + rehabBudget + closingCosts;

  // Monthly mortgage payment (P&I)
  let monthlyMortgage = 0;
  if (loanAmount > 0 && mortgageRate > 0) {
    const monthlyRate = mortgageRate / 12;
    const numPayments = mortgageTerm * 12;
    monthlyMortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  // Monthly income
  const effectiveRent = monthlyRent * (1 - vacancyRate);

  // Monthly expenses
  const propertyManagement = monthlyRent * propertyManagementFee;
  const capExReserve = monthlyRent * capExReservePercent;
  const maintenanceReserve = monthlyRent * maintenanceReservePercent;
  const totalMonthlyExpenses = monthlyMortgage + monthlyInsurance + monthlyTaxes +
    monthlyHoa + propertyManagement + capExReserve + maintenanceReserve;

  // Cashflow
  const monthlyCashflow = effectiveRent - totalMonthlyExpenses;
  const annualCashflow = monthlyCashflow * 12;

  // Returns
  const cashOnCashReturn = cashInvested > 0 ? annualCashflow / cashInvested : 0;

  // Cap rate (NOI / purchase price)
  const annualNoi = (effectiveRent * 12) -
    ((monthlyInsurance + monthlyTaxes + monthlyHoa + propertyManagement + capExReserve + maintenanceReserve) * 12);
  const capRate = purchasePrice > 0 ? annualNoi / purchasePrice : 0;

  // Gross rent multiplier
  const grm = purchasePrice > 0 ? purchasePrice / (monthlyRent * 12) : 0;

  // Multi-year projections
  const projections = [];
  for (const year of [1, 2, 5, 10]) {
    const futureRent = monthlyRent * Math.pow(1 + annualRentIncrease, year);
    const futureValue = purchasePrice * Math.pow(1 + annualAppreciation, year);
    const futureEffectiveRent = futureRent * (1 - vacancyRate);
    const futurePM = futureRent * propertyManagementFee;
    const futureCapEx = futureRent * capExReservePercent;
    const futureMaint = futureRent * maintenanceReservePercent;
    const futureExpenses = monthlyMortgage + monthlyInsurance + monthlyTaxes +
      monthlyHoa + futurePM + futureCapEx + futureMaint;
    const futureMonthlyCashflow = futureEffectiveRent - futureExpenses;
    const equity = futureValue - loanAmount; // simplified, doesn't account for principal paydown

    projections.push({
      year,
      monthlyRent: round2(futureRent),
      monthlyCashflow: round2(futureMonthlyCashflow),
      annualCashflow: round2(futureMonthlyCashflow * 12),
      propertyValue: round2(futureValue),
      estimatedEquity: round2(equity),
    });
  }

  return {
    inputs: {
      purchasePrice,
      rehabBudget,
      closingCosts,
      monthlyRent,
      vacancyRate,
      propertyManagementFee,
      monthlyInsurance,
      monthlyTaxes,
      monthlyHoa,
      capExReservePercent,
      maintenanceReservePercent,
      mortgageRate,
      mortgageTerm,
      downPaymentPercent,
      annualAppreciation,
      annualRentIncrease,
    },
    computed: {
      totalInvestment: round2(totalInvestment),
      downPayment: round2(downPayment),
      loanAmount: round2(loanAmount),
      cashInvested: round2(cashInvested),
      monthlyMortgage: round2(monthlyMortgage),
      effectiveRent: round2(effectiveRent),
      propertyManagement: round2(propertyManagement),
      capExReserve: round2(capExReserve),
      maintenanceReserve: round2(maintenanceReserve),
      totalMonthlyExpenses: round2(totalMonthlyExpenses),
      monthlyCashflow: round2(monthlyCashflow),
      annualCashflow: round2(annualCashflow),
      cashOnCashReturn: round4(cashOnCashReturn),
      capRate: round4(capRate),
      annualNoi: round2(annualNoi),
      grm: round2(grm),
      projections,
    },
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

module.exports = { calculateRental };
