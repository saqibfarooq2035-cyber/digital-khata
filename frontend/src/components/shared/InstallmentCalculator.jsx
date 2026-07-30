import { formatCurrency } from '../../utils/formatCurrency';

export default function InstallmentCalculator({ totalPrice = 0, downPayment = 0, durationMonths = 0 }) {
  const total = Number(totalPrice || 0);
  const down = Number(downPayment || 0);
  const duration = Number(durationMonths || 0);
  const remaining = Math.max(0, total - down);
  const monthlyInstallment = duration > 0 ? remaining / duration : remaining;

  const rows = [
    { label: 'Total Price', value: formatCurrency(total) },
    { label: 'Down Payment', value: formatCurrency(down) },
    { label: 'Remaining Amount', value: formatCurrency(remaining) },
    { label: 'Duration', value: `${duration} ${duration === 1 ? 'Month' : 'Months'}` },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-slate-900">Installment Calculator</h3>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-500">{row.label}</span>
              <span className="font-medium text-slate-900">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-cyan-200 bg-cyan-50 px-4 py-3">
          <span className="text-sm font-semibold text-cyan-700">Monthly Installment</span>
          <span className="text-lg font-bold text-cyan-700">{formatCurrency(monthlyInstallment)}</span>
        </div>
      </div>
    </div>
  );
}
