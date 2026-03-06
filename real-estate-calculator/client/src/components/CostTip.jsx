import { useState } from 'react';

export default function CostTip({ category, tips = [] }) {
  const [expanded, setExpanded] = useState(false);

  if (tips.length === 0) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-green-700 font-medium flex items-center gap-1 w-full text-left"
      >
        <span>{expanded ? 'v' : '>'}</span>
        <span>Cost-cutting tips ({tips.length})</span>
      </button>
      {expanded && (
        <ul className="mt-2 space-y-1">
          {tips.map((tip, i) => (
            <li key={i} className="text-sm text-green-800 flex justify-between">
              <span>{tip.tip}</span>
              {tip.savings && <span className="text-green-600 font-medium ml-2 whitespace-nowrap">Save: {tip.savings}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
