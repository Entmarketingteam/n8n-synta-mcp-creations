import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalculator } from '../hooks/useCalculator';
import { usePropertyLookup } from '../hooks/usePropertyLookup';
import WarningBadge from '../components/WarningBadge';
import DealVerdict from '../components/DealVerdict';
import ScenarioTable from '../components/ScenarioTable';

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => ((n || 0) * 100).toFixed(1) + '%';

const SOURCE_TYPES = [
  { value: 'mls', label: 'MLS Listing' },
  { value: 'zillow', label: 'Zillow' },
  { value: 'offmarket', label: 'Off-Market' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'facebook_group', label: 'Facebook Group' },
  { value: 'driving', label: 'Driving for Dollars' },
  { value: 'other', label: 'Other' },
];

// Field-level warnings (simplified client-side version)
function getFieldWarnings(field, inputs) {
  const warnings = [];
  if (field === 'arv') {
    warnings.push({ level: 'info', message: 'Have you pulled 3+ recent comps within 0.5mi? ARV is the #1 mistake.' });
  }
  if (field === 'rehabBudget' && inputs.yearBuilt && inputs.yearBuilt < 1980) {
    warnings.push({ level: 'warning', message: 'Pre-1980: Check for lead paint, asbestos, knob-and-tube wiring.' });
  }
  if (field === 'rehabBudget' && inputs.yearBuilt && inputs.yearBuilt < 1950) {
    warnings.push({ level: 'critical', message: 'Pre-1950: Foundation issues common. Budget extra $5-15k.' });
  }
  if (field === 'hmlInterestRate' && inputs.hmlInterestRate > 0.12) {
    warnings.push({ level: 'warning', message: 'HML rate above 12% is high. Shop around — 9-12% is typical.' });
  }
  if (field === 'projectMonths' && inputs.projectMonths < 4) {
    warnings.push({ level: 'warning', message: 'Under 4 months is aggressive. Permits and contractors often delay.' });
  }
  if (field === 'holdingCosts') {
    warnings.push({ level: 'info', message: 'Include: insurance, taxes, utilities, lawn, HOA, loan payments.' });
  }
  if (field === 'contingencyPercent' && (inputs.sourceType === 'offmarket' || inputs.sourceType === 'wholesaler')) {
    warnings.push({ level: 'critical', message: 'Off-market: Budget 15-20% contingency. Hidden issues common.' });
  }
  return warnings;
}

function NumberInput({ label, field, inputs, updateField, prefix = '$', isPercent = false, isYellow = false, showWarnings = false }) {
  const value = inputs[field] || 0;
  const displayValue = isPercent ? (value * 100) : value;
  const warnings = showWarnings ? getFieldWarnings(field, inputs) : [];

  return (
    <div>
      <label className="input-label">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-2 text-gray-400 text-sm">{prefix}</span>}
        <input
          type="number"
          step={isPercent ? '0.1' : '1'}
          value={displayValue || ''}
          onChange={(e) => {
            const v = parseFloat(e.target.value) || 0;
            updateField(field, isPercent ? v / 100 : v);
          }}
          className={`input-field ${prefix ? 'pl-7' : ''} ${isYellow ? 'input-yellow' : ''}`}
        />
        {isPercent && <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>}
      </div>
      {warnings.length > 0 && <WarningBadge warnings={warnings} />}
    </div>
  );
}

