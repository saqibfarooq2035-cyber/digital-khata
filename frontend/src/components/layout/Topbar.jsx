import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { usePendingPaymentRequests } from '../../hooks/usePendingPaymentRequests';
import { formatPKR } from '../../utils/formatCurrency';

const titleMap = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/products': 'Products',
  '/sales': 'Sales & Plans',
  '/payments': 'Payments',
  '/payment-requests': 'Payment Requests',
  '/receipts': 'Receipts',
  '/sms': 'SMS Reminders',
  '/whatsapp': 'WhatsApp',
  '/staff': 'Staff Management',
  '/reports': 'Reports',
  '/calendar': 'Payment Calendar',
  '/activity-log': 'Activity Log',
  '/staff-performance': 'Staff Performance',
  '/bulk-import': 'Bulk Import',
  '/notifications': 'Notifications',
  '/profit-loss': 'Profit & Loss',
};

function getTitle(pathname) {
  if (pathname.startsWith('/customers/') && pathname.endsWith('/ledger')) return 'Customer Ledger';
  if (pathname.startsWith('/customers')) return 'Customers';
  return titleMap[pathname] || 'Overview';
}

const fetchStats = async () => {
  const { data } = await api.get('/dashboard/stats');
  return data;
};

export default function Topbar({ onToggleSidebar, sidebarOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const title = getTitle(location.pathname);
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchStats });
  const { data: pendingRequests = [] } = usePendingPaymentRequests();
  const [bellOpen, setBellOpen] = useState(false);
  const pendingCount = pendingRequests.length;

  return (
    <header className="shrink-0 border-b border-cyan-200 bg-white/95 shadow-[0_2px_12px_rgba(6,182,212,0.08)] backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`hamburger ${sidebarOpen ? 'open' : ''}`}
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-700">Digital Khata</p>
            <h2 className="text-[16px] font-semibold text-slate-900 md:text-[18px]">{title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden rounded-[20px] bg-[#FEE2E2] px-3 py-1 text-[12px] font-bold text-[#DC2626] sm:block">
            Outstanding {stats ? formatPKR(stats.outstanding) : '—'}
          </div>
          <div className="hidden rounded-[20px] bg-[#DCFCE7] px-3 py-1 text-[12px] font-bold text-[#16A34A] sm:block">
            Today {stats ? formatPKR(stats.todayCollection) : '—'}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setBellOpen((value) => !value)}
              onBlur={() => window.setTimeout(() => setBellOpen(false), 150)}
              className="relative rounded-xl border border-cyan-200 bg-cyan-50 p-2 text-cyan-700"
              title="Payment request notifications"
            >
              🔔
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <button
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setBellOpen(false);
                    navigate('/payment-requests');
                  }}
                  className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {pendingCount > 0
                    ? `⏳ ${pendingCount} Payment Request${pendingCount === 1 ? '' : 's'} Pending`
                    : '✅ No pending payment requests'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
