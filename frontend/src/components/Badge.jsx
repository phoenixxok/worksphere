export default function Badge({ children, className = 'bg-slate-100 text-slate-700' }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${className}`}>
      {children}
    </span>
  );
}
