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
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Fair-matched workers</h2>
        <p className="text-sm text-slate-500">
          Ranked by proximity, skill rating and fair rotation.
        </p>
      </div>

      <ErrorBox message={error} />

      {items === null && !error && <p className="text-slate-500">Finding workers…</p>}

      {items && items.length === 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <p className="font-semibold">No workers available</p>
          <p className="text-sm text-slate-500">
            No verified, available worker with this skill is within 15 km right now.
          </p>
        </div>
      )}

      {items && items.map((c) => (
        <WorkerCard key={c.worker_user_id} candidate={c} onSelect={onSelect} />
      ))}

      <button className="w-full text-sm text-slate-500 underline pt-2"
              onClick={() => navigate('/household')}>
        Back
      </button>
    </div>
  );
}
