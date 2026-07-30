import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import StatCard from '../components/ui/StatCard';
import PaymentModal from '../components/shared/PaymentModal';
import WhatsAppSendModal from '../components/shared/WhatsAppSendModal';
import { SkeletonStatCard } from '../components/ui/Skeleton';
import { usePendingPaymentRequests } from '../hooks/usePendingPaymentRequests';
import api from '../api/axios';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

async function fetchStats() {
  const { data } = await api.get('/dashboard/stats');
  return data;
}

async function fetchRevenue() {
  const { data } = await api.get('/dashboard/monthly-revenue');
  return data;
}

async function fetchOverdueCustomers() {
  const { data } = await api.get('/dashboard/overdue-customers');
  return data;
}

async function fetchSchedule() {
  const { data } = await api.get('/sales/today-due');
  return data;
}

export default function Dashboard() {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [whatsAppCustomer, setWhatsAppCustomer] = useState(null);

  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchStats });
  const { data: monthlyRevenue, isLoading: revenueLoading } = useQuery({ queryKey: ['dashboard-revenue'], queryFn: fetchRevenue });
  const { data: overdueCustomers = [], isLoading: overdueLoading } = useQuery({ queryKey: ['dashboard-overdue'], queryFn: fetchOverdueCustomers });
  const { data: schedule = [], isLoading: scheduleLoading } = useQuery({ queryKey: ['dashboard-schedule'], queryFn: fetchSchedule });
  const { data: pendingRequests = [] } = usePendingPaymentRequests();
  const pendingCount = pendingRequests.length;

  const pendingCard = useMemo(() => {
    if (pendingCount === 0) {
      return { title: 'Pending Approvals', value: 'All Clear ✅', hint: 'No payment requests waiting', icon: '✅', iconClassName: 'bg-emerald-100 text-emerald-700', tone: 'clear' };
    }
    if (pendingCount <= 3) {
      return { title: 'Pending Approvals', value: `${pendingCount} Pending ⏳`, hint: 'Awaiting your review', icon: '⏳', iconClassName: 'bg-amber-100 text-amber-700', tone: 'warn' };
    }
    return { title: 'Pending Approvals', value: `${pendingCount} Pending ⚠️`, hint: 'Needs urgent attention', icon: '⚠️', iconClassName: 'bg-rose-100 text-rose-700', tone: 'urgent' };
  }, [pendingCount]);

  const chartData = useMemo(() => {
    if (!Array.isArray(monthlyRevenue)) return [];
    return monthlyRevenue.slice(-6).map((item) => ({
      month: item.month || item.label || '—',
      revenue: Number(item.revenue || item.amount || 0),
    }));
  }, [monthlyRevenue]);

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { title: 'Total Customers', value: stats.totalCustomers ?? 0, hint: 'Growing steadily', icon: '👥', iconClassName: 'bg-cyan-100 text-cyan-700' },
      { title: 'Total Sales', value: formatCurrency(stats.totalSales ?? 0), hint: 'This month', icon: '💰', iconClassName: 'bg-emerald-100 text-emerald-700' },
      { title: 'Outstanding Balance', value: formatCurrency(stats.outstanding ?? 0), hint: 'Pending collection', icon: '📋', iconClassName: 'bg-amber-100 text-amber-700' },
      { title: "Today's Collection", value: formatCurrency(stats.todayCollection ?? 0), hint: 'Collected today', icon: '⚠️', iconClassName: 'bg-rose-100 text-rose-700' },
    ];
  }, [stats]);

  const handleSendSms = () => {
    toast.success('SMS reminders queued for overdue customers');
  };

  const handleCollect = (item) => {
    setSelectedItem(item);
    setPaymentOpen(true);
  };

  const handleSendWhatsApp = (customer) => {
    setWhatsAppCustomer(customer);
    setWhatsAppOpen(true);
  };

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-amber-800">
            ⏳ {pendingCount} payment request{pendingCount === 1 ? ' is' : 's are'} waiting for your approval
          </p>
          <Link to="/payment-requests" className="text-sm font-semibold text-amber-900 underline whitespace-nowrap">
            Review Now →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? Array.from({ length: 4 }).map((_, index) => <SkeletonStatCard key={index} />) : statCards.length > 0 ? statCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            hint={card.hint}
            icon={card.icon}
            iconClassName={card.iconClassName}
          />
        )) : <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No dashboard stats available yet.</div>}
        <StatCard
          title={pendingCard.title}
          value={pendingCard.value}
          hint={pendingCard.hint}
          icon={pendingCard.icon}
          iconClassName={pendingCard.iconClassName}
          cardClassName={pendingCard.tone === 'urgent' ? 'animate-pulse border-rose-300 bg-rose-50' : pendingCard.tone === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Monthly Revenue</h3>
            <span className="text-sm text-slate-500">Last 6 months</span>
          </div>
          {revenueLoading ? (
            <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          ) : chartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#06B6D4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">No monthly revenue data available.</div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Overdue Customers</h3>
            <button onClick={handleSendSms} className="btn btn-outline btn-sm">
              Send SMS
            </button>
          </div>
          {overdueLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : overdueCustomers.length > 0 ? (
            <div className="space-y-3">
              {overdueCustomers.slice(0, 5).map((customer, index) => {
                const name = customer.customerName || customer.name || 'Customer';
                const amount = customer.remainingAmount ?? customer.amount ?? 0;
                const initials = name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase();
                const daysOverdue = customer.daysOverdue ?? 0;
                return (
                  <div key={`${name}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 text-sm font-semibold text-white">{initials}</div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500">{daysOverdue} days overdue</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-danger">{formatCurrency(amount)}</span>
                      <button
                        onClick={() => handleSendWhatsApp(customer)}
                        title="Send WhatsApp"
                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                      >
                        💬
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No overdue customers right now.</div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Today's Schedule</h3>
        </div>
        {scheduleLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : schedule.length > 0 ? (
          <div className="table-container">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Amount Due</th>
                  <th className="hidden px-6 py-3 sm:table-cell">Installment #</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {schedule.map((item) => {
                  const statusTone = item.status === 'Overdue' ? 'badge-danger' : item.status === 'Tomorrow' ? 'badge-info' : 'badge-warning';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{item.customer?.fullName || item.customerName || '—'}</td>
                      <td className="px-6 py-3 text-slate-600">{item.product?.name || item.productName || '—'}</td>
                      <td className="px-6 py-3 text-slate-900">{formatCurrency(item.remainingAmount ?? item.amountDue ?? 0)}</td>
                      <td className="hidden px-6 py-3 text-slate-600 sm:table-cell">{item.installmentNumber ?? '—'}</td>
                      <td className="px-6 py-3"><span className={`badge ${statusTone}`}>{item.status || 'Due Today'}</span></td>
                      <td className="px-6 py-3">
                        <button onClick={() => handleCollect(item)} className="btn btn-primary btn-sm">
                          Collect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-500">No schedule items for today.</div>
        )}
      </div>

      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} sale={selectedItem} />
      <WhatsAppSendModal open={whatsAppOpen} onClose={() => setWhatsAppOpen(false)} customer={whatsAppCustomer} />
    </div>
  );
}
