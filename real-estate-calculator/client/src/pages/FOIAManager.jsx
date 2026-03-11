import { useState, useEffect } from 'react';

const COUNTIES = ['fayette', 'scott', 'oldham'];
const REQUEST_TYPES = [
  { id: 'water_shutoff', label: 'Water Shut-off List' },
  { id: 'expired_permits', label: 'Expired / Abandoned Permits' },
  { id: 'nuisance_liens', label: 'Nuisance Liens / Code Abatements' },
  { id: 'delinquent_taxes', label: 'Delinquent Property Taxes' },
];
const STATUS_LABELS = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Sent', cls: 'bg-blue-100 text-blue-700' },
  acknowledged: { label: 'Acknowledged', cls: 'bg-yellow-100 text-yellow-700' },
  received: { label: 'Received', cls: 'bg-green-100 text-green-700' },
  denied: { label: 'Denied', cls: 'bg-red-100 text-red-700' },
  appealing: { label: 'Appealing', cls: 'bg-purple-100 text-purple-700' },
};

export default function FOIAManager() {
  const [requests, setRequests] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [dueRequests, setDueRequests] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [newReq, setNewReq] = useState({ county: 'fayette', requestType: 'water_shutoff', recipientEmail: '', autoSend: false });
  const [receiveNotes, setReceiveNotes] = useState({ notes: '', recordsCount: 0 });
  const [showReceive, setShowReceive] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = () => {
    fetch('/api/distressed/foia').then(r => r.json()).then(setRequests);
    fetch('/api/distressed/foia/templates').then(r => r.json()).then(setTemplates);
    fetch('/api/distressed/foia/due').then(r => r.json()).then(setDueRequests);
  };

  const createRequest = async () => {
    await fetch('/api/distressed/foia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq),
    });
    setShowCreate(false);
    loadAll();
  };

  const markAsSent = async (id) => {
    await fetch(`/api/distressed/foia/${id}/sent`, { method: 'PUT' });
    loadAll();
    if (selected?.id === id) setSelected(requests.find(r => r.id === id));
  };

  const markAsReceived = async (id) => {
    await fetch(`/api/distressed/foia/${id}/received`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receiveNotes),
    });
    setShowReceive(false);
    setReceiveNotes({ notes: '', recordsCount: 0 });
    loadAll();
  };

  const deleteRequest = async (id) => {
    await fetch(`/api/distressed/foia/${id}`, { method: 'DELETE' });
    if (selected?.id === id) setSelected(null);
    loadAll();
  };

  const quickCreate = async (county, type) => {
    await fetch('/api/distressed/foia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ county, requestType: type }),
    });
    loadAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">FOIA Request Manager</h1>
          <p className="text-sm text-gray-500">Kentucky Open Records Act (KRS 61.872) request automation</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
          {showCreate ? 'Cancel' : '+ New Request'}
        </button>
      </div>

      {/* Due Requests Alert */}
      {dueRequests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800">Requests Due for Sending ({dueRequests.length})</h3>
          <div className="mt-2 space-y-1">
            {dueRequests.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>{r.county.toUpperCase()} - {REQUEST_TYPES.find(t => t.id === r.request_type)?.label}</span>
                <button onClick={() => markAsSent(r.id)} className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Mark Sent</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Create Grid */}
      <div className="card">
        <h3 className="font-semibold mb-3">Quick Generate (All Counties)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COUNTIES.map(county => (
            <div key={county} className="border rounded p-3">
              <h4 className="font-medium capitalize mb-2">{county}</h4>
              <div className="space-y-1">
                {REQUEST_TYPES.map(type => (
                  <button key={type.id} onClick={() => quickCreate(county, type.id)}
                    className="block w-full text-left text-xs px-2 py-1.5 rounded bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card border-2 border-blue-200">
          <h2 className="text-lg font-semibold mb-3">New FOIA Request</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="input-label">County</label>
              <select value={newReq.county} onChange={e => setNewReq(r => ({ ...r, county: e.target.value }))} className="input-field">
                {COUNTIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Request Type</label>
              <select value={newReq.requestType} onChange={e => setNewReq(r => ({ ...r, requestType: e.target.value }))} className="input-field">
                {REQUEST_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Recipient Email</label>
              <input value={newReq.recipientEmail} onChange={e => setNewReq(r => ({ ...r, recipientEmail: e.target.value }))}
                className="input-field" placeholder="records@county.gov" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newReq.autoSend} onChange={e => setNewReq(r => ({ ...r, autoSend: e.target.checked }))} />
                Auto-send monthly
              </label>
            </div>
          </div>
          <button onClick={createRequest} className="btn-primary mt-3">Generate Request</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request List */}
        <div className="space-y-2">
          <h2 className="font-semibold text-lg">All Requests ({requests.length})</h2>
          {requests.length === 0 && <div className="card text-gray-500 text-center py-8">No FOIA requests yet. Generate one above.</div>}
          {requests.map(r => {
            const statusInfo = STATUS_LABELS[r.status] || STATUS_LABELS.draft;
            const typeLabel = REQUEST_TYPES.find(t => t.id === r.request_type)?.label || r.request_type;
            return (
              <div key={r.id} onClick={() => setSelected(r)}
                className={`card cursor-pointer hover:shadow-md transition-shadow ${selected?.id === r.id ? 'ring-2 ring-blue-400' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm">{typeLabel}</div>
                    <div className="text-xs text-gray-500 capitalize">{r.county} County - {r.agency}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.cls}`}>{statusInfo.label}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {r.sent_at && <span>Sent: {r.sent_at.split(' ')[0]}</span>}
                  {r.next_send_date && <span>Next: {r.next_send_date}</span>}
                  {r.records_count > 0 && <span className="text-green-600">{r.records_count} records</span>}
                  {r.auto_send ? <span className="text-blue-500">Auto</span> : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail / Preview */}
        <div className="space-y-4">
          {selected ? (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg">Request Detail</h2>
                <div className="flex gap-2">
                  {selected.status === 'draft' && (
                    <button onClick={() => markAsSent(selected.id)} className="text-xs bg-blue-500 text-white px-3 py-1 rounded">Mark Sent</button>
                  )}
                  {selected.status === 'sent' && (
                    <button onClick={() => setShowReceive(true)} className="text-xs bg-green-500 text-white px-3 py-1 rounded">Mark Received</button>
                  )}
                  <button onClick={() => deleteRequest(selected.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>

              {showReceive && (
                <div className="border rounded p-3 mb-3 space-y-2">
                  <input value={receiveNotes.notes} onChange={e => setReceiveNotes(r => ({ ...r, notes: e.target.value }))}
                    className="input-field text-sm" placeholder="Notes about response..." />
                  <div className="flex gap-2">
                    <input type="number" value={receiveNotes.recordsCount} onChange={e => setReceiveNotes(r => ({ ...r, recordsCount: parseInt(e.target.value) || 0 }))}
                      className="input-field text-sm w-32" placeholder="Records count" />
                    <button onClick={() => markAsReceived(selected.id)} className="btn-primary text-sm">Save</button>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">Subject:</span> {selected.subject}</div>
                <div><span className="text-gray-500">Agency:</span> {selected.agency}</div>
                <div><span className="text-gray-500">To:</span> {selected.recipient_email || '(not set)'}</div>
                <div><span className="text-gray-500">Recurrence:</span> Every {selected.recurrence_days} days</div>
              </div>
              <div className="mt-3">
                <label className="text-xs text-gray-500 font-medium">Request Body (copy & send):</label>
                <pre className="mt-1 p-3 bg-gray-50 rounded text-xs whitespace-pre-wrap max-h-96 overflow-y-auto border">{selected.body}</pre>
              </div>
              {selected.response_notes && (
                <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                  <div className="font-medium text-green-800">Response Notes:</div>
                  <div className="text-green-700">{selected.response_notes}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <h3 className="font-semibold mb-3">FOIA Request Templates</h3>
              <div className="space-y-3 text-sm">
                {templates.map(t => (
                  <div key={t.id} className="border rounded p-3">
                    <div className="font-medium">{t.subject}</div>
                    <div className="text-xs text-gray-500 mt-1">{t.preview}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-800">
                <strong>Tip:</strong> Frame requests for "Service Disconnection Orders by Property Address" instead of "delinquent customers" to bypass KRS 61.878 privacy objections.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
