import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPortalSchedule } from '../../api/portal';
import { getMyRequests } from '../../api/paymentRequest';
import PayNowModal from '../../components/portal/PayNowModal';
import { SkeletonListRows } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const STATUS_META = {
  Paid: { dot: '🟢', icon: '✅' },
  Overdue: { dot: '🔴', icon: '⚠️' },
  'Due Today': { dot: '🟡', icon: '⏰' },
  Upcoming: { dot: '⚪', icon: '○' },
};

function daysLate(dueDate) {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today - due) / 86400000));
}

export default function PortalSchedule() {
  const queryClient = useQueryClient();
  const [payModal, setPayModal] = useState(null);

  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ['portal-schedule'],
    queryFn: () => getPortalSchedule().then((res) => res.data),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['portal-my-requests'],
    queryFn: () => getMyRequests().then((res) => res.data),
  });

  const latestRequestByInstallment = useMemo(() => {
    const map = {};
    for (const request of myRequests) {
      if (!(request.installmentNumber in map)) {
        map[request.installmentNumber] = request;
      }
    }
    return map;
  }, [myRequests]);

  function invalidatePortalQueries() {
    queryClient.invalidateQueries({ queryKey: ['portal-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['portal-schedule'] });
    queryClient.invalidateQueries({ queryKey: ['portal-payments'] });
    queryClient.invalidateQueries({ queryKey: ['portal-my-requests'] });
  }

  const total = schedule.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paid = schedule.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
  const remaining = Math.max(0, total - paid);
  const paidCount = schedule.filter((item) => item.status === 'Paid').length;
  const percent = schedule.length > 0 ? Math.round((paidCount / schedule.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900" dir="auto">📅 قسط کا شیڈول (Installment Schedule)</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
          <p className="text-xs text-slate-500">Total</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(total)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
          <p className="text-xs text-slate-500">Paid</p>
          <p className="mt-1 text-sm font-bold text-emerald-600">{formatCurrency(paid)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
          <p className="text-xs text-slate-500">Remaining</p>
          <p className="mt-1 text-sm font-bold text-rose-600">{formatCurrency(remaining)}</p>
        </div>
      </div>

      {isLoading ? (
        <SkeletonListRows rows={8} />
      ) : schedule.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No installment plan found.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {schedule.map((item, index) => {
            const meta = STATUS_META[item.status] || STATUS_META.Upcoming;
            const isLast = index === schedule.length - 1;
            const request = item.status !== 'Paid' ? latestRequestByInstallment[item.installmentNumber] : null;
            return (
              <div key={item.installmentNumber} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-lg leading-none">{meta.dot}</span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                </div>
                <div className={`min-w-0 flex-1 ${isLast ? 'pb-1' : 'pb-4'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">Installment #{item.installmentNumber}</p>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-900">
                      {formatCurrency(item.amount)} <span>{meta.icon}</span>
                    </span>
                  </div>
                  {item.status === 'Paid' && (
                    <>
                      <p className="text-xs text-slate-500">Due: {formatDate(item.dueDate)}</p>
                      <p className="text-xs text-emerald-600">Paid: {formatDate(item.paidDate)} · {item.paidMethod}</p>
                    </>
                  )}
                  {item.status === 'Overdue' && (
                    <>
                      <p className="text-xs text-slate-500">Due: {formatDate(item.dueDate)}</p>
                      <p className="text-xs font-semibold text-rose-600">⚠️ OVERDUE — {daysLate(item.dueDate)} days late</p>
                    </>
                  )}
                  {item.status === 'Due Today' && (
                    <>
                      <p className="text-xs text-slate-500">Due: Today</p>
                      <p className="text-xs font-semibold text-amber-600">Pay now!</p>
                    </>
                  )}
                  {item.status === 'Upcoming' && (
                    <p className="text-xs text-slate-500">Due: {formatDate(item.dueDate)}</p>
                  )}
                  {request?.status === 'Pending' && (
                    <span className="mt-1.5 inline-block rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      ⏳ Approval Pending
                    </span>
                  )}
                  {request?.status === 'Rejected' && (
                    <>
                      <p className="mt-1 text-xs font-semibold text-rose-600">❌ Rejected</p>
                      <button
                        onClick={() => setPayModal({ installmentNumber: item.installmentNumber, amount: item.amount })}
                        className="mt-1 rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white"
                      >
                        💳 Pay Again
                      </button>
                    </>
                  )}
                  {item.status !== 'Paid' && !request && (
                    <button
                      onClick={() => setPayModal({ installmentNumber: item.installmentNumber, amount: item.amount })}
                      className={`mt-1.5 rounded-lg px-3 py-1 text-xs font-semibold text-white ${item.status === 'Overdue' ? 'bg-rose-600' : 'bg-cyan-600'}`}
                    >
                      💳 Pay
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="mt-2 border-t border-slate-100 pt-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">
              {paidCount}/{schedule.length} installments · {percent}% complete
            </p>
          </div>
        </div>
      )}

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
