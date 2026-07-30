import { useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const SWIPE_CLOSE_THRESHOLD = 60;

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const touchStartX = useRef(null);

  function handleTouchStart(event) {
    touchStartX.current = event.touches[0].clientX;
  }

  function handleTouchMove(event) {
    if (touchStartX.current === null) return;
    const deltaX = event.touches[0].clientX - touchStartX.current;
    if (deltaX < -SWIPE_CLOSE_THRESHOLD) {
      setMobileOpen(false);
      touchStartX.current = null;
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#ECFEFF]">
      <div
        className={`sidebar-overlay lg:hidden ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <div
        className={`sidebar-mobile shrink-0 lg:static lg:!transform-none lg:!shadow-none ${mobileOpen ? 'open' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <Sidebar onClose={() => setMobileOpen(false)} />
      </div>
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onToggleSidebar={() => setMobileOpen((value) => !value)} sidebarOpen={mobileOpen} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
