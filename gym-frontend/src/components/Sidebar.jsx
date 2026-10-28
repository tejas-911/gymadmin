import React from 'react';
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
  Database
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

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

  return (
    <aside className="sidebar shadow-2xl">
      {/* Logo */}
      <div className="px-6 mb-12 flex items-center gap-3">
        <div className="p-2 bg-iron-lime rounded-lg flex items-center justify-center text-dark">
          <Activity size={24} strokeWidth={3} />
        </div>
        <div className="flex flex-col">
          <span className="font-space font-bold text-lg tracking-tighter leading-none" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>IronCore</span>
          <span className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] mt-1">Precision GMS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`
                flex items-center gap-4 px-6 py-3 transition-all duration-200 group relative
                ${isActive
                  ? 'text-iron-lime bg-iron-lime/10'
                  : isLight
                    ? 'text-iron-text-secondary hover:text-[#0A0A0E] hover:bg-black/[0.04]'
                    : 'text-iron-text-secondary hover:text-white hover:bg-white/[0.02]'
                }
              `}
            >
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </div>
              <span className="font-space font-bold text-xs tracking-widest">{item.label}</span>
              {isActive && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 bg-iron-lime"
                  style={{ boxShadow: isLight ? '0 0 10px rgba(37,99,235,0.4)' : '0 0 10px rgba(223,255,0,0.5)' }}
                ></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <footer className="pt-8 mt-auto border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-6 py-4 text-iron-text-secondary hover:text-red-400 transition-colors group"
        >
          <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
          <span className="font-space font-bold text-xs tracking-widest">Logout</span>
        </button>
      </footer>
    </aside>
  );
}
