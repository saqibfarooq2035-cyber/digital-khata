export default function Button({ children, onClick, className = '', variant = 'primary' }) {
  const variants = {
    primary: 'bg-cyan-600 text-white hover:bg-cyan-700',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  };

  return (
    <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}
