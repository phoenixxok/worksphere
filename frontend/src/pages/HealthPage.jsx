import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function HealthPage() {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    api.health()
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((err) => setState({ loading: false, data: null, error: err.message }));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-3">System check</h1>
      {state.loading && <p className="text-slate-500">Checking…</p>}
      {state.error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3">{state.error}</p>
      )}
      {state.data && (
        <div className="bg-white rounded-lg shadow p-4 space-y-1">
          <p>API: <span className="font-semibold text-green-700">{state.data.status}</span></p>
          <p>Database: <span className="font-semibold text-green-700">{state.data.db}</span></p>
          <p>LLM enabled: <span className="font-semibold">{String(state.data.llm_enabled)}</span></p>
        </div>
      )}
    </div>
  );
}
