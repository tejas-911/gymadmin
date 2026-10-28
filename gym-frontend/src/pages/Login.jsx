import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../api';
import { Activity, Mail, Lock, UserCog, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@gym.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed! Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-dark flex items-center justify-center p-6 relative overflow-hidden font-manrope">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-iron-lime/5 rounded-full blur-[120px] -mr-64 -mt-64"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-iron-blue/5 rounded-full blur-[120px] -ml-64 -mb-64"></div>
      
      <div className="w-full max-w-[440px] z-10">
        {/* Logo/Branding */}
        <div className="text-center mb-10 group">
          <div className="inline-flex p-4 bg-fg/[0.03] border border-fg/5 rounded-2xl mb-6 group-hover:border-iron-lime/30 group-hover:bg-fg/[0.05] transition-all duration-500">
            <Activity size={40} className="text-iron-lime" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-space font-bold tracking-tighter text-fg mb-2">IronCore</h1>
          <p className="text-iron-text-secondary font-bold text-xs tracking-[0.3em]">Precision Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-border rounded-[2rem] p-10 shadow-2xl relative overflow-hidden group/card hover:border-iron-lime/20 transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-iron-lime/30 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-700"></div>

          <form onSubmit={handleLogin} className="space-y-6">
             {/* Simplified Login - Automated Role Detection */}
            <p className="text-xs text-iron-text-secondary">Both fields are required.</p>

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-xs font-bold text-iron-text-secondary tracking-widest ml-1">Email</label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-iron-text-secondary group-focus-within/input:text-iron-lime transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@ironcore.com"
                  className="w-full bg-fg/[0.03] border border-fg/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-fg placeholder:text-fg/10 focus:outline-none focus:border-iron-lime/30 focus:bg-fg/[0.05] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-xs font-bold text-iron-text-secondary tracking-widest ml-1">Password</label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-iron-text-secondary group-focus-within/input:text-iron-lime transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-fg/[0.03] border border-fg/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-fg placeholder:text-fg/10 focus:outline-none focus:border-iron-lime/30 focus:bg-fg/[0.05] transition-all"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-lg flex items-center gap-3 animate-shake">
                <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full bg-iron-lime text-on-accent font-space font-bold text-sm tracking-widest py-4 rounded-xl 
                flex items-center justify-center gap-2 transition-all duration-300
                ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_4px_30px_rgba(0,0,0,0.25)] hover:scale-[1.02] active:scale-[0.98] shadow-lg'}
              `}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>Sign in</span>
                  <Activity size={16} />
                </>
              )}
            </button>
          </form>

          {/* Card Footer */}
          <div className="mt-10 pt-8 border-t border-fg/5 text-center">
            <p className="text-xs text-iron-text-secondary font-bold tracking-widest mb-3">Authorized Access Only</p>
            <div className="inline-flex items-center gap-3 bg-fg/[0.02] px-4 py-2 rounded-full border border-fg/5 group-hover/card:border-iron-lime/10 transition-colors">
              <span className="text-xs text-iron-text-secondary font-medium">Demo:</span>
              <span className="text-xs text-iron-lime font-bold">admin@gym.com</span>
              <span className="text-xs text-iron-text-secondary">|</span>
              <span className="text-xs text-iron-lime font-bold">admin123</span>
            </div>
          </div>
        </div>

        {/* System Footer */}
        <footer className="text-center mt-12 text-xs text-iron-text-secondary font-bold tracking-[0.2em]">
          &copy; {new Date().getFullYear()} IronCore Precision
        </footer>
      </div>
    </main>
  );
}
