import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../api';
import {
  CalendarDays, TrendingUp, Gauge, ChevronLeft, ChevronRight,
  Plus, X, Loader2, AlertCircle, CheckCircle, MoreHorizontal,
  Users, Clock, Trash2, ChevronDown, CalendarOff, Pencil
} from 'lucide-react';
import useDialog from '../hooks/useDialog';
import useDismiss from '../hooks/useDismiss';
import ConfirmDialog from '../components/ConfirmDialog';

const API = `${API_BASE}/classes`;

function getHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Colour palette per class ─────────────────────────────────────
const PALETTE = {
  lime:    { border: 'border-iron-lime',   text: 'text-iron-lime',   bg: 'bg-iron-lime/10',   hex: '#DFFF00' },
  orange:  { border: 'border-orange-400',  text: 'text-orange-400',  bg: 'bg-orange-400/10',  hex: '#FB923C' },
  blue:    { border: 'border-blue-400',    text: 'text-blue-400',    bg: 'bg-blue-400/10',    hex: '#60A5FA' },
  pink:    { border: 'border-pink-400',    text: 'text-pink-400',    bg: 'bg-pink-400/10',    hex: '#F472B6' },
  purple:  { border: 'border-purple-400',  text: 'text-purple-400',  bg: 'bg-purple-400/10',  hex: '#C084FC' },
  emerald: { border: 'border-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10', hex: '#34D399' },
};
const PALETTE_KEYS = Object.keys(PALETTE);

function pal(color) { return PALETTE[color] || PALETTE.lime; }

// ── Status badge ────────────────────────────────────────────────
const STATUS_CFG = {
  'Booking Open': 'bg-iron-lime/15 text-iron-lime border-iron-lime/20',
  'Full':         'bg-red-500/15 text-red-400 border-red-500/20',
  'Waitlist':     'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'Cancelled':    'bg-fg/5 text-iron-text-secondary border-fg/10',
  'Completed':    'bg-fg/5 text-iron-text-secondary/50 border-fg/5 grayscale',
  'In Progress':  'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-widest border ${STATUS_CFG[status] || STATUS_CFG['Booking Open']}`}>
      {status}
    </span>
  );
}

// ── Week helpers ─────────────────────────────────────────────────
const DAY_LABELS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Always use LOCAL date parts — toISOString() is UTC and shifts the date in non-UTC timezones
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse a YYYY-MM-DD string from MySQL as LOCAL midnight (not UTC midnight)
function parseDBDate(str) {
  if (!str) return new Date();
  const s = String(str).split('T')[0];          // strip any time part
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);                 // local midnight ✓
}

function fmtWeekRange(mon) {
  const sun = addDays(mon, 6);
  const opts = { month: 'short', day: '2-digit', year: 'numeric' };
  return `${mon.toLocaleDateString('en-US', { month:'short', day:'2-digit' })} – ${sun.toLocaleDateString('en-US', opts)}`;
}

function isToday(dateStr) {
  return dateStr === toISO(new Date()); // toISO now uses local parts ✓
}

// ── Capacity mini bar ────────────────────────────────────────────
function CapBar({ registered, capacity, color }) {
  const pct = capacity > 0 ? Math.min(Math.round((registered / capacity) * 100), 100) : 0;
  const p = pal(color);
  return (
    <div className="mt-2 space-y-1">
      <div className="w-full bg-fg/5 rounded-full h-1 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#EF4444' : pct >= 90 ? '#FB923C' : p.hex }} />
      </div>
      <div className="flex justify-between">
        <span className={`text-[11px] font-bold ${p.text}`}>{registered}/{capacity}</span>
      </div>
    </div>
  );
}

// ── Initial form state ────────────────────────────────────────────
const initForm = {
  class_name: '', trainer_name: '', scheduled_date: toISO(new Date()),
  scheduled_time: '07:00', duration_minutes: 60, capacity: 20, color: 'lime'
};

