import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPortalDashboard, getPortalPayments } from '../../api/portal';
import PortalReceiptModal from '../../components/shared/PortalReceiptModal';
import { SkeletonListRows } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function PortalPayments() {
  const [receiptId, setReceiptId] = useState(null);

  const { data: dashboard } = useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: () => getPortalDashboard().then((res) => res.data),
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['portal-payments'],
    queryFn: () => getPortalPayments().then((res) => res.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900" dir="auto">💳 میری ادائیگیاں (My Payments)</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-slate-500">Total Paid</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">{formatCurrency(dashboard?.totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-slate-500">Remaining</p>
          <p className="mt-1 text-lg font-bold text-rose-600">{formatCurrency(dashboard?.remainingBalance)}</p>
        </div>
      </div>

      {isLoading ? (
        <SkeletonListRows rows={5} />
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500" dir="auto">
          کوئی ادائیگی نہیں ملی (No payments found)
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center gap-3 rounded-2xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
              <span className="text-xl">✅</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">Installment #{payment.installmentNumber}</p>
                <p className="text-xs text-slate-500">{formatDate(payment.paymentDate)}</p>
                <p className="text-xs text-slate-500">Method: {payment.paymentMethod}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-slate-900">{formatCurrency(payment.amountReceived)}</p>
                <button
                  onClick={() => setReceiptId(payment.id)}
                  className="mt-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700"
                >
                  Receipt 🧾
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {receiptId && <PortalReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} />}
    </div>
  );
}
