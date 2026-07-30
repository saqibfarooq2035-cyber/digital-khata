import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getPortalDashboard, getPortalPayments } from '../../api/portal';
import { getMyRequests } from '../../api/paymentRequest';
import { useAuthContext } from '../../context/AuthContext';
import PayNowModal from '../../components/portal/PayNowModal';
import { SkeletonBlock, SkeletonStatCard } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const SHOP_WHATSAPP = '923001234567';

function PaymentRequestStatusWidget({ customerId, onRetry }) {
  const { data: requests = [] } = useQuery({
    queryKey: ['portal-my-requests'],
    queryFn: () => getMyRequests().then((res) => res.data),
  });
  const [flashDismissed, setFlashDismissed] = useState(false);
  const latest = requests[0];

  useEffect(() => {
    if (latest?.status !== 'Approved') return undefined;

    const seenKey = `portal_seen_approved_request_${customerId}`;
    const seenId = localStorage.getItem(seenKey);
    if (String(latest.id) === seenId) {
      setFlashDismissed(true);
      return undefined;
    }

    localStorage.setItem(seenKey, String(latest.id));
    setFlashDismissed(false);
    const timer = window.setTimeout(() => setFlashDismissed(true), 5000);
    return () => window.clearTimeout(timer);
  }, [latest?.id, latest?.status, customerId]);

  if (!latest) return null;

  if (latest.status === 'Pending') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-800" dir="rtl">⏳ درخواست زیر غور ہے</p>
        <p className="mt-1 text-sm text-amber-700">
          Your payment request for Installment #{latest.installmentNumber} is pending admin approval.
        </p>
        <p className="text-xs text-amber-600">You'll receive WhatsApp notification soon.</p>
        <Link to="/portal/requests" className="mt-2 inline-block text-xs font-semibold text-amber-800 underline">
          View Request Status →
        </Link>
      </div>
    );
  }

  if (latest.status === 'Approved' && !flashDismissed) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-bold text-emerald-700" dir="rtl">✅ ادائیگی منظور!</p>
        <p className="mt-1 text-sm text-emerald-700">{formatCurrency(latest.amount)} payment has been approved!</p>
      </div>
    );
  }

  if (latest.status === 'Rejected') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm font-bold text-rose-700" dir="rtl">❌ درخواست مسترد</p>
        <p className="mt-1 text-sm text-rose-600">Reason: {latest.rejectionReason}</p>
        <button
          onClick={() => onRetry({ installmentNumber: latest.installmentNumber, amount: latest.amount })}
          className="mt-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Try Again
        </button>
      </div>
    );
  }

  return null;
}

