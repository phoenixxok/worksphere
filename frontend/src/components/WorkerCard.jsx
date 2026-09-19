import { useState } from 'react';
import Badge from './Badge';
import ScoreBar from './ScoreBar';
import Button from './Button';

export default function WorkerCard({ candidate, onSelect }) {
  const [open, setOpen] = useState(false);
  const c = candidate;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-slate-900 text-white rounded-full w-6 h-6 flex items-center justify-center">
              {c.rank_position}
            </span>
            <h3 className="font-bold">{c.full_name}</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {c.distance_km} km away · ★ {c.rating_avg.toFixed(1)}
          </p>
        </div>
        <Badge className={c.jobs_completed_this_cycle === 0
          ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}>
          {c.jobs_completed_this_cycle} jobs this cycle
        </Badge>
      </div>

      <button className="text-xs text-slate-500 underline" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Why this rank?'} · score {c.total_score.toFixed(3)}
      </button>

      {open && (
        <div className="space-y-2 bg-slate-50 rounded-lg p-3">
          <ScoreBar label="Proximity" value={c.proximity_score} weight={0.45} colorClass="bg-blue-500" />
          <ScoreBar label="Skill rating" value={c.skill_score} weight={0.30} colorClass="bg-purple-500" />
          <ScoreBar label="Fair rotation" value={c.rotation_score} weight={0.25} colorClass="bg-green-500" />
          <p className="text-xs text-slate-500 pt-1">
            Fair rotation lowers the score of workers who have already had more jobs this cycle,
            so work is shared across the co-op.
          </p>
        </div>
      )}

      <Button variant="success" onClick={() => onSelect(c)}>
        Book {c.full_name.split(' ')[0]}
      </Button>
    </div>
  );
}
