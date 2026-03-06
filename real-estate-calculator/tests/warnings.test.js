const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getWarnings, getWarningsForField } = require('../src/warnings');

describe('Warnings System', () => {
  it('should return ARV warning for all properties', () => {
    const warnings = getWarnings({});
    const arvWarning = warnings.find(w => w.field === 'arv');
    assert.ok(arvWarning, 'ARV warning should always appear');
    assert.ok(arvWarning.message.includes('comps'));
  });

  it('should warn about lead paint for pre-1980 properties', () => {
    const warnings = getWarnings({ yearBuilt: 1975 });
    const leadWarning = warnings.find(w => w.message.includes('lead paint'));
    assert.ok(leadWarning, 'Should warn about lead paint for 1975 property');
  });

  it('should warn about foundation for pre-1950 properties', () => {
    const warnings = getWarnings({ yearBuilt: 1940 });
    const foundationWarning = warnings.find(w => w.message.includes('Foundation issues'));
    assert.ok(foundationWarning, 'Should warn about foundation for 1940 property');
    assert.strictEqual(foundationWarning.level, 'critical');
  });

  it('should warn about high HML rates', () => {
    const warnings = getWarnings({ hmlInterestRate: 0.14 });
    const rateWarning = warnings.find(w => w.message.includes('HML rate'));
    assert.ok(rateWarning, 'Should warn about 14% HML rate');
  });

  it('should warn about flooring for large properties', () => {
    const warnings = getWarnings({ squareFootage: 2000 });
    const flooringWarning = warnings.find(w => w.message.includes('Flooring'));
    assert.ok(flooringWarning, 'Should warn about flooring for 2000 sqft property');
  });

  it('should warn about off-market contingency', () => {
    const warnings = getWarnings({ sourceType: 'offmarket' });
    const offMarketWarning = warnings.find(w => w.message.includes('Off-market'));
    assert.ok(offMarketWarning, 'Should warn about off-market contingency');
    assert.strictEqual(offMarketWarning.level, 'critical');
  });

  it('should return warnings for specific field', () => {
    const warnings = getWarningsForField('rehabBudget', { yearBuilt: 1960 });
    assert.ok(warnings.length > 0, 'Should have rehab warnings for 1960 property');
    assert.ok(warnings.every(w => typeof w.level === 'string'));
    assert.ok(warnings.every(w => typeof w.message === 'string'));
  });

  it('should warn about short project timelines', () => {
    const warnings = getWarnings({ projectMonths: 3 });
    const timeWarning = warnings.find(w => w.message.includes('aggressive'));
    assert.ok(timeWarning, 'Should warn about 3-month timeline');
  });

  it('should warn about high GAP rates', () => {
    const warnings = getWarnings({ gapInterestRate: 0.20 });
    const gapWarning = warnings.find(w => w.message.includes('GAP interest'));
    assert.ok(gapWarning, 'Should warn about 20% GAP rate');
    assert.strictEqual(gapWarning.level, 'critical');
  });
});
