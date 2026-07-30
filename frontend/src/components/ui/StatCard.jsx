export default function StatCard({ title, value, hint, icon, iconClassName = 'bg-cyan-100 text-cyan-700', cardClassName = '', trend, trendDirection = 'up' }) {
  return (
    <div className={`stat-card ${cardClassName}`}>
      {icon ? <div className={`stat-icon ${iconClassName}`}>{icon}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="stat-label">{title}</p>
        <p className="stat-value">{value}</p>
        {hint ? <p className="mt-1 text-sm text-cyan-600">{hint}</p> : null}
        {trend ? <p className={`stat-trend ${trendDirection === 'down' ? 'trend-down' : 'trend-up'}`}>{trend}</p> : null}
      </div>
    </div>
  );
}
