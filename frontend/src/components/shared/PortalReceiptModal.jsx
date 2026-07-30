import { useEffect, useState } from 'react';
import { getPortalReceipt } from '../../api/portal';
import { SkeletonListRows } from '../ui/Skeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { notifyError } from '../../utils/notify';

function printAsPdf(receiptNumber) {
  const originalTitle = document.title;
  document.title = `receipt-${receiptNumber}`;
  const restore = () => {
    document.title = originalTitle;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  window.print();
}

export default function PortalReceiptModal({ paymentId, onClose, autoPrint = false }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setLoading(true);

    getPortalReceipt(paymentId)
      .then(({ data }) => {
        if (cancelled) return;
        setDetail(data);
        if (autoPrint) {
          setTimeout(() => printAsPdf(data.receiptNumber), 300);
        }
      })
      .catch(() => {
        if (!cancelled) {
          notifyError('Unable to load receipt');
          onClose();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 print:bg-transparent">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl print-surface">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h3 className="text-xl font-semibold text-slate-900">Receipt</h3>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500">Close</button>
        </div>

        {loading || !detail ? (
          <SkeletonListRows rows={4} />
        ) : (
          <div id="printable-portal-receipt">
            <div className="mb-6 border-b border-dashed border-slate-300 pb-4 text-center">
              <h2 className="text-2xl font-bold text-cyan-700">Digital Khata</h2>
              <p className="mt-1 text-sm text-slate-500">Receipt #{detail.receiptNumber}</p>
              <p className="text-sm text-slate-500">{formatDate(detail.date)}</p>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
              <p className="font-medium text-slate-900">{detail.customerName}</p>
              <p className="text-sm text-slate-500">{detail.customerPhone}</p>
              <p className="text-sm text-slate-500">{detail.customerCnic}</p>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Product / Plan</p>
              <p className="font-medium text-slate-900">{detail.productName}</p>
              <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm text-slate-600">
                <span>Total Price</span>
                <span className="text-right">{formatCurrency(detail.totalPrice)}</span>
                <span>Plan</span>
                <span className="text-right">{detail.installmentPlan}</span>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-cyan-600">Payment</p>
              <div className="mt-1 grid grid-cols-2 gap-y-1 text-sm">
                <span className="text-slate-600">Installment #</span>
                <span className="text-right font-medium">{detail.installmentNumber} of {detail.totalInstallments}</span>
                <span className="text-slate-600">Amount Received</span>
                <span className="text-right font-semibold text-cyan-700">{formatCurrency(detail.amountReceived)}</span>
                <span className="text-slate-600">Method</span>
                <span className="text-right">{detail.paymentMethod}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-slate-500">Remaining Balance</p>
                <p className="text-lg font-semibold text-rose-600">{formatCurrency(detail.remainingBalance)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-slate-500">Next Due Date</p>
                <p className="text-lg font-semibold text-slate-900">{detail.nextDueDate ? formatDate(detail.nextDueDate) : 'Fully Paid'}</p>
              </div>
            </div>

            <p className="mt-6 text-center text-base font-semibold text-slate-700" dir="rtl">شکریہ آپ کے کاروبار کے لیے</p>
          </div>
        )}

        {detail && (
          <button
            onClick={() => printAsPdf(detail.receiptNumber)}
            className="mt-6 w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white print:hidden"
          >
            Print / Save as PDF
          </button>
        )}
      </div>
    </div>
  );
}
