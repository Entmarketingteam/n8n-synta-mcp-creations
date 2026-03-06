import { useState, useCallback } from 'react';

export function usePropertyLookup() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const lookup = useCallback(async (address, city, state, zip) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/enrichment/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, city, state, zip }),
      });
      const result = await res.json();
      if (result.status === 'found') {
        setData(result);
      } else {
        setError(result.message || 'Property not found');
      }
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading, data, error };
}
