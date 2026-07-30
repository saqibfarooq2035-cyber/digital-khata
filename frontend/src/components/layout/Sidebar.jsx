import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '../../context/AuthContext';
import { usePendingPaymentRequests } from '../../hooks/usePendingPaymentRequests';
import api from '../../api/axios';

const fetchSales = async () => {
  const { data } = await api.get('/sales');
  return data || [];
};

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
  return Math.min(duration, Math.max(0, Math.round(paidViaInstallments / installment)));
}

const navGroups = [
  {
    title: 'Customers',
    items: [
      { to: '/customers', label: 'Customers', icon: '👥', badge: 4 },
    ],
  },
  {
    title: 'Products',
    items: [{ to: '/products', label: 'Products', icon: '📦' }],
  },
  {
    title: 'Sales',
    items: [{ to: '/sales', label: 'Sales & Plans', icon: '🛒' }],
  },
  {
    title: 'Payments',
    items: [
      { to: '/payments', label: 'Payments', icon: '💳' },
      { to: '/payment-requests', label: 'Payment Requests', icon: '📥' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { to: '/receipts', label: 'Receipts', icon: '🧾' },
      { to: '/sms', label: 'SMS Reminders', icon: '📱' },
      { to: '/whatsapp', label: 'WhatsApp', icon: '💬' },
    ],
  },
  {
    title: 'Admin',
    items: [{ to: '/staff', label: 'Staff Management', icon: '🧑‍💼' }],
  },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuthContext();
  const { data: sales = [] } = useQuery({ queryKey: ['sales'], queryFn: fetchSales });
  const { data: pendingRequests = [] } = usePendingPaymentRequests();

  const pendingWhatsAppCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sales.filter((sale) => {
      if (!sale.remainingAmount || sale.remainingAmount <= 0) return false;
      const paid = paidInstallments(sale);
      const nextDue = addMonths(sale.firstDueDate, paid);
      nextDue.setHours(0, 0, 0, 0);
      const diffDays = Math.round((nextDue - today) / 86400000);
      return diffDays <= 0;
    }).length;
  }, [sales]);

  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-cyan-600/20 bg-gradient-to-b from-[#003D4A] via-[#004D5C] to-[#005F70] text-slate-100 shadow-2xl shadow-cyan-950/40">
      <div className="flex items-center gap-3 border-b border-[rgba(6,182,212,0.2)] bg-black/10 px-4 py-5">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#06B6D4] to-[#0EA5E9] text-xl shadow-[0_4px_12px_rgba(6,182,212,0.4)]">
          ⚡
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold text-cyan-200">Digital Khata</p>
          <p className="truncate text-[10px] text-cyan-200/50">Electric Cyan Theme</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-0.5">
            <p className="px-3 pb-1 pt-4 text-[9px] font-semibold uppercase tracking-[1.5px] text-cyan-200/40">{group.title}</p>
            {group.items.map((item) => {
              const badge = item.to === '/whatsapp'
                ? pendingWhatsAppCount || null
                : item.to === '/payment-requests'
                  ? pendingRequests.length || null
                  : item.badge;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose?.()}
                  className={({ isActive }) =>
                    `mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? 'border-l-[3px] border-cyan-400 bg-gradient-to-r from-[rgba(6,182,212,0.25)] to-[rgba(6,182,212,0.1)] font-bold text-cyan-300'
                        : 'border-l-[3px] border-transparent text-cyan-100/75 hover:translate-x-0.5 hover:bg-[rgba(6,182,212,0.15)] hover:text-cyan-200'
                    }`
                  }
                >
                  <span className="w-[18px] shrink-0 text-center text-[15px]">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {badge ? (
                    <span className="ml-auto animate-pulse rounded-full bg-rose-500 px-[7px] py-0.5 text-[10px] font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[rgba(6,182,212,0.15)] bg-black/15 p-3.5">
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#06B6D4] to-[#0891B2] text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(6,182,212,0.3)]">
            {(user?.username || 'A').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-cyan-200">{user?.username || 'Admin'}</p>
            <p className="truncate text-[10px] text-cyan-200/40">{user?.role || 'Admin'}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            onClose?.();
          }}
          className="w-full rounded-md border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.15)] px-2.5 py-[5px] text-[11px] font-semibold text-[#FCA5A5] transition-all duration-200 hover:bg-[rgba(239,68,68,0.3)]"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
