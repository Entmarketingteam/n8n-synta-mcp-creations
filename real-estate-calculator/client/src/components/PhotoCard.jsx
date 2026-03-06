import { useState } from 'react';

export default function PhotoCard({ photo, onAnalyze, onDelete }) {
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await onAnalyze(photo.id);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <img
        src={`/uploads/${photo.filename}`}
        alt={photo.original_name || 'Property photo'}
        className="w-full h-48 object-cover"
      />
      <div className="p-3">
        <div className="text-sm text-gray-500">{photo.room_id || 'General'}</div>
        {photo.notes && <p className="text-sm mt-1">{photo.notes}</p>}

        {photo.ai_analysis && (
          <div className="mt-2 bg-blue-50 rounded p-2">
            <div className="text-xs font-medium text-blue-700">AI Analysis</div>
            {Array.isArray(photo.ai_analysis.suggestedChecks) && (
              <ul className="text-xs text-blue-600 mt-1 space-y-0.5">
                {photo.ai_analysis.suggestedChecks.map((check, i) => (
                  <li key={i}>- {check}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          {!photo.ai_analysis && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="text-xs btn-primary px-2 py-1"
            >
              {analyzing ? 'Analyzing...' : 'AI Analyze'}
            </button>
          )}
          <button
            onClick={() => onDelete(photo.id)}
            className="text-xs btn-danger px-2 py-1"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
