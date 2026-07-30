export default function Badge({ children, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
  }[tone];

  return <span className={`rounded-full px-3 py-1 text-sm font-medium ${toneClass}`}>{children}</span>;
}
