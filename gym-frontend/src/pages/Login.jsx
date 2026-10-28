import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
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
    <div className="min-h-screen bg-dark flex items-center justify-center p-6 relative overflow-hidden font-manrope">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-iron-lime/5 rounded-full blur-[120px] -mr-64 -mt-64"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-iron-blue/5 rounded-full blur-[120px] -ml-64 -mb-64"></div>
      
      <div className="w-full max-w-[440px] z-10">
        {/* Logo/Branding */}
        <div className="text-center mb-10 group">
          <div className="inline-flex p-4 bg-white/[0.03] border border-white/5 rounded-2xl mb-6 group-hover:border-iron-lime/30 group-hover:bg-white/[0.05] transition-all duration-500">
            <Activity size={40} className="text-iron-lime" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-space font-bold tracking-tighter text-white mb-2">IRONCORE</h1>
          <p className="text-iron-text-secondary font-bold text-xs uppercase tracking-[0.3em]">Precision Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-border rounded-[2rem] p-10 shadow-2xl relative overflow-hidden group/card hover:border-iron-lime/20 transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-iron-lime/30 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-700"></div>

          <form onSubmit={handleLogin} className="space-y-6">
             {/* Simplified Login - Automated Role Detection */}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-iron-text-secondary uppercase tracking-widest ml-1">Email Identifier</label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-iron-text-secondary group-focus-within/input:text-iron-lime transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@ironcore.com"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-iron-lime/30 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-iron-text-secondary uppercase tracking-widest ml-1">Security Key</label>
              <div className="relative group/input">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-iron-text-secondary group-focus-within/input:text-iron-lime transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-iron-lime/30 focus:bg-white/[0.05] transition-all"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-lg flex items-center gap-3 animate-shake">
                <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse"></div>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full bg-iron-lime text-dark font-space font-bold text-sm tracking-widest uppercase py-4 rounded-xl 
                flex items-center justify-center gap-2 transition-all duration-300
                ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_30px_rgba(223,255,0,0.3)] hover:scale-[1.02] active:scale-[0.98] shadow-lg'}
              `}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>Initialize Session</span>
                  <Activity size={16} />
                </>
              )}
            </button>
          </form>

          {/* Card Footer */}
          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-iron-text-secondary font-bold uppercase tracking-widest mb-3 italic">Authorized Access Only</p>
            <div className="inline-flex items-center gap-3 bg-white/[0.02] px-4 py-2 rounded-full border border-white/5 group-hover/card:border-iron-lime/10 transition-colors">
              <span className="text-xs text-iron-text-secondary font-medium">Demo:</span>
              <span className="text-xs text-iron-lime font-bold">admin@gym.com</span>
              <span className="text-xs text-white/20">|</span>
              <span className="text-xs text-iron-lime font-bold">admin123</span>
            </div>
          </div>
        </div>

        {/* System Footer */}
        <p className="text-center mt-12 text-xs text-white/20 font-bold uppercase tracking-[0.4em]">
          &copy; 2024 IRONCORE PRECISION • SECURE LOGON
        </p>
      </div>
    </div>
  );
}
