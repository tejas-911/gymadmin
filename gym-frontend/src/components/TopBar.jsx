import React from 'react';
import { Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function TopBar({ title, navOpen, onMenu }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';

  return (
    <header className="top-bar">
      <div className="flex items-center gap-3 min-w-0">
        <button
          id="nav-toggle"
          onClick={onMenu}
          aria-label="Open navigation"
          aria-controls="app-sidebar"
          aria-expanded={navOpen}
          className="lg:hidden w-10 h-10 -ml-2 shrink-0 rounded-lg flex items-center justify-center text-fg hover:bg-fg/5"
        >
          <Menu size={22} />
        </button>
        <h1 className="font-space font-bold text-[1.05rem] tracking-wider lg:text-[1.6rem] lg:tracking-widest text-fg truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-4 sm:gap-8 shrink-0">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          role="switch"
          aria-checked={isLight}
          aria-label="Light mode"
          title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
          className={`relative w-14 h-7 rounded-full transition-colors duration-300 flex items-center border ${isLight ? 'bg-iron-lime border-iron-lime' : 'bg-fg/10 border-fg/10 hover:border-fg/20'}`}
        >
          <span className={`absolute w-5 h-5 rounded-full flex items-center justify-center transition-[translate] duration-300 shadow-md bg-white ${isLight ? 'translate-x-7' : 'translate-x-1'}`}>
            {isLight
              ? <Moon size={11} className="text-iron-lime" />
              : <Sun size={11} className="text-ink" />
            }
          </span>
        </button>

        <div className="flex items-center gap-3 sm:pl-6 sm:border-l border-border">
          <div aria-hidden="true" className="w-9 h-9 rounded-full bg-iron-lime text-on-accent flex items-center justify-center text-xs font-bold font-space">
            AD
          </div>
          <span className="hidden sm:inline text-xs font-bold text-iron-lime tracking-widest">Admin</span>
        </div>
      </div>
    </header>
  );
}
