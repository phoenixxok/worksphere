export const URGENCY_LABEL = {
  low: 'Low', normal: 'Normal', high: 'Urgent', emergency: 'Emergency',
};

export const URGENCY_CLASS = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-amber-100 text-amber-800',
  emergency: 'bg-red-100 text-red-800',
};

export const LANGUAGE_LABEL = { en: 'English', hi: 'Hindi', gu: 'Gujarati' };

export function rupees(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export function shortTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
