import React from 'react';
import { Search, Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function TopBar({ title }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="top-bar backdrop-blur-md px-10" style={{ background: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(10,10,14,0.8)' }}>
      <div className="font-space font-bold text-xl tracking-widest uppercase" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{title}</div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-6">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center border ${isLight
                ? 'bg-blue-601 border-blue-500'
                : 'bg-white/10 border-white/10 hover:border-white/20'
              }`}
          >
            <span className={`absolute w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${isLight
                ? 'translate-x-7 bg-white'
                : 'translate-x-1 bg-white/80'
              }`}>
              {isLight
                ? <Moon size={11} className="text-blue-600" />
                : <Sun size={11} className="text-dark" />
              }
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 pl-6 border-l border-border">
          <div className="w-9 h-9 rounded-full bg-surface border-2 border-iron-lime/20 p-0.5 overflow-hidden hover:border-iron-lime transition-all">
            <img
              src={`https://ui-avatars.com/api/?name=Admin&background=${isLight ? '2563EB' : 'DFFF00'}&color=${isLight ? 'FFFFFF' : '0A0A0E'}`}
              alt="Admin"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-iron-lime uppercase tracking-widest cursor-default">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