export default function Plans() {

  const [stats, setStats]           = useState({ classes_today: 0, total_bookings: 0, avg_capacity: 0 });
  const [weekClasses, setWeekClasses] = useState([]);
  const [upcoming, setUpcoming]     = useState([]);
  const [weekStart, setWeekStart]   = useState(getMondayOf(new Date()));
  const [loading, setLoading]       = useState(true);
  const [upFilter, setUpFilter]     = useState('all');
  const [showFilterDrop, setShowFilterDrop] = useState(false);

  // Modal
  const [showModal, setShowModal]   = useState(false);
  const modalDialogRef = useDialog(showModal, () => setShowModal(false));
  const [isEditing, setIsEditing]   = useState(false);
  const [formData, setFormData]     = useState(initForm);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr]       = useState('');
  const [formOk, setFormOk]         = useState(false);

  const [openAction, setOpenAction] = useState(null);
  const filterRef = useDismiss(showFilterDrop, () => setShowFilterDrop(false));
  const actionRef = useDismiss(openAction !== null, () => setOpenAction(null));

  // Registration Modal
  const [showRegModal, setShowRegModal] = useState(false);
  const regModalDialogRef = useDialog(showRegModal, () => setShowRegModal(false));
  const [selectedClass, setSelectedClass] = useState(null);
  const [regCount, setRegCount] = useState(1);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regMsg, setRegMsg] = useState('');
  const [regErr, setRegErr] = useState('');

  const [trainers, setTrainers] = useState([]);
  const fetchTrainers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/trainers`, { headers: getHeaders(), params: { limit: 100 } });
      setTrainers(Array.isArray(data.trainers) ? data.trainers : []);
    } catch(e) { console.error(e); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/stats`, { headers: getHeaders() });
      setStats(data);
    } catch(e) { console.error(e); }
  }, []);

  const fetchWeek = useCallback(async (mon) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/week`, {
        headers: getHeaders(),
        params: { weekStart: toISO(mon) }
      });
      setWeekClasses(Array.isArray(data.classes) ? data.classes : []);
    } catch(e) { console.error(e); setWeekClasses([]); }
    finally { setLoading(false); }
  }, []);

  const fetchUpcoming = useCallback(async (statusFilter = 'all') => {
    try {
      const { data } = await axios.get(`${API}/upcoming`, {
        headers: getHeaders(),
        params: { status: statusFilter }
      });
      setUpcoming(Array.isArray(data) ? data : []);
    } catch(e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchWeek(weekStart);
    fetchUpcoming(upFilter);
    fetchTrainers();
  }, []);

  useEffect(() => { fetchWeek(weekStart); }, [weekStart]);
  useEffect(() => { fetchUpcoming(upFilter); }, [upFilter]);

  const prevWeek = () => setWeekStart(prev => addDays(prev, -7));
  const nextWeek = () => setWeekStart(prev => addDays(prev, 7));

  // group by day index 0–6 (Mon–Sun)
  const byDay = Array.from({ length: 7 }, (_, i) => {
    const dayDate = toISO(addDays(weekStart, i));
    // parseDBDate avoids the UTC-midnight shift when MySQL returns "YYYY-MM-DD" strings
    return weekClasses.filter(c => toISO(parseDBDate(c.scheduled_date)) === dayDate);
  });

  const openModal = (cls = null) => {
    if (cls) {
      setIsEditing(true);
      setFormData({
        ...cls,
        // Ensure registered is present for editing
        registered: cls.registered || 0 
      });
    } else {
      setIsEditing(false);
      setFormData(initForm);
    }
    setFormErr(''); setFormOk(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFormErr('');
    try {
      if (isEditing) {
        await axios.put(`${API}/${formData.class_id}`, formData, { headers: getHeaders() });
      } else {
        await axios.post(API, formData, { headers: getHeaders() });
      }
      setFormOk(true);
      fetchStats(); fetchWeek(weekStart); fetchUpcoming(upFilter);
      setTimeout(() => { setShowModal(false); setFormOk(false); }, 1000);
    } catch(err) {
      setFormErr(err.response?.data?.message || 'Failed to save class.');
    } finally { setSubmitting(false); }
  };

  const [pendingDelete, setPendingDelete] = useState(null);
  const handleDelete = (id) => { setOpenAction(null); setPendingDelete(id); };
  const confirmDelete = async () => {
    await axios.delete(`${API}/${pendingDelete}`, { headers: getHeaders() });
    setPendingDelete(null);
    fetchStats(); fetchWeek(weekStart); fetchUpcoming(upFilter);
  };

  const handleOpenRegistration = (cls) => {
    setSelectedClass(cls);
    setRegCount(1);
    setRegErr('');
    setRegMsg('');
    setShowRegModal(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!selectedClass) return;
    setRegSubmitting(true);
    setRegErr('');
    try {
      const newReg = (selectedClass.registered || 0) + Number(regCount);
      if (newReg > selectedClass.capacity) {
         throw new Error('Requested seats exceed class capacity.');
      }

      await axios.put(`${API}/${selectedClass.class_id}`, {
        ...selectedClass,
        registered: newReg
      }, { headers: getHeaders() });

      setRegMsg('Booking successful!');
      fetchStats(); fetchWeek(weekStart); fetchUpcoming(upFilter);
      setTimeout(() => setShowRegModal(false), 1200);
    } catch (err) {
      setRegErr(err.response?.data?.message || err.message || 'Booking failed.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const FILTER_OPTS = [
    ['all', 'All Status'],
    ['booking_open', 'Booking Open'],
    ['full', 'Full'],
    ['waitlist', 'Waitlist'],
  ];

  return (
    <div className="space-y-6 pb-10 font-manrope">
      <ConfirmDialog open={pendingDelete !== null} title="Delete this class?" message="This permanently removes the class from the schedule."
        onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-space font-bold tracking-[0.2em] text-iron-text-secondary">Classes Today</p>
            <div className="w-9 h-9 rounded-lg bg-iron-lime/10 flex items-center justify-center text-iron-lime">
              <CalendarDays size={16} />
            </div>
          </div>
          <p className="text-5xl font-space font-bold text-fg tracking-tighter">
            {String(stats.classes_today).padStart(2,'0')}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-space font-bold tracking-[0.2em] text-iron-text-secondary">Total Bookings</p>
            <div className="w-9 h-9 rounded-lg bg-iron-blue/10 flex items-center justify-center text-blue-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <p className="text-5xl font-space font-bold text-fg tracking-tighter">{stats.total_bookings}</p>
            <span className="text-emerald-400 text-xs font-bold mb-2">+13%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-space font-bold tracking-[0.2em] text-iron-text-secondary">Avg. Capacity</p>
            <div className="w-9 h-9 rounded-lg bg-fg/5 flex items-center justify-center text-iron-text-secondary">
              <Gauge size={16} />
            </div>
          </div>
          <p className="text-5xl font-space font-bold text-fg tracking-tighter">{stats.avg_capacity}%</p>
        </div>
      </div>

      {/* ── Weekly Schedule ──────────────────────────────────────── */}
      <div className="card !p-0 overflow-hidden">
        {/* Calendar header */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <h2 className="text-fg font-space font-bold text-base tracking-tight">Weekly Schedule</h2>
            <div className="flex items-center gap-2 bg-fg/[0.03] border border-fg/5 rounded-lg px-3 py-1.5">
              <button aria-label="Previous week" onClick={(e) => { e.stopPropagation(); prevWeek(); }}
                className="w-7 h-7 -my-1 rounded-md flex items-center justify-center text-iron-text-secondary hover:text-fg hover:bg-fg/5 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-fg text-xs font-space font-bold tracking-wide px-2">
                {fmtWeekRange(weekStart)}
              </span>
              <button aria-label="Next week" onClick={(e) => { e.stopPropagation(); nextWeek(); }}
                className="w-7 h-7 -my-1 rounded-md flex items-center justify-center text-iron-text-secondary hover:text-fg hover:bg-fg/5 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); openModal(); }}
            className="btn flex items-center gap-2 !py-2 !text-xs">
            <Plus size={13} /> Add New Class
          </button>
        </div>

        {/* 7-day grid */}
        <div className="grid grid-cols-7 divide-x divide-border min-h-[280px]">
          {DAY_LABELS.map((label, i) => {
            const dayDate  = addDays(weekStart, i);
            const dateNum  = dayDate.getDate();
            const classes  = byDay[i] || [];
            const todayDay = isToday(toISO(dayDate));  // dayDate is already a local Date ✓
            const isSun    = i === 6;

            return (
              <div key={i} className={`flex flex-col ${todayDay ? 'bg-iron-lime/[0.03]' : ''}`}>
                {/* Day header */}
                <div className={`py-3 px-2 text-center border-b border-border ${todayDay ? 'border-iron-lime/30' : ''}`}>
                  <p className={`text-xs font-bold tracking-widest font-space ${todayDay ? 'text-iron-lime' : 'text-iron-text-secondary'}`}>{label}</p>
                  <p className={`text-lg font-space font-bold mt-0.5 ${todayDay ? 'text-iron-lime' : 'text-fg'}`}>{dateNum}</p>
                </div>

                {/* Classes */}
                <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto max-h-[360px]">
                  {loading ? (
                    <div className="flex justify-center pt-4">
                      <Loader2 size={14} className="animate-spin text-iron-text-secondary" />
                    </div>
                  ) : classes.length === 0 ? (
                    isSun ? (
                      <div className="flex flex-col items-center justify-center h-full py-8 gap-2 opacity-20">
                        <CalendarOff size={20} className="text-fg" />
                        <p className="text-[11px] font-bold tracking-widest text-fg text-center">Gym Closed</p>
                      </div>
                    ) : null
                  ) : (
                    classes.map(cls => {
                      const p = pal(cls.color);
                      const isDone = cls.status === 'Completed';
                      return (
                        <div key={cls.class_id}
                          role={isDone ? undefined : 'button'}
                          tabIndex={isDone ? undefined : 0}
                          aria-label={isDone ? undefined : `Book ${cls.class_name}, ${cls.time_display}`}
                          onClick={() => !isDone && handleOpenRegistration(cls)}
                          onKeyDown={e => { if (!isDone && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleOpenRegistration(cls); } }}
                          className={`rounded-lg p-2 ${p.bg} hover:brightness-125 transition-colors cursor-pointer group ${isDone ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                          <p className={`text-[11px] font-bold tracking-wider ${isDone ? 'text-iron-text-secondary' : p.text}`}>
                            {cls.time_display}
                          </p>
                          <p className="text-fg text-[11px] font-bold leading-tight mt-0.5 group-hover:text-fg/90 truncate">
                            {cls.class_name}
                          </p>
                          <p className="text-iron-text-secondary text-[11px] truncate mt-0.5">
                            {cls.trainer_name}
                          </p>
                          <CapBar registered={cls.registered} capacity={cls.capacity} color={cls.color} />
                          {!isDone && (
                            <div className="mt-2 pt-3 border-t border-fg/5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                              <span className={`text-[9px] font-bold tracking-[0.1em] px-2 py-0.5 rounded-full bg-fg/5 ${p.text}`}>Book Spot</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Upcoming Sessions ────────────────────────────────────── */}
      <div className="card !p-0 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-fg font-space font-bold text-sm tracking-widest">Upcoming Sessions</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-iron-text-secondary text-xs font-bold tracking-widest">Filter by:</span>
            <div ref={filterRef} className="relative">
              <button
                aria-expanded={showFilterDrop}
                onClick={() => setShowFilterDrop(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 bg-fg/[0.03] border border-fg/5 rounded-lg text-xs font-bold text-fg tracking-widest hover:bg-fg/5 transition-colors"
              >
                {FILTER_OPTS.find(([v]) => v === upFilter)?.[1] || 'Status'}
                <ChevronDown size={12} className={`transition-transform ${showFilterDrop ? 'rotate-180' : ''}`} />
              </button>
              {showFilterDrop && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-raised border border-border rounded-xl shadow-xl z-20 overflow-hidden py-1">
                  {FILTER_OPTS.map(([val, label]) => (
                    <button key={val}
                      onClick={() => { setUpFilter(val); setShowFilterDrop(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold tracking-widest transition-colors ${
                        upFilter === val ? 'text-iron-lime bg-iron-lime/5' : 'text-iron-text-secondary hover:text-fg hover:bg-fg/5'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] px-6 py-2 border-b border-border bg-fg/[0.01]">
          {['Class Name','Trainer','Time','Registered','Status','Actions'].map(h => (
            <span key={h} className="text-xs font-bold tracking-widest text-iron-text-secondary font-space">{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-fg/[0.03]">
          {upcoming.length === 0 ? (
            <div className="py-16 text-center text-iron-text-secondary text-sm">
              No upcoming sessions found.
            </div>
          ) : (
            upcoming.map(cls => {
              const p = pal(cls.color);
              const pct = cls.capacity > 0 ? Math.min(Math.round((cls.registered / cls.capacity) * 100), 100) : 0;
              return (
                <div key={cls.class_id}
                  className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] px-0 py-0 items-center hover:bg-fg/[0.015] transition-colors group`}>
                  {/* Class name */}
                  <div className="px-6 py-4">
                    <p className={`flex items-center gap-2 text-fg font-bold text-sm group-hover:${p.text} transition-colors`}><span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ background: p.hex }} />{cls.class_name}</p>
                  </div>
                  {/* Trainer */}
                  <div className="px-2 py-4">
                    <p className="text-iron-text-secondary text-xs font-medium">{cls.trainer_name}</p>
                  </div>
                  {/* Time */}
                  <div className="px-2 py-4">
                    <p className="text-fg text-xs font-bold">
                      <span className="text-iron-text-secondary">{cls.date_label},</span>{' '}
                      {cls.time_display}
                    </p>
                  </div>
                  {/* Registered */}
                  <div className="px-2 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold font-space ${pct >= 100 ? 'text-red-400' : 'text-fg'}`}>
                        {cls.registered}/{cls.capacity}
                      </span>
                      <div className="flex-1 h-1 bg-fg/5 rounded-full overflow-hidden min-w-[40px]">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#EF4444' : p.hex }} />
                      </div>
                    </div>
                  </div>
                  {/* Status */}
                  <div className="px-2 py-4">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={cls.status} />
                      {cls.status === 'Booking Open' && (
                        <button
                          onClick={() => handleOpenRegistration(cls)}
                          className="px-3 py-1 bg-iron-lime text-on-accent text-[10px] font-bold tracking-widest rounded-lg hover:shadow-[0_4px_15px_rgba(0,0,0,0.25)] transition-all">
                          Register
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="px-4 py-4 flex justify-center">
                    <div ref={openAction === cls.class_id ? actionRef : null} className="relative">
                      <button
                        aria-label={`Actions for ${cls.class_name}`}
                        aria-expanded={openAction === cls.class_id}
                        onClick={() => setOpenAction(openAction === cls.class_id ? null : cls.class_id)}
                        className="w-8 h-8 rounded-lg bg-fg/[0.03] border border-fg/5 flex items-center justify-center text-iron-text-secondary hover:text-fg hover:bg-fg/5 transition-colors">
                        <MoreHorizontal size={14} />
                      </button>
                      {openAction === cls.class_id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-raised border border-border rounded-xl shadow-xl z-20 overflow-hidden py-1">
                          <button onClick={() => openModal(cls)}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold tracking-widest text-fg hover:bg-fg/5 transition-colors flex items-center gap-2 border-b border-fg/5">
                            <Pencil size={12} /> Edit
                          </button>
                          <button onClick={() => handleDelete(cls.class_id)}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold tracking-widest text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Add Class Modal ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}>
          <div ref={modalDialogRef} role="dialog" aria-modal="true" aria-labelledby="plans-showModal-title" tabIndex={-1} className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl"
           >
            {/* Modal header */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5 border-b border-border">
              <div>
                <h2 id="plans-showModal-title" className="text-fg font-space font-bold text-base tracking-wide">{isEditing ? 'Edit Class' : 'Add New Class'}</h2>
                <p className="text-iron-text-secondary text-xs mt-0.5">{isEditing ? 'Update existing class details' : 'Schedule a new fitness session'}</p>
              </div>
              <button aria-label="Close dialog" onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-fg/[0.03] border border-fg/5 flex items-center justify-center text-iron-text-secondary hover:text-fg transition-colors">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <p className="text-xs text-iron-text-secondary">Fields marked <span aria-hidden="true" className="text-red-400">*</span><span className="sr-only">with an asterisk</span> are required.</p>
              {formErr && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">
                  <AlertCircle size={14} className="flex-shrink-0" />{formErr}
                </div>
              )}
              {formOk && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-xs">
                  <CheckCircle size={14} className="flex-shrink-0" />Class scheduled successfully!
                </div>
              )}

              {/* Class name + trainer */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="plans-class-name" className="text-iron-text-secondary text-xs tracking-widest font-space font-bold">
                    Class Name <span aria-hidden="true" className="text-red-400">*</span>
                  </label>
                  <input id="plans-class-name" required type="text" placeholder="e.g. Power Lifting"
                    value={formData.class_name}
                    onChange={e => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full bg-raised border border-border rounded-xl px-4 py-3 text-sm text-fg outline-none focus:border-iron-lime/50 transition-colors placeholder:text-iron-text-secondary/50" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="plans-trainer-name" className="text-iron-text-secondary text-xs tracking-widest font-space font-bold">Trainer</label>
                  <select id="plans-trainer-name"
                    value={formData.trainer_name}
                    onChange={e => setFormData({ ...formData, trainer_name: e.target.value })}
                    className="w-full bg-raised border border-border rounded-xl px-4 py-3 text-sm text-fg outline-none focus:border-iron-lime/50 transition-colors">
                    <option value="">— Select Trainer —</option>
                    {trainers.map(t => (
                      <option key={t.trainer_id} value={t.name}>{t.name} ({t.specialization})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="plans-scheduled-date" className="text-iron-text-secondary text-xs tracking-widest font-space font-bold">
                    Date <span aria-hidden="true" className="text-red-400">*</span>
                  </label>
                  <input id="plans-scheduled-date" required type="date"
                    value={formData.scheduled_date}
                    onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full bg-raised border border-border rounded-xl px-4 py-3 text-sm text-fg outline-none focus:border-iron-lime/50 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="plans-scheduled-time" className="text-iron-text-secondary text-xs tracking-widest font-space font-bold">
                    Start Time <span aria-hidden="true" className="text-red-400">*</span>
                  </label>
                  <input id="plans-scheduled-time" required type="time"
                    value={formData.scheduled_time}
                    onChange={e => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="w-full bg-raised border border-border rounded-xl px-4 py-3 text-sm text-fg outline-none focus:border-iron-lime/50 transition-colors" />
                </div>
              </div>

              {/* Duration + Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="plans-duration-minutes" className="text-iron-text-secondary text-xs tracking-widest font-space font-bold">Duration (min)</label>
                  <input id="plans-duration-minutes" type="number" min="15" max="240" placeholder="60"
                    value={formData.duration_minutes}
                    onChange={e => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                    className="w-full bg-raised border border-border rounded-xl px-4 py-3 text-sm text-fg outline-none focus:border-iron-lime/50 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="plans-capacity" className="text-iron-text-secondary text-xs tracking-widest font-space font-bold">Capacity</label>
                  <input id="plans-capacity" type="number" min="1" max="200" placeholder="20"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full bg-raised border border-border rounded-xl px-4 py-3 text-sm text-fg outline-none focus:border-iron-lime/50 transition-colors" />
                </div>
              </div>

              {/* Registration Count (Only for Edit) */}
              {isEditing && (
                <div className="space-y-1">
                  <label htmlFor="plans-registered" className="text-iron-text-secondary text-xs tracking-widest font-space font-bold">
                    Registered Members {formData.status === 'Completed' && <span className="text-red-400 text-[10px] ml-1">(Locked)</span>}
                  </label>
                  <div className="flex items-center gap-4">
                    <input id="plans-registered" type="range" min="0" max={formData.capacity}
                      disabled={formData.status === 'Completed'}
                      value={formData.registered}
                      onChange={e => setFormData({ ...formData, registered: Number(e.target.value) })}
                      className="flex-1 accent-iron-lime" />
                    <span className="text-fg font-bold text-sm w-12 text-right">{formData.registered}/{formData.capacity}</span>
                  </div>
                </div>
              )}

              {/* Color picker */}
              <div className="space-y-2">
                <p id="plans-color-label" className="text-iron-text-secondary text-xs tracking-widest font-space font-bold">Accent Colour</p>
                <div role="group" aria-labelledby="plans-color-label" className="flex gap-2">
                  {PALETTE_KEYS.map(key => (
                    <button key={key} type="button"
                      onClick={() => setFormData({ ...formData, color: key })}
                      title={key}
                      aria-label={key}
                      aria-pressed={formData.color === key}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${formData.color === key ? 'scale-125 border-white' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: PALETTE[key].hex }} />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex-1 btn flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Plus size={13} /> Schedule Class</>}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 px-6 bg-fg/[0.03] border border-fg/10 rounded text-fg text-xs font-space font-semibold tracking-wider hover:bg-fg/5 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Registration Modal ───────────────────────────────────── */}
      {showRegModal && selectedClass && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRegModal(false)} />
          <div ref={regModalDialogRef} role="dialog" aria-modal="true" aria-labelledby="plans-showRegModal-title" tabIndex={-1} className="relative w-full max-w-md shadow-2xl rounded-3xl overflow-hidden bg-surface border border-border">
            <div className={`h-2 w-full`} style={{ backgroundColor: pal(selectedClass.color).hex }} />
            
            <div className="p-8">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-6">
                <div>
                  <h3 id="plans-showRegModal-title" className="font-space font-bold text-2xl tracking-tight text-fg">Register for Class</h3>
                  <p className="text-xs mt-1 text-iron-text-secondary">{selectedClass.class_name} with {selectedClass.trainer_name}</p>
                </div>
                <button aria-label="Close dialog" onClick={() => setShowRegModal(false)} className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-fg/10 text-iron-text-secondary hover:text-fg">
                  <X size={18} />
                </button>
              </div>

              {regErr && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs mb-6 flex items-center gap-3">
                  <AlertCircle size={14} className="shrink-0" /> {regErr}
                </div>
              )}
              {regMsg && (
                <div role="alert" className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs mb-6 flex items-center gap-3">
                  <CheckCircle size={14} className="shrink-0" /> Booking confirmed!
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-2">
                  <p id="plans-seats-label" className="font-bold tracking-[0.2em] text-[10px] pl-1 text-iron-text-secondary">Number of Seats</p>
                  <div role="group" aria-labelledby="plans-seats-label" className="flex items-center gap-4 rounded-2xl p-4 border bg-raised border-border">
                    <button type="button" aria-label="Decrease seats" onClick={() => setRegCount(c => Math.max(1, c - 1))}
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors border bg-surface border-border text-fg hover:border-iron-lime/40">
                      <ChevronDown size={14} />
                    </button>
                    <span aria-live="polite" className="flex-1 text-center text-3xl font-space font-bold tracking-tighter text-fg">{regCount}</span>
                    <button type="button" aria-label="Increase seats" onClick={() => setRegCount(c => Math.min(selectedClass.capacity - (selectedClass.registered || 0), c + 1))} 
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors border bg-surface border-border text-fg hover:border-iron-lime/40">
                      <Plus size={14} className="rotate-0" />
                    </button>
                  </div>
                  <p className="text-xs px-1 font-medium text-iron-text-secondary">
                    Available: {selectedClass.capacity - (selectedClass.registered || 0)} seats left
                  </p>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={regSubmitting || regMsg} 
                    className="w-full py-4 font-space font-bold tracking-[0.2em] text-xs rounded-2xl shadow-xl active:scale-95 transition-[scale,opacity] disabled:opacity-50 disabled:scale-100 bg-iron-lime text-on-accent">
                    {regSubmitting ? 'Processing...' : regMsg ? 'Subscription Recorded' : 'Confirm Registration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
