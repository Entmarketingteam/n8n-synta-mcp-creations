import { useState, useEffect } from 'react';

const fmt = (n) => n != null ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';

export default function ComparisonView() {
  const [deals, setDeals] = useState([]);
  const [selected, setSelected] = useState([]);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    fetch('/api/deals').then(r => r.json()).then(setDeals);
  }, []);

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const compare = async () => {
    if (selected.length < 2) return;
    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealIds: selected }),
    });
    setComparison(await res.json());
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compare Deals</h1>

      {/* Deal Selector */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Select deals to compare (min 2)</h2>
        <div className="space-y-2">
          {deals.map(d => (
            <label key={d.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(d.id)}
                onChange={() => toggleSelect(d.id)}
              />
              <span className="font-medium">{d.address}, {d.city} {d.state}</span>
              <span className="text-sm text-gray-500">({d.deal_type}) - {fmt(d.purchase_price)}</span>
            </label>
          ))}
        </div>
        <button
          onClick={compare}
          disabled={selected.length < 2}
          className="btn-primary mt-3"
        >
          Compare {selected.length} Deals
        </button>
      </div>

      {/* Comparison Table */}
      {comparison && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse card">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left border">Metric</th>
                {comparison.comparison.map(d => (
                  <th key={d.id} className="px-4 py-2 text-center border">{d.address}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Deal Type', key: 'dealType', format: v => v?.toUpperCase() },
                { label: 'Purchase Price', key: 'purchasePrice', format: fmt },
                { label: 'ARV', key: 'arv', format: fmt },
                { label: 'Rehab Budget', key: 'rehabBudget', format: fmt },
                { label: 'Total Project Costs', key: 'totalProjectCosts', format: fmt },
                { label: 'Projected Profit', key: 'projection', format: fmt },
                { label: 'Monthly Cashflow', key: 'monthlyCashflow', format: fmt },
                { label: 'Cash-on-Cash', key: 'cashOnCash', format: v => v != null ? (v * 100).toFixed(1) + '%' : '-' },
                { label: 'Sq Ft', key: 'squareFootage', format: v => v?.toLocaleString() || '-' },
                { label: 'Year Built', key: 'yearBuilt', format: v => v || '-' },
                { label: '$/Sq Ft', key: 'pricePerSqft', format: v => v ? '$' + v : '-' },
                { label: 'Source', key: 'sourceType', format: v => v || '-' },
                { label: 'Verdict', key: 'dealVerdict', format: v => v || '-' },
              ].map(row => (
                <tr key={row.key}>
                  <td className="px-4 py-2 border font-medium">{row.label}</td>
                  {comparison.comparison.map(d => (
                    <td key={d.id} className={`px-4 py-2 border text-center ${
                      row.key === 'dealVerdict' ? (d[row.key] === 'YES' ? 'text-green-600 font-bold' : d[row.key] === 'NOPE' ? 'text-red-600 font-bold' : '') : ''
                    }`}>
                      {row.format(d[row.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
