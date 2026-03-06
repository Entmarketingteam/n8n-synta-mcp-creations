import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const fmt = (n) => n != null ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';

export default function ResultsDashboard() {
  const { id } = useParams();
  const [deals, setDeals] = useState([]);
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetch(`/api/deals/${id}`)
        .then(r => r.json())
        .then(data => { setDeal(data); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      fetch('/api/deals')
        .then(r => r.json())
        .then(data => { setDeals(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  // Single deal view
  if (id && deal?.deal) {
    const d = deal.deal;
    const results = d.computed_results;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/deals" className="text-blue-600 text-sm">&larr; All Deals</Link>
            <h1 className="text-2xl font-bold">{d.address}, {d.city} {d.state}</h1>
            <span className="text-sm text-gray-500 uppercase">{d.deal_type} | {d.status}</span>
          </div>
          <div className="flex gap-2">
            <Link to={`/deals/${id}/renovation`} className="btn-secondary text-sm">Renovation Budget</Link>
            <Link to={`/deals/${id}/photos`} className="btn-secondary text-sm">Photo Walkthrough</Link>
          </div>
        </div>

        {results && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-sm text-gray-500">Purchase Price</div>
              <div className="text-xl font-bold">{fmt(d.purchase_price)}</div>
            </div>
            <div className="card text-center">
              <div className="text-sm text-gray-500">ARV</div>
              <div className="text-xl font-bold">{fmt(d.arv)}</div>
            </div>
            <div className="card text-center">
              <div className="text-sm text-gray-500">Rehab Budget</div>
              <div className="text-xl font-bold">{fmt(d.rehab_budget)}</div>
            </div>
            <div className="card text-center">
              <div className="text-sm text-gray-500">
                {d.deal_type === 'flip' ? 'Projected Profit' : 'Monthly Cashflow'}
              </div>
              <div className={`text-xl font-bold ${
                (results.computed?.projection || results.computed?.monthlyCashflow || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {fmt(results.computed?.projection || results.computed?.monthlyCashflow)}
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {deal.warnings?.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Warnings & Reminders</h2>
            <div className="space-y-2">
              {deal.warnings.map((w, i) => (
                <div key={i} className={`warning-${w.level}`}>{w.message}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Deal list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Deals</h1>
        <Link to="/" className="btn-primary">+ New Deal</Link>
      </div>

      {deals.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">
          No deals yet. <Link to="/" className="text-blue-600">Create your first deal analysis.</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {deals.map(d => (
            <Link key={d.id} to={`/deals/${d.id}`} className="card hover:shadow-lg transition-shadow flex items-center justify-between">
              <div>
                <div className="font-semibold">{d.address}, {d.city} {d.state}</div>
                <div className="text-sm text-gray-500">
                  {d.deal_type.toUpperCase()} | {fmt(d.purchase_price)} | ARV: {fmt(d.arv)}
                </div>
              </div>
              <div className="text-right">
                {d.computed_results?.computed?.dealVerdict && (
                  <span className={d.computed_results.computed.dealVerdict === 'YES' ? 'badge-yes text-sm' : 'badge-nope text-sm'}>
                    {d.computed_results.computed.dealVerdict}
                  </span>
                )}
                <div className="text-xs text-gray-400 mt-1">{d.source_type}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
