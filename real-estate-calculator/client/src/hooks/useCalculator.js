import { useState, useCallback, useMemo } from 'react';

// Client-side calculator that mirrors the server logic for real-time updates
function calculateFlipClient(inputs) {
  const {
    purchasePrice = 0, rehabBudget = 0, closingCosts = 0, holdingCosts = 0,
    arv = 0, projectMonths = 6, hmlLtvArv = 0.70, hmlPoints = 0.01,
    hmlInterestRate = 0.10, hmlAdminFees = 0, gapPoints = 0,
    gapInterestRate = 0.15, interestType = 'annual', reCommissions = 0.05,
    resaleClosingCosts = 0.015, profitMinPercent = 0.10, profitMinDollar = 35000,
    gapEquityShare = false, gapEquityPercent = 0, contingencyPercent = 0,
  } = inputs;

  const r2 = n => Math.round(n * 100) / 100;

  const contingencyAmount = rehabBudget * contingencyPercent;
  const totalProjectCosts = purchasePrice + rehabBudget + contingencyAmount + closingCosts + holdingCosts;
  const hmlLoanAmount = arv * hmlLtvArv;
  const hmlPointsCost = hmlLoanAmount * hmlPoints;
  const hmlTotalInterest = hmlLoanAmount * hmlInterestRate * (projectMonths / 12);
  const hmlTotalFees = hmlPointsCost + hmlTotalInterest + hmlAdminFees;
  const downPayment = Math.max(0, totalProjectCosts - hmlLoanAmount);
  const gapLoanAmount = downPayment;
  const gapInterest = interestType === 'annual'
    ? gapLoanAmount * gapInterestRate * (projectMonths / 12)
    : gapLoanAmount * gapInterestRate * projectMonths;
  const gapPointsCost = gapLoanAmount * gapPoints;
  const gapTotalFees = gapPointsCost + gapInterest;
  const tpcPlusCost = totalProjectCosts + hmlTotalFees + gapTotalFees;
  const asPercentOfArv = arv > 0 ? tpcPlusCost / arv : 0;
  const totalResaleCosts = arv * (reCommissions + resaleClosingCosts);
  const projection = arv - totalResaleCosts - tpcPlusCost;
  const isDeal = projection >= profitMinDollar && (arv > 0 ? (projection / arv) >= profitMinPercent : false);

  // Scenarios
  const scenarios = [];
  for (let i = -4; i <= 4; i++) {
    const salePrice = arv + (i * 5000);
    const cc = salePrice * (reCommissions + resaleClosingCosts);
    const profit = salePrice - cc - tpcPlusCost;
    scenarios.push({ salePrice, closingCosts: r2(cc), profit: r2(profit), isProfitable: profit > 0 });
  }

  return {
    totalProjectCosts: r2(totalProjectCosts), hmlLoanAmount: r2(hmlLoanAmount),
    hmlPointsCost: r2(hmlPointsCost), hmlTotalInterest: r2(hmlTotalInterest),
    hmlTotalFees: r2(hmlTotalFees), downPayment: r2(downPayment),
    gapLoanAmount: r2(gapLoanAmount), gapInterest: r2(gapInterest),
    gapTotalFees: r2(gapTotalFees), tpcPlusCost: r2(tpcPlusCost),
    asPercentOfArv: Math.round(asPercentOfArv * 10000) / 10000,
    projection: r2(projection), isDeal, dealVerdict: isDeal ? 'YES' : 'NOPE',
    contingencyAmount: r2(contingencyAmount), scenarios,
  };
}

function calculateRentalClient(inputs) {
  const {
    purchasePrice = 0, rehabBudget = 0, closingCosts = 0,
    monthlyRent = 0, vacancyRate = 0.08, propertyManagementFee = 0.10,
    monthlyInsurance = 0, monthlyTaxes = 0, monthlyHoa = 0,
    capExReservePercent = 0.05, maintenanceReservePercent = 0.05,
    mortgageRate = 0, mortgageTerm = 30, downPaymentPercent = 0.20,
  } = inputs;

  const r2 = n => Math.round(n * 100) / 100;
  const downPayment = purchasePrice * downPaymentPercent;
  const loanAmount = purchasePrice - downPayment;
  const cashInvested = downPayment + rehabBudget + closingCosts;

  let monthlyMortgage = 0;
  if (loanAmount > 0 && mortgageRate > 0) {
    const mr = mortgageRate / 12;
    const np = mortgageTerm * 12;
    monthlyMortgage = loanAmount * (mr * Math.pow(1 + mr, np)) / (Math.pow(1 + mr, np) - 1);
  }

  const effectiveRent = monthlyRent * (1 - vacancyRate);
  const pm = monthlyRent * propertyManagementFee;
  const capEx = monthlyRent * capExReservePercent;
  const maint = monthlyRent * maintenanceReservePercent;
  const totalExpenses = monthlyMortgage + monthlyInsurance + monthlyTaxes + monthlyHoa + pm + capEx + maint;
  const monthlyCashflow = effectiveRent - totalExpenses;
  const annualCashflow = monthlyCashflow * 12;
  const cashOnCash = cashInvested > 0 ? annualCashflow / cashInvested : 0;

  return {
    downPayment: r2(downPayment), loanAmount: r2(loanAmount), cashInvested: r2(cashInvested),
    monthlyMortgage: r2(monthlyMortgage), effectiveRent: r2(effectiveRent),
    totalExpenses: r2(totalExpenses), monthlyCashflow: r2(monthlyCashflow),
    annualCashflow: r2(annualCashflow), cashOnCash: Math.round(cashOnCash * 10000) / 10000,
  };
}

export function useCalculator() {
  const [inputs, setInputs] = useState({
    dealType: 'flip',
    purchasePrice: 0, rehabBudget: 0, closingCosts: 0, holdingCosts: 0,
    arv: 0, projectMonths: 6, hmlLtvArv: 0.70, hmlPoints: 0.01,
    hmlInterestRate: 0.10, hmlAdminFees: 0, gapPoints: 0, gapInterestRate: 0.15,
    interestType: 'annual', reCommissions: 0.05, resaleClosingCosts: 0.015,
    profitMinPercent: 0.10, profitMinDollar: 35000, contingencyPercent: 0.10,
    monthlyRent: 0, vacancyRate: 0.08, propertyManagementFee: 0.10,
    monthlyInsurance: 0, monthlyTaxes: 0, monthlyHoa: 0,
    capExReservePercent: 0.05, maintenanceReservePercent: 0.05,
    mortgageRate: 0.07, mortgageTerm: 30, downPaymentPercent: 0.20,
  });

  const updateField = useCallback((field, value) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  }, []);

  const results = useMemo(() => {
    if (inputs.dealType === 'flip') return calculateFlipClient(inputs);
    if (inputs.dealType === 'rental') return calculateRentalClient(inputs);
    // BRRR combines both
    return { flip: calculateFlipClient(inputs), rental: calculateRentalClient(inputs) };
  }, [inputs]);

  return { inputs, setInputs, updateField, results };
}
