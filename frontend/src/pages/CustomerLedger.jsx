import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { getAllRequests } from '../api/paymentRequest';
import PaymentModal from '../components/shared/PaymentModal';
import { SkeletonBlock } from '../components/ui/Skeleton';
import { getPaymentRequestStatusMeta } from '../utils/paymentRequestStatus';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

export default function CustomerLedger() {
  const { id } = useParams();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-ledger', id],
    queryFn: async () => {
      const { data: response } = await api.get(`/customers/${id}/ledger`);
      return response;
    },
  });

  const customer = data?.customer || {};
  const sales = data?.sales || [];
  const totalPurchase = useMemo(() => sales.reduce((sum, sale) => sum + Number(sale.totalPrice || 0), 0), [sales]);
  const totalPaid = useMemo(() => sales.reduce((sum, sale) => sum + (Number(sale.totalPrice || 0) - Number(sale.remainingAmount || 0)), 0), [sales]);
  const remainingBalance = Number(data?.balance || 0);
  const nextDueDate = useMemo(() => {
    const dates = sales
      .map((sale) => sale.firstDueDate)
      .filter(Boolean)
      .sort((left, right) => new Date(left) - new Date(right));
    return dates[0] ? formatDate(dates[0]) : '—';
  }, [sales]);

  const progressPercent = totalPurchase > 0 ? Math.min(100, Math.round((totalPaid / totalPurchase) * 100)) : 0;

  const { data: requestsData } = useQuery({
    queryKey: ['payment-requests-all', 'All', id],
    queryFn: () => getAllRequests({ customerId: id, limit: 50 }).then((res) => res.data),
    enabled: Boolean(id),
  });
  const paymentRequests = requestsData?.items || [];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-sky-500 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-100">Customer Ledger</p>
            <h2 className="mt-1 text-2xl font-semibold">{customer.fullName || 'Customer Ledger'}</h2>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-cyan-50">
              <span>CNIC: {customer.cnic || '—'}</span>
              <span>Phone: {customer.phoneNumber || '—'}</span>
              <span>Address: {customer.address || '—'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPaymentOpen(true)} className="rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur">
              Collect Payment
            </button>
            <button type="button" onClick={() => window.print()} className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold">
              Print Statement
            </button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Total Purchase', formatCurrency(totalPurchase)],
            ['Total Paid', formatCurrency(totalPaid)],
            ['Remaining Balance', formatCurrency(remainingBalance)],
            ['Next Due Date', nextDueDate],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-100">{label}</div>
              <div className="mt-1 text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <SkeletonBlock className="h-80 w-full" />
          <SkeletonBlock className="h-80 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Payment Progress</h3>
              <span className="text-sm text-slate-500">{progressPercent}% paid</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-5 space-y-3">
              {sales.length === 0 ? (
                <p className="text-sm text-slate-500">No sales recorded for this customer yet.</p>
              ) : (
                sales.map((sale) => {
                  const salePaid = Number(sale.totalPrice || 0) - Number(sale.remainingAmount || 0);
                  const salePercent = Number(sale.totalPrice || 0) > 0 ? Math.round((salePaid / Number(sale.totalPrice || 0)) * 100) : 0;
                  return (
                    <div key={sale.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">Sale #{sale.id}</div>
                          <div className="text-sm text-slate-500">{formatDate(sale.firstDueDate)}</div>
                        </div>
                        <div className="text-right text-sm text-slate-600">
                          <div>{formatCurrency(sale.totalPrice || 0)}</div>
                          <div className="font-semibold text-cyan-700">{salePercent}% paid</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span>Down payment: {formatCurrency(sale.downPayment || 0)}</span>
                        <span>Remaining: {formatCurrency(sale.remainingAmount || 0)}</span>
                        <span>Status: {sale.status || 'Active'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Installment Timeline</h3>
              <span className="text-sm text-slate-500">Activity history</span>
            </div>
            <div className="mt-4 space-y-3">
              {sales.length === 0 ? (
                <p className="text-sm text-slate-500">No installment activity yet.</p>
              ) : (
                sales.flatMap((sale) => [
                  ...((sale.payments || []).length > 0 ? sale.payments.map((payment) => ({
                    id: `${sale.id}-${payment.installmentNumber}`,
                    title: `Installment ${payment.installmentNumber}`,
                    subtitle: `${payment.paymentMethod || 'Cash'} • ${formatCurrency(payment.amountReceived || 0)}`,
                    date: payment.paymentDate,
                    state: 'paid',
                  })) : []),
                  {
                    id: `${sale.id}-pending`,
                    title: `Installment ${((sale.payments || []).length || 0) + 1}`,
                    subtitle: `Due ${formatDate(sale.firstDueDate)}`,
                    date: sale.firstDueDate,
                    state: sale.remainingAmount > 0 ? 'overdue' : 'pending',
                  },
                ]).map((entry) => {
                  const stateClasses = {
                    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                    overdue: 'border-rose-200 bg-rose-50 text-rose-700',
                    pending: 'border-slate-200 bg-slate-50 text-slate-500',
                  };
                  const icon = entry.state === 'paid' ? '✓' : entry.state === 'overdue' ? '!' : '○';
                  return (
                    <div key={entry.id} className={`flex items-start gap-3 rounded-2xl border p-3 ${stateClasses[entry.state]}`}>
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-current text-sm font-semibold">
                        {icon}
                      </div>
                      <div>
                        <div className="font-semibold">{entry.title}</div>
                        <div className="text-sm">{entry.subtitle}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.2em]">{formatDate(entry.date)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {paymentRequests.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Payment Requests</h3>
          <div className="space-y-3">
            {paymentRequests.map((request) => {
              const meta = getPaymentRequestStatusMeta(request.status);
              return (
                <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Installment #{request.installmentNumber} — {formatCurrency(request.amount)}</p>
                    <p className="text-xs text-slate-500">{request.paymentMethod} · TXN: {request.transactionId || '—'} · {formatDate(request.requestedAt)}</p>
                    {request.status === 'Rejected' && request.rejectionReason && (
                      <p className="text-xs font-semibold text-rose-600">Reason: {request.rejectionReason}</p>
                    )}
                  </div>
                  <span className={`rounded-lg border px-3 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} customer={customer} />
    </div>
  );
}
