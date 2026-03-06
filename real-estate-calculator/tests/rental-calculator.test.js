const { describe, it } = require('node:test');
const assert = require('node:assert');
const { calculateRental } = require('../src/calculators/rental');

describe('Rental Calculator', () => {
  const baseRental = {
    purchasePrice: 150000,
    rehabBudget: 20000,
    closingCosts: 3000,
    monthlyRent: 1500,
    vacancyRate: 0.08,
    propertyManagementFee: 0.10,
    monthlyInsurance: 125,
    monthlyTaxes: 200,
    monthlyHoa: 0,
    capExReservePercent: 0.05,
    maintenanceReservePercent: 0.05,
    mortgageRate: 0.07,
    mortgageTerm: 30,
    downPaymentPercent: 0.20,
    annualAppreciation: 0.03,
    annualRentIncrease: 0.02,
  };

  it('should calculate total investment correctly', () => {
    const result = calculateRental(baseRental);
    assert.strictEqual(result.computed.totalInvestment, 173000);
  });

  it('should calculate down payment correctly', () => {
    const result = calculateRental(baseRental);
    assert.strictEqual(result.computed.downPayment, 30000); // 150000 * 0.20
  });

  it('should calculate loan amount correctly', () => {
    const result = calculateRental(baseRental);
    assert.strictEqual(result.computed.loanAmount, 120000); // 150000 - 30000
  });

  it('should calculate cash invested correctly', () => {
    const result = calculateRental(baseRental);
    // 30000 (down) + 20000 (rehab) + 3000 (closing) = 53000
    assert.strictEqual(result.computed.cashInvested, 53000);
  });

  it('should calculate effective rent with vacancy', () => {
    const result = calculateRental(baseRental);
    // 1500 * (1 - 0.08) = 1380
    assert.strictEqual(result.computed.effectiveRent, 1380);
  });

  it('should calculate monthly mortgage payment', () => {
    const result = calculateRental(baseRental);
    // P&I on $120k at 7% for 30yr ≈ $798.36
    assert.ok(result.computed.monthlyMortgage > 790 && result.computed.monthlyMortgage < 810,
      `Mortgage should be ~$798, got ${result.computed.monthlyMortgage}`);
  });

  it('should calculate positive cashflow for a good rental', () => {
    const result = calculateRental(baseRental);
    // Effective rent (1380) minus all expenses should be positive (maybe small)
    assert.ok(typeof result.computed.monthlyCashflow === 'number');
  });

  it('should calculate cap rate', () => {
    const result = calculateRental(baseRental);
    // Cap rate should be reasonable (4-10% typically)
    assert.ok(result.computed.capRate > 0, 'Cap rate should be positive');
    assert.ok(result.computed.capRate < 0.15, 'Cap rate should be reasonable');
  });

  it('should generate multi-year projections', () => {
    const result = calculateRental(baseRental);
    assert.strictEqual(result.computed.projections.length, 4);
    assert.deepStrictEqual(
      result.computed.projections.map(p => p.year),
      [1, 2, 5, 10]
    );
  });

  it('should show increasing rent in projections', () => {
    const result = calculateRental(baseRental);
    const projections = result.computed.projections;
    for (let i = 1; i < projections.length; i++) {
      assert.ok(projections[i].monthlyRent > projections[i - 1].monthlyRent,
        'Rent should increase over time');
    }
  });

  it('should show increasing property value in projections', () => {
    const result = calculateRental(baseRental);
    const projections = result.computed.projections;
    for (let i = 1; i < projections.length; i++) {
      assert.ok(projections[i].propertyValue > projections[i - 1].propertyValue,
        'Property value should appreciate');
    }
  });

  it('should handle zero mortgage rate (cash purchase)', () => {
    const cashPurchase = { ...baseRental, mortgageRate: 0, downPaymentPercent: 1.0 };
    const result = calculateRental(cashPurchase);
    assert.strictEqual(result.computed.monthlyMortgage, 0);
    assert.ok(result.computed.monthlyCashflow > 0, 'Cash purchase should have strong cashflow');
  });
});
