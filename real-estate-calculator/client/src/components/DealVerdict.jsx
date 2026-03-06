const fmt = (n) => n != null ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
const pct = (n) => n != null ? (n * 100).toFixed(1) + '%' : '-';

export default function DealVerdict({ results }) {
  if (!results) return null;

  const isFlip = results.dealVerdict !== undefined;

  if (isFlip) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Deal Evaluation</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Projected Profit</div>
            <div className={`text-2xl font-bold ${results.projection >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmt(results.projection)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Deal?</div>
            <div className={results.isDeal ? 'badge-yes' : 'badge-nope'}>
              {results.dealVerdict}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Cost (% of ARV)</div>
            <div className="text-lg font-semibold">{pct(results.asPercentOfArv)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">TPC + All Fees</div>
            <div className="text-lg font-semibold">{fmt(results.tpcPlusCost)}</div>
          </div>
        </div>
      </div>
    );
  }

  // Rental verdict
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Rental Analysis</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-500">Monthly Cashflow</div>
          <div className={`text-2xl font-bold ${results.monthlyCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmt(results.monthlyCashflow)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Cash-on-Cash Return</div>
          <div className="text-xl font-bold">{pct(results.cashOnCash)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Annual Cashflow</div>
          <div className="text-lg font-semibold">{fmt(results.annualCashflow)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Cash Invested</div>
          <div className="text-lg font-semibold">{fmt(results.cashInvested)}</div>
        </div>
      </div>
    </div>
  );
}