function StatCard({ emoji, labelUrdu, labelEn, value, valueColor, borderColor, sub, overdue, payButton }) {
  return (
    <div
      className={`rounded-2xl border-l-4 p-4 shadow-sm ${overdue ? 'bg-rose-50' : 'bg-white'}`}
      style={{ borderLeftColor: borderColor }}
    >
      <p className="text-xs text-slate-500">
        {emoji} {labelUrdu} <span className="text-slate-400">({labelEn})</span>
      </p>
      <p className="mt-1 text-xl font-bold" style={{ color: overdue ? '#EF4444' : valueColor }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      {overdue && <p className="mt-1 text-xs font-bold text-rose-600">OVERDUE ⚠️</p>}
      {payButton}
    </div>
  );
}

export default function PortalDashboard() {
  const { user, customerId } = useAuthContext();
  const queryClient = useQueryClient();
  const [payModal, setPayModal] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: () => getPortalDashboard().then((res) => res.data),
  });

  const { data: payments } = useQuery({
    queryKey: ['portal-payments'],
    queryFn: () => getPortalPayments().then((res) => res.data),
    enabled: Boolean(data),
  });

  function invalidatePortalQueries() {
    queryClient.invalidateQueries({ queryKey: ['portal-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['portal-schedule'] });
    queryClient.invalidateQueries({ queryKey: ['portal-payments'] });
    queryClient.invalidateQueries({ queryKey: ['portal-my-requests'] });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-28 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No purchase history found on your account yet.
      </div>
    );
  }

  const fullName = data.customerName || user?.fullName || '';
  const firstName = fullName.split(' ')[0] || fullName;
  const recentPayments = (payments || []).slice(0, 3);
  const nextInstallmentNumber = data.paidInstallments + 1;

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div
        className="rounded-2xl p-5 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #004D5C, #06B6D4)' }}
      >
        <p className="text-lg font-bold">السلام علیکم, {firstName} صاحب! 👋</p>
        <p className="mt-1 text-sm text-cyan-50">آپ کی قسط کی تفصیل یہاں ہے</p>
        <p className="mt-3 text-xs text-cyan-100">Welcome, {fullName}</p>
        <p className="mt-2 text-sm font-semibold">{data.productName}</p>
        <p className="text-xs text-cyan-100">Sale Date: {formatDate(data.saleDate)}</p>
      </div>

      <PaymentRequestStatusWidget customerId={customerId} onRetry={setPayModal} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          emoji="💰"
          labelUrdu="کل خریداری"
          labelEn="Total Purchase"
          value={formatCurrency(data.totalPurchase)}
          borderColor="#06B6D4"
        />
        <StatCard
          emoji="✅"
          labelUrdu="ادا شدہ"
          labelEn="Total Paid"
          value={formatCurrency(data.totalPaid)}
          valueColor="#22C55E"
          borderColor="#22C55E"
        />
        <StatCard
          emoji="🔴"
          labelUrdu="باقی رقم"
          labelEn="Remaining"
          value={formatCurrency(data.remainingBalance)}
          valueColor="#EF4444"
          borderColor="#EF4444"
        />
        <StatCard
          emoji="📅"
          labelUrdu="اگلی قسط"
          labelEn="Next Due"
          value={data.nextDueDate ? formatDate(data.nextDueDate) : '—'}
          sub={data.nextDueDate ? formatCurrency(data.nextDueAmount) : null}
          borderColor="#06B6D4"
          overdue={data.isOverdue}
          payButton={data.nextDueDate && !data.isOverdue ? (
            <button
              onClick={() => setPayModal({ installmentNumber: nextInstallmentNumber, amount: data.nextDueAmount })}
              className="mt-2 w-full rounded-lg bg-cyan-600 px-2 py-1.5 text-xs font-semibold text-white shadow"
            >
              💳 Pay Now — {formatCurrency(data.nextDueAmount)}
            </button>
          ) : null}
        />
      </div>

      {/* Payment Progress */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">قسط کی پیشرفت (Payment Progress)</p>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>Paid: {formatCurrency(data.totalPaid)}</span>
          <span>Remaining: {formatCurrency(data.remainingBalance)}</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${data.progressPercent}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {data.paidInstallments} of {data.totalInstallments} installments paid
        </p>
      </div>

      {/* Overdue Alert */}
      {data.isOverdue && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-bold text-rose-700">⚠️ آپ کی قسط باقی ہے!</p>
          <p className="mt-1 text-sm text-rose-600">
            Your installment of {formatCurrency(data.nextDueAmount)} was due {data.overdueDays} day{data.overdueDays === 1 ? '' : 's'} ago
          </p>
          <p className="text-xs text-rose-500">Please contact the shop immediately</p>
          <button
            onClick={() => setPayModal({ installmentNumber: nextInstallmentNumber, amount: data.nextDueAmount })}
            className="mt-3 block w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow"
          >
            💳 Pay Overdue — {formatCurrency(data.nextDueAmount)}
          </button>
          <a
            href={`https://wa.me/${SHOP_WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-center text-sm font-semibold text-white shadow"
          >
            💬 Contact Shop on WhatsApp
          </a>
        </div>
      )}

      {/* Recent Payments */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">حالیہ ادائیگیاں (Recent Payments)</p>
          <Link to="/portal/payments" className="text-xs font-semibold text-cyan-600">View All</Link>
        </div>
        {recentPayments.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">No payments yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-700">
                  ✅ {payment.paymentType === 'DownPayment' ? 'Down Payment' : `Installment #${payment.installmentNumber}`}
                </span>
                <span className="text-xs text-slate-500">{formatDate(payment.paymentDate)} · {payment.paymentMethod}</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(payment.amountReceived)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3 pb-2">
        <a
          href={`https://wa.me/${SHOP_WHATSAPP}`}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-md"
        >
          💬 Contact Shop
        </a>
        <Link
          to="/portal/schedule"
          className="block w-full rounded-xl bg-cyan-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-md"
        >
          📅 View Schedule
        </Link>
      </div>

      {payModal && (
        <PayNowModal
          installmentNumber={payModal.installmentNumber}
          amount={payModal.amount}
          onClose={() => setPayModal(null)}
          onSuccess={invalidatePortalQueries}
        />
      )}
    </div>
  );
}
