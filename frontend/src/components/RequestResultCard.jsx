import Badge from './Badge';
import { URGENCY_LABEL, URGENCY_CLASS, LANGUAGE_LABEL } from '../lib/formatters';

export default function RequestResultCard({ request }) {
  if (!request) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">What we understood</h3>
        <Badge className={URGENCY_CLASS[request.urgency] || URGENCY_CLASS.normal}>
          {URGENCY_LABEL[request.urgency] || request.urgency}
        </Badge>
      </div>

      <p className="text-sm text-slate-500 italic">"{request.raw_text}"</p>

      <dl className="text-sm space-y-1">
        <div className="flex justify-between">
          <dt className="text-slate-500">Service</dt>
          <dd className="font-semibold">{request.skill_name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Issue</dt>
          <dd className="font-semibold text-right">{request.issue_summary}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Language detected</dt>
          <dd className="font-semibold">{LANGUAGE_LABEL[request.detected_language] || '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Understood by</dt>
          <dd className="font-semibold">
            {request.nlp_source === 'llm' ? 'AI language model' : 'Keyword fallback'}
            {' '}({Math.round((request.nlp_confidence || 0) * 100)}%)
          </dd>
        </div>
      </dl>
    </div>
  );
}
