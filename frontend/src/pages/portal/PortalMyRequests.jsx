import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyRequests } from '../../api/paymentRequest';
import PayNowModal from '../../components/portal/PayNowModal';
import { SkeletonListRows } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPaymentRequestStatusMeta } from '../../utils/paymentRequestStatus';

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export default function PortalMyRequests() {
  const queryClient = useQueryClient();
  const [retryModal, setRetryModal] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['portal-my-requests'],
    queryFn: () => getMyRequests().then((res) => res.data),
  });

  function invalidatePortalQueries() {
    queryClient.invalidateQueries({ queryKey: ['portal-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['portal-schedule'] });
    queryClient.invalidateQueries({ queryKey: ['portal-payments'] });
    queryClient.invalidateQueries({ queryKey: ['portal-my-requests'] });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900" dir="auto">📋 میری درخواستیں (My Requests)</h1>

      {isLoading ? (
        <SkeletonListRows rows={5} />
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No payment requests submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const meta = getPaymentRequestStatusMeta(request.status);
            return (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">Installment #{request.installmentNumber}</p>
                <p className="text-sm text-slate-600">{formatCurrency(request.amount)} · {request.paymentMethod}</p>
                <p className="text-xs text-slate-500">TXN: {request.transactionId || '—'}</p>
                <p className="text-xs text-slate-400">Submitted: {formatDateTime(request.requestedAt)}</p>

                <div className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold ${meta.className}`}>
                  Status: {meta.label}
                  {request.status === 'Rejected' && (
                    <p className="mt-1 font-normal text-rose-600">Reason: {request.rejectionReason}</p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {request.receiptImageUrl && (
                    <a
                      href={request.receiptImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      View Receipt Image 🖼️
                    </a>
                  )}
                  {request.status === 'Rejected' && (
                    <button
                      onClick={() => setRetryModal({ installmentNumber: request.installmentNumber, amount: request.amount })}
                      className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {retryModal && (
        <PayNowModal
          installmentNumber={retryModal.installmentNumber}
          amount={retryModal.amount}
          onClose={() => setRetryModal(null)}
          onSuccess={invalidatePortalQueries}
        />
      )}
    </div>
  );
}