export default function DealForm() {
  const navigate = useNavigate();
  const { inputs, updateField, results } = useCalculator();
  const { lookup, loading: lookupLoading } = usePropertyLookup();
  const [property, setProperty] = useState({ address: '', city: '', state: '', zip: '', yearBuilt: null, squareFootage: null, sourceType: 'mls', sourceGroupName: '' });
  const [saving, setSaving] = useState(false);

  const handleLookup = async () => {
    const data = await lookup(property.address, property.city, property.state, property.zip);
    if (data?.status === 'found') {
      setProperty(prev => ({
        ...prev,
        squareFootage: data.squareFootage || prev.squareFootage,
        yearBuilt: data.yearBuilt || prev.yearBuilt,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
      }));
      if (data.zestimate) updateField('arv', data.zestimate);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property, deal: { ...inputs } }),
      });
      const data = await res.json();
      if (data.id) navigate(`/deals/${data.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">New Deal Analysis</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Deal'}
        </button>
      </div>

      {/* Deal Type Tabs */}
      <div className="flex gap-4 border-b">
        {['flip', 'rental', 'brrr'].map(type => (
          <button
            key={type}
            onClick={() => updateField('dealType', type)}
            className={`pb-2 px-1 text-sm uppercase tracking-wide ${
              inputs.dealType === type ? 'tab-active' : 'tab-inactive'
            }`}
          >
            {type === 'brrr' ? 'BRRR' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Info */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Property Information</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="input-label">Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={property.address}
                    onChange={e => setProperty(p => ({ ...p, address: e.target.value }))}
                    className="input-field input-yellow flex-1"
                    placeholder="123 Main St"
                  />
                  <button onClick={handleLookup} disabled={lookupLoading} className="btn-secondary text-sm whitespace-nowrap">
                    {lookupLoading ? 'Looking up...' : 'Zillow Lookup'}
                  </button>
                </div>
              </div>
              <div>
                <label className="input-label">City</label>
                <input type="text" value={property.city} onChange={e => setProperty(p => ({ ...p, city: e.target.value }))} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="input-label">State</label>
                  <input type="text" value={property.state} onChange={e => setProperty(p => ({ ...p, state: e.target.value }))} className="input-field" maxLength={2} />
                </div>
                <div>
                  <label className="input-label">ZIP</label>
                  <input type="text" value={property.zip} onChange={e => setProperty(p => ({ ...p, zip: e.target.value }))} className="input-field" maxLength={5} />
                </div>
              </div>
              <div>
                <label className="input-label">Year Built</label>
                <input type="number" value={property.yearBuilt || ''} onChange={e => setProperty(p => ({ ...p, yearBuilt: parseInt(e.target.value) || null }))} className="input-field" />
              </div>
              <div>
                <label className="input-label">Sq Ft</label>
                <input type="number" value={property.squareFootage || ''} onChange={e => setProperty(p => ({ ...p, squareFootage: parseInt(e.target.value) || null }))} className="input-field" />
              </div>
              <div>
                <label className="input-label">Lead Source</label>
                <select value={property.sourceType} onChange={e => setProperty(p => ({ ...p, sourceType: e.target.value }))} className="input-field">
                  {SOURCE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {property.sourceType === 'facebook_group' && (
                <div>
                  <label className="input-label">Group Name</label>
                  <input type="text" value={property.sourceGroupName} onChange={e => setProperty(p => ({ ...p, sourceGroupName: e.target.value }))} className="input-field" placeholder="e.g. Louisville RE Investors" />
                </div>
              )}
            </div>
          </div>

          {/* Core Numbers */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Deal Numbers <span className="text-sm font-normal text-gray-500">(edit yellow fields)</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <NumberInput label="ARV (After Repair Value)" field="arv" inputs={inputs} updateField={updateField} isYellow showWarnings />
              <NumberInput label="Purchase Price" field="purchasePrice" inputs={inputs} updateField={updateField} isYellow />
              <NumberInput label="Rehab Budget" field="rehabBudget" inputs={inputs} updateField={updateField} isYellow showWarnings />
              <NumberInput label="Closing Costs" field="closingCosts" inputs={inputs} updateField={updateField} isYellow />
              <NumberInput label="Holding Costs" field="holdingCosts" inputs={inputs} updateField={updateField} isYellow showWarnings />
              <div>
                <label className="input-label">Project Months</label>
                <input type="number" value={inputs.projectMonths} onChange={e => updateField('projectMonths', parseInt(e.target.value) || 6)} className="input-field input-yellow" min={1} max={36} />
                {inputs.projectMonths < 4 && <WarningBadge warnings={getFieldWarnings('projectMonths', inputs)} />}
              </div>
              <NumberInput label="Contingency" field="contingencyPercent" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow showWarnings />
            </div>

            {/* Computed: Total Project Costs */}
            <div className="mt-4 p-3 bg-gray-100 rounded-md">
              <div className="flex justify-between">
                <span className="font-medium">Total Project Costs</span>
                <span className="font-bold text-lg">{fmt(results.totalProjectCosts)}</span>
              </div>
            </div>
          </div>

          {/* HML Section */}
          {(inputs.dealType === 'flip' || inputs.dealType === 'brrr') && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Hard Money Loan (HML)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <NumberInput label="HML LTV (ARV)" field="hmlLtvArv" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <NumberInput label="HML Points" field="hmlPoints" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <NumberInput label="HML Interest Rate" field="hmlInterestRate" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow showWarnings />
                <NumberInput label="HML Admin Fees" field="hmlAdminFees" inputs={inputs} updateField={updateField} isYellow />
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>HML Loan Amount</span><span className="font-medium">{fmt(results.hmlLoanAmount)}</span></div>
                <div className="flex justify-between"><span>HML Points Cost</span><span>{fmt(results.hmlPointsCost)}</span></div>
                <div className="flex justify-between"><span>HML Total Interest</span><span>{fmt(results.hmlTotalInterest)}</span></div>
                <div className="flex justify-between font-medium"><span>HML Total Fees</span><span>{fmt(results.hmlTotalFees)}</span></div>
                <div className="flex justify-between font-bold mt-2 pt-2 border-t"><span>Down Payment</span><span>{fmt(results.downPayment)}</span></div>
              </div>
            </div>
          )}

          {/* GAP Lending */}
          {(inputs.dealType === 'flip' || inputs.dealType === 'brrr') && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">GAP Lending</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <NumberInput label="GAP Points" field="gapPoints" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <NumberInput label="GAP Interest Rate" field="gapInterestRate" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <div>
                  <label className="input-label">Interest Type</label>
                  <select value={inputs.interestType} onChange={e => updateField('interestType', e.target.value)} className="input-field input-yellow">
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between font-bold"><span>GAP Loan Amount</span><span>{fmt(results.gapLoanAmount)}</span></div>
                <div className="flex justify-between"><span>GAP Interest</span><span>{fmt(results.gapInterest)}</span></div>
              </div>
            </div>
          )}

          {/* Resale / Commissions (flip) */}
          {inputs.dealType === 'flip' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Resale Costs & Evaluation</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <NumberInput label="RE Commissions" field="reCommissions" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <NumberInput label="Resale Closing Costs" field="resaleClosingCosts" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <NumberInput label="Profit Min %" field="profitMinPercent" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <NumberInput label="Profit Min $" field="profitMinDollar" inputs={inputs} updateField={updateField} isYellow />
              </div>
            </div>
          )}

          {/* Rental Inputs */}
          {(inputs.dealType === 'rental' || inputs.dealType === 'brrr') && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Rental Income & Expenses</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <NumberInput label="Monthly Rent" field="monthlyRent" inputs={inputs} updateField={updateField} isYellow />
                <NumberInput label="Vacancy Rate" field="vacancyRate" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <NumberInput label="Property Mgmt Fee" field="propertyManagementFee" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <NumberInput label="Monthly Insurance" field="monthlyInsurance" inputs={inputs} updateField={updateField} isYellow />
                <NumberInput label="Monthly Taxes" field="monthlyTaxes" inputs={inputs} updateField={updateField} isYellow />
                <NumberInput label="Monthly HOA" field="monthlyHoa" inputs={inputs} updateField={updateField} isYellow />
                <NumberInput label="CapEx Reserve %" field="capExReservePercent" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <NumberInput label="Maintenance %" field="maintenanceReservePercent" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <NumberInput label="Mortgage Rate" field="mortgageRate" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
                <div>
                  <label className="input-label">Mortgage Term (years)</label>
                  <input type="number" value={inputs.mortgageTerm} onChange={e => updateField('mortgageTerm', parseInt(e.target.value) || 30)} className="input-field input-yellow" />
                </div>
                <NumberInput label="Down Payment %" field="downPaymentPercent" inputs={inputs} updateField={updateField} prefix="" isPercent isYellow />
              </div>
            </div>
          )}
        </div>

        {/* Right: Results Sidebar */}
        <div className="space-y-4">
          <DealVerdict results={results} />

          {inputs.dealType === 'flip' && results.scenarios && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">Resale Scenarios</h3>
              <ScenarioTable scenarios={results.scenarios} arv={inputs.arv} />
            </div>
          )}

          {/* Quick Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              {results.totalProjectCosts != null && (
                <div className="flex justify-between">
                  <span>Total Project Costs</span><span className="font-medium">{fmt(results.totalProjectCosts)}</span>
                </div>
              )}
              {results.hmlLoanAmount != null && (
                <div className="flex justify-between">
                  <span>HML Loan</span><span className="font-medium">{fmt(results.hmlLoanAmount)}</span>
                </div>
              )}
              {results.downPayment != null && (
                <div className="flex justify-between">
                  <span>Down Payment</span><span className="font-medium">{fmt(results.downPayment)}</span>
                </div>
              )}
              {results.tpcPlusCost != null && (
                <div className="flex justify-between">
                  <span>All-In Cost</span><span className="font-bold">{fmt(results.tpcPlusCost)}</span>
                </div>
              )}
              {results.asPercentOfArv != null && (
                <div className="flex justify-between">
                  <span>% of ARV</span><span className="font-medium">{pct(results.asPercentOfArv)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
