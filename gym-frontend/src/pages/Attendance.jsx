import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../api';
import {
  Users, TrendingUp, Clock, BarChart2, LogIn, LogOut,
  Download, Filter, ChevronDown, CheckCircle, AlertCircle,
  QrCode, Search, ChevronLeft, ChevronRight, Loader2, Info
} from 'lucide-react';

const API = `${API_BASE}/attendance`;

function getHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
}

function formatTime(datetime) {
  if (!datetime) return '—';
  return new Date(datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function downloadCSV(records) {
  const headers = ['Member ID', 'Member Name', 'In Time', 'Out Time', 'Duration (min)', 'Status'];
  const rows = records.map(r => [
    r.member_id,
    r.name,
    formatTime(r.check_in_time),
    formatTime(r.check_out_time),
    r.duration_minutes ?? '',
    r.check_out_time ? 'Completed' : 'Inside Now'
  ]);
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Attendance() {
  const [memberIdInput, setMemberIdInput] = useState('');
  const [actionMode, setActionMode] = useState('checkin'); // 'checkin' | 'checkout'
  const [actionFeedback, setActionFeedback] = useState(null); // { type: 'success'|'error', message }
  const [actionLoading, setActionLoading] = useState(false);

  const [stats, setStats] = useState({ currently_inside: 0, checked_in_today: 0, avg_session: 0, peak_hour: null });
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'inside' | 'completed'

  const PAGE_SIZE = 10;

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/stats`, { headers: getHeaders() });
      setStats(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchToday = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    if (reset) setLoadingRecords(true);
    else setLoadingMore(true);

    try {
      const { data } = await axios.get(`${API}/today`, {
        headers: getHeaders(),
        params: { limit: PAGE_SIZE, offset: currentOffset }
      });
      if (reset) {
        setRecords(data.records);
        setOffset(PAGE_SIZE);
      } else {
        setRecords(prev => [...prev, ...data.records]);
        setOffset(prev => prev + PAGE_SIZE);
      }
      setTotalRecords(data.total);
    } catch (err) { console.error(err); }
    finally {
      setLoadingRecords(false);
      setLoadingMore(false);
    }
  }, [offset]);

  useEffect(() => {
    fetchStats();
    fetchToday(true);
  }, [fetchStats, fetchToday]);

  const handleAction = async (mode = actionMode) => {
    const memberId = memberIdInput.trim();
    if (!memberId) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      const endpoint = mode === 'checkin' ? `${API}/checkin` : `${API}/checkout`;
      const { data } = await axios.post(endpoint, { member_id: memberId }, { headers: getHeaders() });
      setActionMode(mode);
      setActionFeedback({ type: 'success', message: data.message, member_name: data.member_name, time: data.time, member_status: data.member_status, mode });
      setMemberIdInput('');
      fetchStats();
      fetchToday(true);
      
      // Auto clear feedback after 5 seconds
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.response?.data?.message || 'Something went wrong. Please check the ID.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleAction(actionMode); };

  const filteredRecords = records.filter(r => {
    if (filterStatus === 'inside') return !r.check_out_time;
    if (filterStatus === 'completed') return !!r.check_out_time;
    return true;
  });

  const hasMore = records.length < totalRecords;

  return (
    <div className="space-y-8 pb-12 font-manrope">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div>
          <h2 className="text-4xl font-space font-bold tracking-tighter mb-2 text-fg">Attendance</h2>
          <p className="text-iron-text-secondary font-medium text-sm">Monitor facility access and member activity</p>
        </div>
      </div>

      {/* Top Grid: Scanner + Key Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Check-In Panel */}
        <div className="lg:col-span-1 card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-iron-lime/5 rounded-full blur-[50px] -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-iron-lime/10 flex items-center justify-center text-iron-lime">
              <QrCode size={16} />
            </div>
            <div>
              <h3 className="font-space font-bold tracking-widest text-fg">Quick Scan</h3>
              <p className="text-xs text-iron-text-secondary font-medium">Enter ID to grant entry or exit</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Member ID (e.g. 104)"
                aria-label="Member ID"
                value={memberIdInput}
                onChange={e => setMemberIdInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={10}
                className="w-full bg-surface border border-border rounded-xl px-4 py-4 text-center text-sm font-space font-bold tracking-[0.2em] outline-none focus:border-iron-lime transition-all placeholder:text-iron-text-secondary/50 placeholder:font-manrope placeholder:tracking-normal placeholder:font-normal text-fg"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleAction('checkin')}
                disabled={actionLoading || !memberIdInput.trim()}
                className="flex-1 flex justify-center items-center gap-2 bg-iron-lime text-on-accent py-3 rounded-xl font-space font-bold text-xs tracking-widest transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {actionLoading && actionMode === 'checkin' ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                Check In
              </button>
              <button
                onClick={() => handleAction('checkout')}
                disabled={actionLoading || !memberIdInput.trim()}
                className="flex-1 flex justify-center items-center gap-2 bg-fg/[0.03] text-fg border border-fg/10 py-3 rounded-xl font-space font-bold text-xs tracking-widest transition-all hover:bg-fg/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading && actionMode === 'checkout' ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                Check Out
              </button>
            </div>

            {/* Feedback Alert */}
            {actionFeedback && (
              <div role="status" className={`mt-4 p-4 rounded-xl text-xs flex items-start gap-3 border ${
                actionFeedback.type === 'success' ? 'bg-iron-lime/10 border-iron-lime/20 text-iron-lime' : 'bg-red-500/10 border-red-500/20 text-red-400'
              } animate-in fade-in slide-in-from-top-2 duration-300`}>
                {actionFeedback.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                <div className="flex flex-col">
                  {actionFeedback.type === 'success' && actionFeedback.member_name ? (
                    <>
                      <span className="font-bold mb-1 text-fg">{actionFeedback.member_name}</span>
                      <span className="opacity-80">Successfully checked {actionFeedback.mode === 'checkin' ? 'in' : 'out'} at {actionFeedback.time}.</span>
                      {actionFeedback.member_status && (
                        <div className="mt-2">
                          <span className="px-2 py-0.5 bg-iron-lime/20 text-iron-lime text-[11px] rounded font-bold tracking-widest">
                            {actionFeedback.member_status}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="font-medium">{actionFeedback.message}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-6">
          <div className="card flex flex-col justify-between group">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <Users size={18} />
              </div>
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[11px] font-bold tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Live
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] mb-1">Currently Inside</p>
              <p className="text-4xl font-space font-bold tracking-tighter text-fg">{stats.currently_inside}</p>
            </div>
          </div>
          
          <div className="card flex flex-col justify-between group">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-iron-lime/10 flex items-center justify-center text-iron-lime group-hover:scale-110 transition-transform">
                <TrendingUp size={18} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] mb-1">Checked In Today</p>
              <p className="text-4xl font-space font-bold tracking-tighter text-fg">{stats.checked_in_today}</p>
            </div>
          </div>

          <div className="card flex flex-col justify-between group">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-iron-blue/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Clock size={18} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] mb-1">Avg Session</p>
              <div className="flex items-baseline gap-1">
                <p className="text-4xl font-space font-bold tracking-tighter text-fg">{stats.avg_session || 0}</p>
                <span className="text-sm font-bold text-iron-text-secondary">min</span>
              </div>
            </div>
          </div>

          <div className="card flex flex-col justify-between group">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-lg bg-fg/[0.03] flex items-center justify-center text-fg/50 group-hover:scale-110 transition-transform">
                <BarChart2 size={18} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-iron-text-secondary tracking-[0.2em] mb-1">Peak Hour</p>
              <p className="text-2xl mt-2 font-space font-bold tracking-tighter text-fg">{stats.peak_hour || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="card !p-0 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-fg/[0.03] flex items-center justify-center text-iron-text-secondary">
              <BarChart2 size={16} />
            </div>
            <h3 className="text-fg font-space font-bold tracking-widest text-sm">Today's Activity Log</h3>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => downloadCSV(records)}
              className="flex items-center gap-2 px-4 py-2 bg-fg/[0.03] hover:bg-fg/[0.05] border border-fg/5 rounded-lg text-xs font-bold text-iron-text-secondary hover:text-fg tracking-widest transition-all"
            >
              <Download size={14} />
              Export
            </button>
            
            <div className="relative group/filter hover:z-50">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-fg/[0.03] hover:bg-fg/[0.05] border border-fg/5 rounded-lg text-xs font-bold text-iron-text-secondary hover:text-fg tracking-widest transition-all"
              >
                <Filter size={14} />
                {filterStatus === 'all' ? 'Filter' : filterStatus}
                <ChevronDown size={14} className="opacity-50 group-hover/filter:rotate-180 transition-transform" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-2xl opacity-0 invisible group-hover/filter:opacity-100 group-hover/filter:visible transition-all duration-200 overflow-hidden translate-y-2 group-hover/filter:translate-y-0 p-2">
                {[['all', 'All Activity'], ['inside', 'Currently Inside'], ['completed', 'Completed Sessions']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setFilterStatus(val); }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold tracking-widest transition-colors flex items-center justify-between ${
                      filterStatus === val ? 'bg-iron-lime/10 text-iron-lime' : 'text-iron-text-secondary hover:bg-black/5 hover:text-fg'
                    }`}
                  >
                    {label}
                    {filterStatus === val && <CheckCircle size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="iron-table relative">
            <thead>
              <tr className="bg-fg/[0.01]">
                <th>Member Details</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fg/[0.03]">
              {loadingRecords ? (
                <tr>
                  <td colSpan="5" className="py-20">
                    <div className="flex justify-center items-center gap-3 text-iron-text-secondary font-space tracking-widest text-xs">
                      <Loader2 size={16} className="animate-spin text-iron-lime" />
                      Syncing Records...
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-iron-text-secondary font-medium">
                    <div className="flex flex-col items-center gap-3">
                      <Info size={24} className="text-iron-text-secondary" />
                      No records found matching the current view.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const isInside = !record.check_out_time;
                  return (
                    <tr key={record.attendance_id} className="group hover:bg-fg/[0.02] transition-colors">
                      <td>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl bg-fg/[0.03] border border-fg/5 flex items-center justify-center font-bold text-xs transition-all ${isInside ? 'text-emerald-400 group-hover:border-emerald-500/30' : 'text-iron-text-secondary group-hover:border-fg/20'}`}>
                            {getInitials(record.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-fg group-hover:text-iron-lime transition-colors">{record.name}</span>
                            <span className="text-xs font-bold text-iron-text-secondary tracking-tighter">ID: IC-{record.member_id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <LogIn size={14} className="text-iron-text-secondary" />
                          <span className="text-xs text-fg/80 font-medium">{formatTime(record.check_in_time)}</span>
                        </div>
                      </td>
                      <td>
                        {record.check_out_time ? (
                          <div className="flex items-center gap-2">
                            <LogOut size={14} className="text-iron-text-secondary" />
                            <span className="text-xs text-fg/80 font-medium">{formatTime(record.check_out_time)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-iron-text-secondary font-medium tracking-widest">—</span>
                        )}
                      </td>
                      <td>
                        <span className="px-3 py-1 bg-fg/[0.03] text-iron-text-secondary border border-fg/5 rounded-lg text-xs font-bold tracking-widest flex w-fit items-center justify-center">
                          {formatDuration(record.duration_minutes)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                           {isInside ? (
                             <>
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                               <span className="text-xs font-bold tracking-widest text-emerald-400">Inside Now</span>
                             </>
                           ) : (
                             <>
                               <div className="w-1.5 h-1.5 rounded-full bg-iron-text-secondary"></div>
                               <span className="text-xs font-bold tracking-widest text-iron-text-secondary">Completed</span>
                             </>
                           )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {hasMore && !loadingRecords && (
          <div className="p-4 bg-fg/[0.01] border-t border-fg/[0.03] flex items-center justify-center">
            <button
               onClick={() => fetchToday(false)}
               disabled={loadingMore}
               className="flex items-center gap-2 px-6 py-2 bg-fg/[0.03] hover:bg-fg/[0.05] border border-fg/5 rounded-full text-xs font-bold text-fg tracking-widest transition-all disabled:opacity-50"
             >
               {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
               {loadingMore ? 'Loading More...' : 'Load Older Records'}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
