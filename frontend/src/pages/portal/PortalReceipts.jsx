import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPortalReceipts } from '../../api/portal';
import PortalReceiptModal from '../../components/shared/PortalReceiptModal';
import { SkeletonListRows } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function PortalReceipts() {
  const [receiptId, setReceiptId] = useState(null);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['portal-receipts'],
    queryFn: () => getPortalReceipts().then((res) => res.data),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900" dir="auto">🧾 میری رسیدیں (My Receipts)</h1>

      {isLoading ? (
        <SkeletonListRows rows={5} />
      ) : receipts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500" dir="auto">
          ابھی تک کوئی رسید نہیں (No receipts yet)
        </div>
      ) : (
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">🧾 Receipt #{receipt.receiptNumber}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(receipt.date)}</p>
                  <p className="text-xs text-slate-500">Installment #{receipt.installmentNumber}</p>
                  <p className="text-xs text-slate-500">{receipt.method} Payment</p>
                </div>
                <p className="shrink-0 font-semibold text-slate-900">{formatCurrency(receipt.amount)}</p>
              </div>
              <button
                onClick={() => setReceiptId(receipt.id)}
                className="mt-3 w-full rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Download PDF 📄
              </button>
            </div>
          ))}
        </div>
      )}

      {receiptId && <PortalReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} autoPrint />}
    </div>
  );
}
