const fmt = (n) => n != null ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';

export default function ScenarioTable({ scenarios = [], arv = 0 }) {
  if (scenarios.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-3 py-2 text-left border">Sale Price</th>
            <th className="px-3 py-2 text-right border">Closing Costs</th>
            <th className="px-3 py-2 text-right border">Profit</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s, i) => (
            <tr
              key={i}
              className={`${
                s.salePrice === arv ? 'font-bold bg-yellow-50' : ''
              } ${
                s.isProfitable ? '' : 'text-red-600'
              }`}
            >
              <td className="px-3 py-1.5 border">
                {fmt(s.salePrice)}
                {s.salePrice === arv && <span className="ml-2 text-xs text-gray-500">(ARV)</span>}
              </td>
              <td className="px-3 py-1.5 border text-right">{fmt(s.closingCosts)}</td>
              <td className={`px-3 py-1.5 border text-right font-medium ${
                s.isProfitable ? 'text-green-600' : 'text-red-600'
              }`}>
                {fmt(s.profit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
