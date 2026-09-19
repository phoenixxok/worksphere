import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import WorkerCard from '../components/WorkerCard';
import ErrorBox from '../components/ErrorBox';

export default function MatchesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getMatches(id)
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message));
  }, [id]);

  function onSelect(candidate) {
    // Booking form is built in T12/T13. Carry the choice in router state.
    navigate(`/household/requests/${id}/book`, { state: { candidate } });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Fair-matched workers</h2>
        <p className="text-sm text-slate-500">
          Ranked by proximity, skill rating and fair rotation.
        </p>
      </div>

      <ErrorBox message={error} />

      {items === null && !error && <p className="text-sm text-slate-400 text-center py-8">Finding workers…</p>}

      {items && items.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-400">
          <p className="font-semibold text-slate-900 mb-1">No workers available</p>
          <p>
            No verified, available worker with this skill is within 15 km right now.
          </p>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {items.map((c) => (
            <WorkerCard key={c.worker_user_id} candidate={c} onSelect={onSelect} />
          ))}
        </div>
      )}

      <button className="w-full text-sm text-slate-500 underline pt-2"
              onClick={() => navigate('/household')}>
        Back
      </button>
    </div>
  );
}
