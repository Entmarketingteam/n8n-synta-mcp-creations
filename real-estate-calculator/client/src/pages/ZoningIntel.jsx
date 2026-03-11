import { useState, useEffect } from 'react';

const COUNTIES = ['fayette', 'scott', 'oldham'];
const TARGET_USES = [
  { id: 'recovery_residence', label: 'Recovery Residence' },
  { id: 'residential_care', label: 'Residential Care Facility' },
  { id: 'treatment_center', label: 'Treatment Center' },
  { id: 'group_home', label: 'Group Home' },
];
const FILING_TYPES = [
  { id: 'cup', label: 'Conditional Use Permit' },
  { id: 'variance', label: 'Variance' },
  { id: 'reasonable_accommodation', label: 'Reasonable Accommodation' },
  { id: 'building_permit', label: 'Building Permit (Change of Use)' },
  { id: 'recovery_license', label: 'Recovery Residence License' },
];

export default function ZoningIntel() {
  const [records, setRecords] = useState([]);
  const [zoningRules, setZoningRules] = useState(null);
  const [countyConfigs, setCountyConfigs] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCounty, setFilterCounty] = useState('');
  const [newRecord, setNewRecord] = useState({
    county: 'fayette', address: '', currentZoning: '', targetUse: 'recovery_residence',
    filingType: 'cup', filingEntity: '', hearingDate: '', notes: '', estimatedInvestment: 0,
  });

  useEffect(() => {
    loadRecords();
    fetch('/api/distressed/config/zoning-rules').then(r => r.json()).then(setZoningRules);
    fetch('/api/distressed/config/counties').then(r => r.json()).then(setCountyConfigs);
  }, [filterCounty]);

  const loadRecords = async () => {
    const params = filterCounty ? `?county=${filterCounty}` : '';
    const res = await fetch(`/api/distressed/zoning${params}`);
    setRecords(await res.json());
  };

  const addRecord = async () => {
    await fetch('/api/distressed/zoning', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    });
    setShowAdd(false);
    setNewRecord({ county: 'fayette', address: '', currentZoning: '', targetUse: 'recovery_residence', filingType: 'cup', filingEntity: '', hearingDate: '', notes: '', estimatedInvestment: 0 });
    loadRecords();
  };

  const updateStatus = async (id, status) => {
    await fetch(`/api/distressed/zoning/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadRecords();
  };

  const deleteRecord = async (id) => {
    await fetch(`/api/distressed/zoning/${id}`, { method: 'DELETE' });
    loadRecords();
  };

  const statusColor = (s) => {
    if (s === 'approved') return 'bg-green-100 text-green-800';
    if (s === 'denied') return 'bg-red-100 text-red-800';
    if (s === 'withdrawn') return 'bg-gray-100 text-gray-600';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zoning Intelligence</h1>
          <p className="text-sm text-gray-500">Recovery facilities, CUPs, variances - KY Trio</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          {showAdd ? 'Cancel' : '+ Add Filing'}
        </button>
      </div>

      {/* County Zoning Rules Reference */}
      {zoningRules && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COUNTIES.map(county => {
            const rules = zoningRules[county];
            if (!rules) return null;
            return (
              <div key={county} className="card">
                <h3 className="font-semibold capitalize text-lg">{county} County</h3>
                <div className="mt-2 space-y-1 text-sm">
                  <div>
                    <span className="text-gray-500">Best Zones:</span>{' '}
                    {Array.isArray(rules.allowedZones) ? rules.allowedZones.join(', ') : rules.allowedZones}
                  </div>
                  <div>
                    <span className="text-gray-500">CUP Required:</span>{' '}
                    <span className={rules.requiresCup ? 'text-red-600' : 'text-green-600'}>{rules.requiresCup ? 'Yes' : 'No'}</span>
                  </div>
                  {rules.requiresRecoveryLicense && (
                    <div><span className="text-gray-500">Recovery License:</span> ${rules.licenseFee}/yr</div>
                  )}
                  {rules.ordinanceRef && <div><span className="text-gray-500">Ordinance:</span> {rules.ordinanceRef}</div>}
                  {rules.largeTractMinAcres && <div><span className="text-gray-500">Min Acres:</span> {rules.largeTractMinAcres}</div>}
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">{rules.notes}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison Table */}
      <div className="card overflow-x-auto">
        <h3 className="font-semibold mb-3">Zoning Barrier Comparison</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-2">County</th>
              <th className="py-2 px-2">Difficulty</th>
              <th className="py-2 px-2">Best Zones</th>
              <th className="py-2 px-2">Key Filing to Track</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2 font-medium">Fayette</td>
              <td className="py-2 px-2"><span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">High</span></td>
              <td className="py-2 px-2">R-3, B-1, P-1</td>
              <td className="py-2 px-2">Recovery Residence License / Board of Adj.</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2 font-medium">Scott</td>
              <td className="py-2 px-2"><span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">Medium</span></td>
              <td className="py-2 px-2">A-1R, R-2</td>
              <td className="py-2 px-2">Conditional Use Permits (CUP)</td>
            </tr>
            <tr>
              <td className="py-2 px-2 font-medium">Oldham</td>
              <td className="py-2 px-2"><span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Low</span></td>
              <td className="py-2 px-2">Any Residential</td>
              <td className="py-2 px-2">Building Permit (Change of Use)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <select value={filterCounty} onChange={e => setFilterCounty(e.target.value)} className="input-field w-auto">
          <option value="">All Counties</option>
          {COUNTIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <span className="text-sm text-gray-500">{records.length} filings</span>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="card border-2 border-blue-200">
          <h2 className="text-lg font-semibold mb-3">Add Zoning Filing</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="input-label">County</label>
              <select value={newRecord.county} onChange={e => setNewRecord(r => ({ ...r, county: e.target.value }))} className="input-field">
                {COUNTIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Address</label>
              <input value={newRecord.address} onChange={e => setNewRecord(r => ({ ...r, address: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="input-label">Current Zoning</label>
              <input value={newRecord.currentZoning} onChange={e => setNewRecord(r => ({ ...r, currentZoning: e.target.value }))} className="input-field" placeholder="R-3, A-1R..." />
            </div>
            <div>
              <label className="input-label">Target Use</label>
              <select value={newRecord.targetUse} onChange={e => setNewRecord(r => ({ ...r, targetUse: e.target.value }))} className="input-field">
                {TARGET_USES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Filing Type</label>
              <select value={newRecord.filingType} onChange={e => setNewRecord(r => ({ ...r, filingType: e.target.value }))} className="input-field">
                {FILING_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Filing Entity (LLC/Person)</label>
              <input value={newRecord.filingEntity} onChange={e => setNewRecord(r => ({ ...r, filingEntity: e.target.value }))} className="input-field" placeholder="Bluegrass Recovery Holdings LLC" />
            </div>
            <div>
              <label className="input-label">Hearing Date</label>
              <input type="date" value={newRecord.hearingDate} onChange={e => setNewRecord(r => ({ ...r, hearingDate: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="input-label">Est. Investment</label>
              <input type="number" value={newRecord.estimatedInvestment || ''} onChange={e => setNewRecord(r => ({ ...r, estimatedInvestment: parseFloat(e.target.value) || 0 }))} className="input-field" />
            </div>
            <div>
              <label className="input-label">Notes</label>
              <input value={newRecord.notes} onChange={e => setNewRecord(r => ({ ...r, notes: e.target.value }))} className="input-field" />
            </div>
          </div>
          <button onClick={addRecord} className="btn-primary mt-3">Save Filing</button>
        </div>
      )}

      {/* Records */}
      <div className="space-y-2">
        {records.length === 0 && (
          <div className="card text-center text-gray-500 py-8">
            No zoning filings tracked yet. Add filings from BOA agendas, planning commission calendars, or permit records.
          </div>
        )}
        {records.map(r => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{r.address || 'No address'}</div>
                <div className="text-sm text-gray-500 capitalize">{r.county} County | Zone: {r.current_zoning || 'Unknown'}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${statusColor(r.status)}`}>{r.status}</span>
                <button onClick={() => deleteRecord(r.id)} className="text-xs text-red-400 hover:text-red-600">x</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{FILING_TYPES.find(t => t.id === r.filing_type)?.label || r.filing_type}</span>
              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{TARGET_USES.find(t => t.id === r.target_use)?.label || r.target_use}</span>
              {r.filing_entity && <span className="text-gray-500">Entity: {r.filing_entity}</span>}
              {r.hearing_date && <span className="text-gray-500">Hearing: {r.hearing_date}</span>}
              {r.estimated_investment > 0 && <span className="text-green-600">Est. ${r.estimated_investment.toLocaleString()}</span>}
            </div>
            {r.notes && <div className="text-xs text-gray-500 mt-1">{r.notes}</div>}
            <div className="flex gap-1 mt-2">
              {['pending', 'approved', 'denied', 'withdrawn'].map(s => (
                <button key={s} onClick={() => updateStatus(r.id, s)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${r.status === s ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
