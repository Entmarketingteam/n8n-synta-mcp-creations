const { describe, it } = require('node:test');
const assert = require('node:assert');
const { calculateBrrr } = require('../src/calculators/brrr');

describe('BRRR Calculator', () => {
  const baseBrrr = {
    purchasePrice: 120000,
    rehabBudget: 40000,
    closingCosts: 3000,
    holdingCosts: 2000,
    arv: 200000,
    projectMonths: 4,
    hmlLtvArv: 0.70,
    hmlPoints: 0.01,
    hmlInterestRate: 0.10,
    hmlAdminFees: 0,
    gapPoints: 0,
    gapInterestRate: 0.15,
    interestType: 'annual',
    contingencyPercent: 0,
    refinanceRate: 0.07,
    refinanceLtv: 0.75,
    refinanceTerm: 30,
    refinanceClosingCosts: 3000,
    monthlyRent: 1800,
    vacancyRate: 0.08,
    propertyManagementFee: 0.10,
    monthlyInsurance: 125,
    monthlyTaxes: 175,
    monthlyHoa: 0,
    capExReservePercent: 0.05,
    maintenanceReservePercent: 0.05,
    annualAppreciation: 0.03,
    annualRentIncrease: 0.02,
  };

  it('should calculate acquisition costs correctly', () => {
    const result = calculateBrrr(baseBrrr);
    // TPC = 120000 + 40000 + 3000 + 2000 = 165000
    assert.strictEqual(result.acquisition.totalProjectCosts, 165000);
  });

  it('should calculate HML loan amount correctly', () => {
    const result = calculateBrrr(baseBrrr);
    // 200000 * 0.70 = 140000
    assert.strictEqual(result.acquisition.hmlLoanAmount, 140000);
  });

  it('should calculate refinance loan amount correctly', () => {
    const result = calculateBrrr(baseBrrr);
    // 200000 * 0.75 = 150000
    assert.strictEqual(result.refinance.newLoanAmount, 150000);
  });

  it('should calculate cash back from refinance correctly', () => {
    const result = calculateBrrr(baseBrrr);
    // 150000 - 3000 closing = 147000
    assert.strictEqual(result.refinance.cashBackFromRefi, 147000);
  });

  it('should detect all money out scenario', () => {
    // With good numbers, cash back should exceed total cost
    const result = calculateBrrr(baseBrrr);
    // totalAcquisitionCost includes TPC + HML fees + GAP fees
    // If cashBackFromRefi > totalAcquisitionCost, all money out
    if (result.refinance.cashLeftInDeal <= 0) {
      assert.strictEqual(result.refinance.allMoneyOut, true);
      assert.strictEqual(result.brrrMetrics.brrrCashOnCash, 'INFINITE');
    } else {
      assert.strictEqual(result.refinance.allMoneyOut, false);
      assert.ok(typeof result.brrrMetrics.brrrCashOnCash === 'number');
    }
  });

  it('should include rental analysis after refinance', () => {
    const result = calculateBrrr(baseBrrr);
    assert.ok(result.rental.monthlyCashflow !== undefined);
    assert.ok(result.rental.annualCashflow !== undefined);
    assert.ok(result.rental.projections.length === 4);
  });

  it('should provide BRRR verdict', () => {
    const result = calculateBrrr(baseBrrr);
    assert.ok(result.brrrMetrics.verdict);
    assert.ok(typeof result.brrrMetrics.isViable === 'boolean');
  });

  it('should handle negative cashflow scenario', () => {
    const expensiveBrrr = {
      ...baseBrrr,
      purchasePrice: 300000,
      arv: 320000,
      monthlyRent: 1200,
    };
    const result = calculateBrrr(expensiveBrrr);
    if (result.rental.monthlyCashflow < 0) {
      assert.ok(result.brrrMetrics.verdict.includes('NEGATIVE'));
    }
  });
});
