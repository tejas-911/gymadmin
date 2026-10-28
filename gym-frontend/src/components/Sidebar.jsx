import React, { useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  UserSquare2,
  Swords,
  Dumbbell,
  BarChart3,
  LogOut,
  Activity,
  ShoppingBag,
  ClipboardList,
  Database,
  X
} from 'lucide-react';

const navItems = [
  { path: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { path: '/members', icon: <Users size={18} />, label: 'Members' },
  { path: '/attendance', icon: <Calendar size={18} />, label: 'Attendance' },
  { path: '/payments', icon: <CreditCard size={18} />, label: 'Payments' },
  { path: '/trainers', icon: <UserSquare2 size={18} />, label: 'Trainers' },
  { path: '/plans', icon: <Swords size={18} />, label: 'Classes' },
  { path: '/equipment', icon: <Dumbbell size={18} />, label: 'Equipment' },
  { path: '/supplements', icon: <ShoppingBag size={18} />, label: 'Supplements' },
  { path: '/assign', icon: <ClipboardList size={18} />, label: 'Assign Plans' },
  { path: '/reports', icon: <BarChart3 size={18} />, label: 'Metrics' },
  { path: '/db', icon: <Database size={18} />, label: 'DB Features' },
];

// Pinned column from lg up; below that an off-canvas drawer opened from the top bar.
export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Wait a tick: the drawer is still visibility:hidden on the frame it opens
    const t = setTimeout(() => ref.current?.querySelector('a')?.focus(), 50);
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      onClose();
      document.getElementById('nav-toggle')?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside id="app-sidebar" ref={ref} className={`sidebar ${open ? 'is-open' : ''}`}>
        {/* Logo */}
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="p-2 bg-iron-lime rounded-lg flex items-center justify-center text-on-accent">
            <Activity size={24} strokeWidth={3} />
          </div>
          <div className="flex flex-col flex-1">
            <span className="font-space font-bold text-lg tracking-tighter leading-none text-fg">IronCore</span>
            <span className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] mt-1">Precision GMS</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden w-10 h-10 -mr-2 rounded-lg flex items-center justify-center text-iron-text-secondary hover:text-fg hover:bg-fg/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-4 px-6 py-2.5 transition-colors duration-200 relative ${
                  isActive
                    ? 'text-iron-lime bg-iron-lime/10'
                    : 'text-iron-text-secondary hover:text-fg hover:bg-fg/[0.04]'
                }`}
              >
                {item.icon}
                <span className="font-space font-bold text-xs tracking-widest">{item.label}</span>
                {isActive && <div aria-hidden="true" className="absolute right-0 top-0 bottom-0 w-1 bg-iron-lime" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <footer className="pt-4 mt-auto border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-3 text-iron-text-secondary hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
            <span className="font-space font-bold text-xs tracking-widest">Logout</span>
          </button>
        </footer>
      </aside>
    </>
  );
}
