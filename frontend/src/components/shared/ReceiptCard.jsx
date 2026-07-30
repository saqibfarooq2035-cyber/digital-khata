import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const SHOP = {
  name: 'Digital Khata',
  address: '123 Main Bazaar Road, Lahore, Pakistan',
  phone: '+92 300 1234567',
};

const typeTone = {
  Full: 'bg-emerald-100 text-emerald-700',
  Partial: 'bg-amber-100 text-amber-700',
};

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function paidInstallments(sale) {
  const duration = sale.durationMonths || 0;
  const installment = sale.installmentAmount || 0;
  if (duration <= 0) return 0;
  if (installment <= 0) return sale.remainingAmount <= 0 ? duration : 0;
  const paidViaInstallments = Math.max(0, (sale.totalPrice - sale.downPayment) - sale.remainingAmount);
  const paid = Math.round(paidViaInstallments / installment);
  return Math.min(duration, Math.max(0, paid));
}

export default function ReceiptCard({ payment, sale }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <div className="mb-6 border-b border-dashed border-slate-300 pb-4 text-center">
        <h2 className="text-2xl font-bold text-cyan-700">{SHOP.name}</h2>
        <p className="text-sm text-slate-500">{SHOP.address}</p>
        <p className="text-sm text-slate-500">{SHOP.phone}</p>
      </div>

      {!payment ? (
        <p className="py-10 text-center text-sm text-slate-500">No receipt selected yet.</p>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-slate-900">Receipt #{String(payment.id).padStart(6, '0')}</p>
              <p className="text-slate-500">{formatDate(payment.paymentDate)} · {formatTime(payment.paymentDate)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${typeTone[payment.paymentType] || 'bg-slate-100 text-slate-600'}`}>
              {payment.paymentType}
            </span>
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
            <p className="font-medium text-slate-900">{sale?.customer?.fullName || '—'}</p>
            <p className="text-sm text-slate-500">{sale?.customer?.phoneNumber}</p>
            <p className="text-sm text-slate-500">{sale?.customer?.address}</p>
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Product / Sale</p>
            <p className="font-medium text-slate-900">{sale?.product?.name || '—'}</p>
            <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm text-slate-600">
              <span>Total Price</span>
              <span className="text-right">{formatCurrency(sale?.totalPrice)}</span>
              <span>Down Payment</span>
              <span className="text-right">{formatCurrency(sale?.downPayment)}</span>
              <span>Duration</span>
              <span className="text-right">{sale?.durationMonths ?? '—'} months</span>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-cyan-600">Payment Breakdown</p>
            <div className="mt-1 grid grid-cols-2 gap-y-1 text-sm">
              <span className="text-slate-600">Installment #</span>
              <span className="text-right font-medium">{payment.installmentNumber}</span>
              <span className="text-slate-600">Amount Received</span>
              <span className="text-right font-semibold text-cyan-700">{formatCurrency(payment.amountReceived)}</span>
              <span className="text-slate-600">Method</span>
              <span className="text-right">{payment.paymentMethod}</span>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-slate-500">Remaining Balance</p>
              <p className="text-lg font-semibold text-rose-600">{formatCurrency(sale?.remainingAmount)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-slate-500">Next Due Date</p>
              <p className="text-lg font-semibold text-slate-900">
                {sale && sale.remainingAmount > 0 ? formatDate(addMonths(sale.firstDueDate, paidInstallments(sale))) : 'Fully Paid'}
              </p>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300 pt-4 text-center">
            <p className="text-sm text-slate-500">Notes: {payment.notes || '—'}</p>
            <p className="mt-3 text-base font-semibold text-slate-700" dir="rtl">شکریہ آپ کے کاروبار کے لیے</p>
          </div>
        </>
      )}
    </div>
  );
}
