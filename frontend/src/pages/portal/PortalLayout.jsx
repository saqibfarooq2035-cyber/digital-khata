import { NavLink, Outlet } from 'react-router-dom';
import { Home, CreditCard, Calendar, Receipt, ClipboardList } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';

const ACTIVE_COLOR = '#06B6D4';
const INACTIVE_COLOR = '#94A3B8';

const navItems = [
  { to: '/portal', label: 'Home', Icon: Home, end: true },
  { to: '/portal/payments', label: 'Pay', Icon: CreditCard },
  { to: '/portal/requests', label: 'Requests', Icon: ClipboardList },
  { to: '/portal/schedule', label: 'Schedule', Icon: Calendar },
  { to: '/portal/receipts', label: 'Receipts', Icon: Receipt },
];

export default function PortalLayout() {
  const { user, logout } = useAuthContext();

  return (
    <div className="min-h-screen bg-[#ECFEFF]">
      <header
        className="fixed inset-x-0 top-0 z-40 flex h-[60px] items-center justify-between px-4"
        style={{ background: 'linear-gradient(135deg, #004D5C, #06B6D4)' }}
      >
        <span className="text-base font-semibold text-white">📒 Digital Khata</span>
        <span className="truncate px-2 text-sm font-bold text-white">{user?.fullName || 'Customer'}</span>
        <button
          onClick={logout}
          className="rounded-lg border border-white/50 px-2.5 py-1 text-xs font-semibold text-white"
        >
          Logout
        </button>
      </header>

      <main className="min-h-[calc(100vh-120px)] p-4 pt-[76px] pb-[76px]">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[60px] justify-evenly border-t-2 border-[#CFFAFE] bg-white">
        {navItems.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="flex flex-1 flex-col items-center justify-center gap-0.5">
            {({ isActive }) => {
              const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
              return (
                <>
                  <Icon size={22} color={color} />
                  <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ backgroundColor: isActive ? ACTIVE_COLOR : 'transparent' }}
                  />
                </>
              );
            }}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
