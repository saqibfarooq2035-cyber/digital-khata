export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-20 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

export function SkeletonTableRows({ columns = 4, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 w-full max-w-[10rem] animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonBlock({ className = 'h-24 w-full' }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;
}

export function SkeletonListRows({ rows = 5 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}
