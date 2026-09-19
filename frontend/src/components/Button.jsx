export default function Button({ children, onClick, disabled, variant = 'primary', type = 'button', className = '' }) {
  const base = 'w-full rounded-lg px-4 py-3 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-base focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2';
  const styles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-100',
    success: 'bg-green-600 text-white hover:bg-green-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}
