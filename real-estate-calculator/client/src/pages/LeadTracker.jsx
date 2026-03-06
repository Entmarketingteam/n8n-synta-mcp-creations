import { useState, useEffect } from 'react';

const STAGES = [
  { id: 'new', label: 'New', color: 'bg-blue-100' },
  { id: 'analyzing', label: 'Analyzing', color: 'bg-yellow-100' },
  { id: 'making_offer', label: 'Making Offer', color: 'bg-orange-100' },
  { id: 'under_contract', label: 'Under Contract', color: 'bg-green-100' },
  { id: 'due_diligence', label: 'Due Diligence', color: 'bg-teal-100' },
  { id: 'rehab', label: 'Rehab', color: 'bg-purple-100' },
  { id: 'listed', label: 'Listed/Rented', color: 'bg-indigo-100' },
  { id: 'sold', label: 'Sold/Stabilized', color: 'bg-emerald-100' },
];

const SOURCE_TYPES = ['mls', 'zillow', 'offmarket', 'wholesaler', 'facebook_group', 'driving', 'other'];

export default function LeadTracker() {
  const [pipeline, setPipeline] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({ sourceType: 'facebook_group', sourceName: '', contactName: '', askingPrice: 0, notes: '' });

  useEffect(() => {
    loadPipeline();
    loadAnalytics();
  }, []);

  const loadPipeline = async () => {
    const res = await fetch('/api/leads/pipeline');
    const data = await res.json();
    setPipeline(data.pipeline || {});
  };

  const loadAnalytics = async () => {
    const res = await fetch('/api/leads/analytics');
    setAnalytics(await res.json());
  };

  const addLead = async () => {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLead),
    });
    setNewLead({ sourceType: 'facebook_group', sourceName: '', contactName: '', askingPrice: 0, notes: '' });
    setShowAdd(false);
    loadPipeline();
    loadAnalytics();
  };

  const updateStatus = async (leadId, newStatus) => {
    await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    loadPipeline();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lead Pipeline</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          {showAdd ? 'Cancel' : '+ Add Lead'}
        </button>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {analytics.bySource?.map(s => (
            <div key={s.source_type} className="card text-center">
              <div className="text-sm text-gray-500 capitalize">{s.source_type?.replace(/_/g, ' ')}</div>
              <div className="text-xl font-bold">{s.count}</div>
              <div className="text-xs text-green-600">{s.converted} converted</div>
            </div>
          ))}
        </div>
      )}

      {/* Add Lead Form */}
      {showAdd && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">New Lead</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="input-label">Source Type</label>
              <select value={newLead.sourceType} onChange={e => setNewLead(p => ({ ...p, sourceType: e.target.value }))} className="input-field">
                {SOURCE_TYPES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Source Name</label>
              <input type="text" value={newLead.sourceName} onChange={e => setNewLead(p => ({ ...p, sourceName: e.target.value }))} className="input-field" placeholder="e.g. Louisville REIA Group" />
            </div>
            <div>
              <label className="input-label">Contact Name</label>
              <input type="text" value={newLead.contactName} onChange={e => setNewLead(p => ({ ...p, contactName: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="input-label">Asking Price</label>
              <input type="number" value={newLead.askingPrice || ''} onChange={e => setNewLead(p => ({ ...p, askingPrice: parseFloat(e.target.value) || 0 }))} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="input-label">Notes</label>
              <input type="text" value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} className="input-field" placeholder="Property details, seller motivation..." />
            </div>
          </div>
          <button onClick={addLead} className="btn-primary mt-3">Save Lead</button>
        </div>
      )}

      {/* Pipeline Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <div key={stage.id} className="min-w-[220px] flex-shrink-0">
            <div className={`${stage.color} rounded-t-lg px-3 py-2 font-medium text-sm flex justify-between`}>
              <span>{stage.label}</span>
              <span className="text-gray-500">{pipeline[stage.id]?.length || 0}</span>
            </div>
            <div className="bg-gray-50 rounded-b-lg p-2 space-y-2 min-h-[100px]">
              {pipeline[stage.id]?.map(lead => (
                <div key={lead.id} className="bg-white rounded p-2 shadow-sm text-sm">
                  <div className="font-medium">{lead.address || lead.source_name || 'Lead'}</div>
                  <div className="text-xs text-gray-500">{lead.source_type?.replace(/_/g, ' ')}</div>
                  {lead.asking_price > 0 && <div className="text-xs">${lead.asking_price.toLocaleString()}</div>}
                  <select
                    value={lead.status}
                    onChange={e => updateStatus(lead.id, e.target.value)}
                    className="text-xs mt-1 border rounded px-1 py-0.5 w-full"
                  >
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    <option value="dead">Dead</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
