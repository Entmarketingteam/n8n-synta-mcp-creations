import { useState, useEffect } from 'react';

const COUNTIES = ['fayette', 'scott', 'oldham'];
const STATUSES = ['new', 'contacted', 'negotiating', 'under_contract', 'dead'];
const SIGNAL_TYPES = [
  { id: 'lis_pendens', label: 'Lis Pendens', color: 'bg-red-100 text-red-800' },
  { id: 'probate', label: 'Probate', color: 'bg-purple-100 text-purple-800' },
  { id: 'tax_lien', label: 'Tax Lien', color: 'bg-orange-100 text-orange-800' },
  { id: 'water_shutoff', label: 'Water Shut-off', color: 'bg-blue-100 text-blue-800' },
  { id: 'nuisance_lien', label: 'Nuisance Lien', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'code_violation', label: 'Code Violation', color: 'bg-amber-100 text-amber-800' },
  { id: 'expired_permit', label: 'Expired Permit', color: 'bg-teal-100 text-teal-800' },
  { id: 'sale_cancellation', label: 'Sale Cancel', color: 'bg-pink-100 text-pink-800' },
  { id: 'absentee_owner', label: 'Absentee Owner', color: 'bg-gray-100 text-gray-800' },
  { id: 'burnout', label: 'Fire Damage', color: 'bg-red-200 text-red-900' },
];

function urgencyBadge(score) {
  if (score >= 120) return { label: 'CRITICAL', cls: 'bg-red-600 text-white' };
  if (score >= 80) return { label: 'HIGH', cls: 'bg-orange-500 text-white' };
  if (score >= 50) return { label: 'MEDIUM', cls: 'bg-yellow-400 text-gray-900' };
  return { label: 'LOW', cls: 'bg-gray-200 text-gray-600' };
}

