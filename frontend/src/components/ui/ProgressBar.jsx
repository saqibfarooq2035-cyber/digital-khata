export default function ProgressBar({ value, color = 'bg-cyan-600' }) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-200">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}
