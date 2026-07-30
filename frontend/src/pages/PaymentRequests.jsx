import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { approvePaymentRequest, getAllRequests, rejectPaymentRequest } from '../api/paymentRequest';
import { SkeletonListRows } from '../components/ui/Skeleton';
import { getPaymentRequestStatusMeta } from '../utils/paymentRequestStatus';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { notifyError, notifySuccess } from '../utils/notify';

const TABS = ['Pending', 'Approved', 'Rejected', 'All'];

function invalidateAll(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['payment-requests-pending'] });
  queryClient.invalidateQueries({ queryKey: ['payment-requests-all'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard-overdue'] });
}

export default function PaymentRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const queryClient = useQueryClient();

  const customerId = searchParams.get('customerId');
  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'Pending';

  const { data, isLoading } = useQuery({
    queryKey: ['payment-requests-all', tab, customerId],
    queryFn: () => getAllRequests({
      status: tab === 'All' ? undefined : tab,
      customerId: customerId || undefined,
      limit: 100,
    }).then((res) => res.data),
  });

  const requests = data?.items || [];

  const approveMutation = useMutation({
    mutationFn: (id) => approvePaymentRequest(id),
    onSuccess: () => {
      notifySuccess('Payment approved and recorded!');
      invalidateAll(queryClient);
    },
    onError: (error) => notifyError(error?.response?.data?.message || 'Unable to approve request'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectPaymentRequest(id, reason),
    onSuccess: () => {
      notifySuccess('Payment request rejected');
      invalidateAll(queryClient);
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: (error) => notifyError(error?.response?.data?.message || 'Unable to reject request'),
  });

  function setTab(nextTab) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextTab);
    setSearchParams(next);
  }

  function clearCustomerFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete('customerId');
    setSearchParams(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Payment Requests</h2>
          <p className="text-sm text-slate-500">Review customer-submitted payments and approve or reject them.</p>
        </div>
        {customerId && (
          <button onClick={clearCustomerFilter} className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 self-start">
            Filtering by customer #{customerId} — Clear ✕
          </button>
        )}
      </div>

      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === t ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SkeletonListRows rows={5} />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No {tab.toLowerCase()} payment requests.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const meta = getPaymentRequestStatusMeta(request.status);
            return (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{request.customerName}</p>
                    <p className="text-xs text-slate-500">{request.customerPhone}</p>
                    {request.productName && <p className="mt-1 text-xs text-slate-500">{request.productName}</p>}
                  </div>
                  <div className={`rounded-lg border px-3 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-400">Installment</p>
                    <p className="font-semibold text-slate-900">#{request.installmentNumber}{request.totalInstallments ? ` / ${request.totalInstallments}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Amount</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(request.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Method</p>
                    <p>{request.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">TXN ID</p>
                    <p>{request.transactionId || '—'}</p>
                  </div>
                </div>

                {request.notes && <p className="mt-2 text-xs italic text-slate-500">"{request.notes}"</p>}
                {request.status === 'Rejected' && request.rejectionReason && (
                  <p className="mt-2 text-xs font-semibold text-rose-600">Reason: {request.rejectionReason}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">Requested: {formatDate(request.requestedAt)}</p>
                  <div className="flex flex-wrap gap-2">
                    {request.receiptImageUrl && (
                      <a
                        href={request.receiptImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        View Receipt 🖼️
                      </a>
                    )}
                    {request.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => setRejectTarget(request)}
                          disabled={rejectMutation.isPending}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                        >
                          ❌ Reject
                        </button>
                        <button
                          onClick={() => approveMutation.mutate(request.id)}
                          disabled={approveMutation.isPending}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          ✅ Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">Reject Payment Request</h3>
            <p className="mb-4 text-sm text-slate-500">{rejectTarget.customerName} — {formatCurrency(rejectTarget.amount)}</p>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason *</label>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="e.g. Transaction ID not found"
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectReason.trim()) {
                    notifyError('Please provide a rejection reason');
                    return;
                  }
                  rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() });
                }}
                disabled={rejectMutation.isPending}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