export default function DistressedFinder() {
  const [properties, setProperties] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({ county: '', minUrgency: '', minStack: '' });
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSignal, setShowSignal] = useState(false);
  const [newProp, setNewProp] = useState({ address: '', city: '', county: 'fayette', zip: '', ownerName: '', notes: '' });
  const [newSignal, setNewSignal] = useState({ signalType: 'lis_pendens', source: 'manual', description: '', severity: 3 });

  useEffect(() => { loadProperties(); loadAnalytics(); }, [filters]);

  const loadProperties = async () => {
    const params = new URLSearchParams();
    if (filters.county) params.set('county', filters.county);
    if (filters.minUrgency) params.set('minUrgency', filters.minUrgency);
    if (filters.minStack) params.set('minStack', filters.minStack);
    const res = await fetch(`/api/distressed/properties?${params}`);
    setProperties(await res.json());
  };

  const loadAnalytics = async () => {
    const res = await fetch('/api/distressed/analytics');
    setAnalytics(await res.json());
  };

  const loadDetail = async (id) => {
    const res = await fetch(`/api/distressed/properties/${id}`);
    setSelected(await res.json());
  };

  const addProperty = async () => {
    await fetch('/api/distressed/properties', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProp),
    });
    setNewProp({ address: '', city: '', county: 'fayette', zip: '', ownerName: '', notes: '' });
    setShowAdd(false);
    loadProperties();
    loadAnalytics();
  };

  const addSignal = async () => {
    if (!selected) return;
    await fetch(`/api/distressed/properties/${selected.id}/signals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSignal),
    });
    setNewSignal({ signalType: 'lis_pendens', source: 'manual', description: '', severity: 3 });
    setShowSignal(false);
    loadDetail(selected.id);
    loadProperties();
    loadAnalytics();
  };

  const updateStatus = async (id, status) => {
    await fetch(`/api/distressed/properties/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadProperties();
    if (selected?.id === id) loadDetail(id);
  };

  const deleteProperty = async (id) => {
    await fetch(`/api/distressed/properties/${id}`, { method: 'DELETE' });
    if (selected?.id === id) setSelected(null);
    loadProperties();
    loadAnalytics();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Distressed Property Finder</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
            {showAdd ? 'Cancel' : '+ Add Property'}
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {analytics.byCounty?.map(c => (
            <div key={c.county} className="card text-center">
              <div className="text-xs text-gray-500 uppercase">{c.county}</div>
              <div className="text-2xl font-bold">{c.total}</div>
              <div className="text-xs">
                <span className="text-red-600">{c.high_urgency} urgent</span>
                {' / '}
                <span className="text-blue-600">{c.stacked} stacked</span>
              </div>
            </div>
          ))}
          <div className="card text-center">
            <div className="text-xs text-gray-500">Total Properties</div>
            <div className="text-2xl font-bold">{properties.length}</div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-gray-500">Top Leads (50+)</div>
            <div className="text-2xl font-bold text-red-600">{analytics.topLeads?.length || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="input-label">County</label>
            <select value={filters.county} onChange={e => setFilters(f => ({ ...f, county: e.target.value }))} className="input-field">
              <option value="">All Counties</option>
              {COUNTIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Min Urgency</label>
            <select value={filters.minUrgency} onChange={e => setFilters(f => ({ ...f, minUrgency: e.target.value }))} className="input-field">
              <option value="">Any</option>
              <option value="50">50+ (Medium)</option>
              <option value="80">80+ (High)</option>
              <option value="120">120+ (Critical)</option>
            </select>
          </div>
          <div>
            <label className="input-label">Min List Stack</label>
            <select value={filters.minStack} onChange={e => setFilters(f => ({ ...f, minStack: e.target.value }))} className="input-field">
              <option value="">Any</option>
              <option value="2">2+ lists</option>
              <option value="3">3+ lists</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Property Form */}
      {showAdd && (
        <div className="card border-2 border-blue-200">
          <h2 className="text-lg font-semibold mb-3">Add Distressed Property</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="input-label">Address</label>
              <input value={newProp.address} onChange={e => setNewProp(p => ({ ...p, address: e.target.value }))} className="input-field" placeholder="123 Main St" />
            </div>
            <div>
              <label className="input-label">City</label>
              <input value={newProp.city} onChange={e => setNewProp(p => ({ ...p, city: e.target.value }))} className="input-field" placeholder="Lexington" />
            </div>
            <div>
              <label className="input-label">County</label>
              <select value={newProp.county} onChange={e => setNewProp(p => ({ ...p, county: e.target.value }))} className="input-field">
                {COUNTIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">ZIP</label>
              <input value={newProp.zip} onChange={e => setNewProp(p => ({ ...p, zip: e.target.value }))} className="input-field" placeholder="40508" />
            </div>
            <div>
              <label className="input-label">Owner Name</label>
              <input value={newProp.ownerName} onChange={e => setNewProp(p => ({ ...p, ownerName: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="input-label">Notes</label>
              <input value={newProp.notes} onChange={e => setNewProp(p => ({ ...p, notes: e.target.value }))} className="input-field" placeholder="Source, motivation..." />
            </div>
          </div>
          <button onClick={addProperty} className="btn-primary mt-3">Save Property</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Property List */}
        <div className="lg:col-span-2 space-y-2">
          <h2 className="font-semibold text-lg">Properties ({properties.length})</h2>
          {properties.length === 0 && <div className="card text-gray-500 text-center py-8">No distressed properties found. Add one or ingest records from scrapers.</div>}
          {properties.map(p => {
            const badge = urgencyBadge(p.urgency_score);
            const signals = (p.signal_types || '').split(',').filter(Boolean);
            return (
              <div key={p.id} onClick={() => loadDetail(p.id)}
                className={`card cursor-pointer hover:shadow-md transition-shadow ${selected?.id === p.id ? 'ring-2 ring-blue-400' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{p.address}</div>
                    <div className="text-sm text-gray-500">{p.city}, {p.county?.toUpperCase()} {p.zip}</div>
                    {p.owner_name && <div className="text-xs text-gray-400 mt-1">Owner: {p.owner_name}</div>}
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${badge.cls}`}>{badge.label} ({p.urgency_score})</span>
                    <div className="text-xs text-gray-500 mt-1">Stack: {p.list_stack_count || 0}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {signals.map(s => {
                    const st = SIGNAL_TYPES.find(t => t.id === s);
                    return st ? <span key={s} className={`text-xs px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span> : null;
                  })}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <select value={p.status} onClick={e => e.stopPropagation()} onChange={e => updateStatus(p.id, e.target.value)}
                    className="text-xs border rounded px-1 py-0.5">
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                  {p.appraised_value > 0 && <span className="text-xs text-gray-500">Appraised: ${p.appraised_value?.toLocaleString()}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-lg">Detail</h2>
                  <button onClick={() => deleteProperty(selected.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </div>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Address:</span> {selected.address}</div>
                  <div><span className="text-gray-500">City:</span> {selected.city}, {selected.state} {selected.zip}</div>
                  <div><span className="text-gray-500">County:</span> {selected.county?.toUpperCase()}</div>
                  {selected.owner_name && <div><span className="text-gray-500">Owner:</span> {selected.owner_name}</div>}
                  {selected.owner_phone && <div><span className="text-gray-500">Phone:</span> {selected.owner_phone}</div>}
                  {selected.owner_email && <div><span className="text-gray-500">Email:</span> {selected.owner_email}</div>}
                  {selected.parcel_id && <div><span className="text-gray-500">Parcel:</span> {selected.parcel_id}</div>}
                  {selected.zoning && <div><span className="text-gray-500">Zoning:</span> {selected.zoning}</div>}
                  {selected.appraised_value > 0 && <div><span className="text-gray-500">Appraised:</span> ${selected.appraised_value?.toLocaleString()}</div>}
                  {selected.estimated_equity_percent > 0 && <div><span className="text-gray-500">Equity:</span> {selected.estimated_equity_percent}%</div>}
                  <div><span className="text-gray-500">Urgency:</span> {selected.urgency_score}</div>
                  <div><span className="text-gray-500">Skip Traced:</span> {selected.skip_traced ? 'Yes' : 'No'}</div>
                  {selected.notes && <div className="mt-2 p-2 bg-gray-50 rounded text-xs">{selected.notes}</div>}
                </div>
              </div>

              {/* Signals */}
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Distress Signals ({selected.signals?.length || 0})</h3>
                  <button onClick={() => setShowSignal(!showSignal)} className="text-xs text-blue-600 hover:text-blue-800">
                    {showSignal ? 'Cancel' : '+ Add Signal'}
                  </button>
                </div>

                {showSignal && (
                  <div className="border rounded p-2 mb-3 space-y-2">
                    <select value={newSignal.signalType} onChange={e => setNewSignal(s => ({ ...s, signalType: e.target.value }))} className="input-field text-sm">
                      {SIGNAL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <input value={newSignal.description} onChange={e => setNewSignal(s => ({ ...s, description: e.target.value }))}
                      className="input-field text-sm" placeholder="Description..." />
                    <div className="flex gap-2">
                      <select value={newSignal.severity} onChange={e => setNewSignal(s => ({ ...s, severity: parseInt(e.target.value) }))} className="input-field text-sm">
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Severity {n}</option>)}
                      </select>
                      <button onClick={addSignal} className="btn-primary text-sm">Add</button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {selected.signals?.map(sig => {
                    const st = SIGNAL_TYPES.find(t => t.id === sig.signal_type);
                    return (
                      <div key={sig.id} className="border rounded p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className={`px-1.5 py-0.5 rounded ${st?.color || 'bg-gray-100'}`}>{st?.label || sig.signal_type}</span>
                          <span className="text-gray-400">{sig.created_at?.split('T')[0]}</span>
                        </div>
                        {sig.description && <div className="mt-1 text-gray-600">{sig.description}</div>}
                        {sig.case_number && <div className="text-gray-400">Case: {sig.case_number}</div>}
                        <div className="text-gray-400">Source: {sig.source} | Severity: {sig.severity}/5 | +{sig.urgency_points}pts</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center text-gray-500 py-8">
              Select a property to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
