export default function WarningBadge({ warnings = [] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-1 mt-1">
      {warnings.map((w, i) => (
        <div key={i} className={`warning-${w.level}`}>
          <span className="font-medium">
            {w.level === 'critical' ? '!! ' : w.level === 'warning' ? '! ' : 'i '}
          </span>
          {w.message}
        </div>
      ))}
    </div>
  );
}
