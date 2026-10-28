import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import {
  Plus, X, Loader2, AlertCircle, CheckCircle,
  LayoutGrid, List, Users, CalendarCheck, TrendingUp,
  Star, ChevronRight, Trash2, Phone, Briefcase, UserPlus
} from 'lucide-react';

const API    = 'http://localhost:5000/api/trainers';
const PAGE   = 6;

function getHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── Helpers ─────────────────────────────────────────────────── */
function shortName(full = '') {
  const parts = full.trim().split(' ');
  if (parts.length === 1) return full.toUpperCase();
  return `${parts[0]} ${parts[parts.length - 1][0]}.`.toUpperCase();
}

function getInitials(name = '') {
  return name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Deterministic "rating" from trainer_id so it stays consistent
function getRating(id) {
  return (4.0 + ((id * 7) % 11) * 0.1).toFixed(1);
}

/* ── Specialization → badge & gradient ──────────────────────── */
const SPEC_MAP = [
  { keys: ['strength','power','weight','barbell','gym'],  label: 'Strength', color: '#DFFF00', textCls: 'text-dark',  bgCls: 'bg-iron-lime' },
  { keys: ['cardio','running','cycling','endurance','hiit'], label: 'Cardio',   color: '#60A5FA', textCls: 'text-dark',  bgCls: 'bg-blue-400'  },
  { keys: ['yoga','flexibility','pilates','stretch'],      label: 'Yoga',     color: '#C084FC', textCls: 'text-dark',  bgCls: 'bg-purple-400'},
  { keys: ['nutrition','diet','wellness'],                 label: 'Nutrition',color: '#34D399', textCls: 'text-dark',  bgCls: 'bg-emerald-400'},
  { keys: ['boxing','combat','martial','mma','kick'],      label: 'Combat',   color: '#FB923C', textCls: 'text-dark',  bgCls: 'bg-orange-400'},
  { keys: ['recovery','rehab','physio'],                   label: 'Recovery', color: '#F472B6', textCls: 'text-dark',  bgCls: 'bg-pink-400'  },
];

function getSpec(specialization = '') {
  const s = specialization.toLowerCase();
  const match = SPEC_MAP.find(m => m.keys.some(k => s.includes(k)));
  if (match) return match;
  // fallback — use first word capitalised
  const word = specialization.split(' ')[0] || 'General';
  return { label: word, color: '#71717A', textCls: 'text-white', bgCls: 'bg-white/20' };
}

const CARD_GRADIENTS = [
  'from-[#1a1f0a] via-[#111116] to-[#0A0A0E]',   // lime-ish dark
  'from-[#0a0f1a] via-[#111116] to-[#0A0A0E]',   // blue-ish
  'from-[#130a1a] via-[#111116] to-[#0A0A0E]',   // purple-ish
  'from-[#0a1a14] via-[#111116] to-[#0A0A0E]',   // emerald-ish
  'from-[#1a0f0a] via-[#111116] to-[#0A0A0E]',   // orange-ish
  'from-[#1a0a12] via-[#111116] to-[#0A0A0E]',   // pink-ish
];

const CARD_GRADIENTS_LIGHT = [
  'from-yellow-50 via-[#f4f4f8] to-slate-100',
  'from-blue-50 via-[#f4f4f8] to-slate-100',
  'from-purple-50 via-[#f4f4f8] to-slate-100',
  'from-emerald-50 via-[#f4f4f8] to-slate-100',
  'from-orange-50 via-[#f4f4f8] to-slate-100',
  'from-pink-50 via-[#f4f4f8] to-slate-100',
];

function cardGradient(id, isLight) {
  if (isLight) return CARD_GRADIENTS_LIGHT[id % CARD_GRADIENTS_LIGHT.length];
  return CARD_GRADIENTS[id % CARD_GRADIENTS.length];
}

/* ── Initial form ────────────────────────────────────────────── */
const initForm = {
  name: '', specialization: '', phone: '',
  salary: '', hire_date: new Date().toISOString().split('T')[0],
  email: '', password: ''
};

/* ════════════════════════════════════════════════════════════════
   Trainer Card — Grid View
══════════════════════════════════════════════════════════════════ */
function TrainerCard({ trainer, onDelete, onManage, isLight }) {
  const spec    = getSpec(trainer.specialization);
  const drawColor = isLight && spec.color === '#DFFF00' ? '#2563EB' : spec.color;
  const rating  = getRating(trainer.trainer_id);
  const grad    = cardGradient(trainer.trainer_id, isLight);
  const clients = trainer.active_clients ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-b ${grad} group cursor-pointer hover:border-white/10 transition-all duration-300 hover:-translate-y-1 ${isLight ? 'hover:shadow-[0_10px_40px_rgba(0,0,0,0.1)]' : 'hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]'}`}>

      {/* Large initials visual */}
      <div className="h-52 flex items-center justify-center relative overflow-hidden">
        {/* Glow blob */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: drawColor }} />
        </div>
        {/* Initials */}
        <div className="relative z-10 w-24 h-24 rounded-full border-2 flex items-center justify-center text-3xl font-black font-space"
          style={{ borderColor: drawColor, color: drawColor, backgroundColor: `${drawColor}15` }}>
          {getInitials(trainer.name)}
        </div>
        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-widest ${spec.bgCls} ${spec.textCls}`}>
            {spec.label}
          </span>
        </div>
        {/* Action menu */}
        <div className="absolute top-3 right-3" onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}>
          <button className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-colors">
            <span className="text-base leading-none">⋯</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-[#18181A] border border-border rounded-xl shadow-xl z-20 overflow-hidden py-1"
              onMouseLeave={() => setMenuOpen(false)}>
              <button onClick={() => { onDelete(trainer.trainer_id); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                <Trash2 size={11} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="px-4 pb-4 pt-1 border-t border-white/5">
        <h3 className="text-white font-space font-black text-lg tracking-tight mb-3 group-hover:text-iron-lime transition-colors">
          {shortName(trainer.name)}
        </h3>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-iron-text-secondary text-[11px] uppercase tracking-widest font-bold mb-0.5">Active Clients</p>
            <p className="text-white text-xl font-space font-black">{clients}</p>
          </div>
          <div className="text-right">
            <p className="text-iron-text-secondary text-[11px] uppercase tracking-widest font-bold mb-0.5">Performance</p>
            <div className="flex items-center justify-end gap-1">
              <Star size={11} className="text-iron-lime fill-iron-lime" />
              <p className="text-iron-lime text-xl font-space font-black">+{rating}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onManage(trainer)}
          className="w-full py-2 bg-white/[0.03] border border-white/5 rounded-lg text-xs font-black uppercase tracking-widest text-iron-text-secondary hover:text-white hover:border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-2 group/btn"
        >
          Manage Profile
          <ChevronRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

/* ── List Row ────────────────────────────────────────────────── */
function TrainerRow({ trainer, onDelete, onManage, isLight }) {
  const spec   = getSpec(trainer.specialization);
  const drawColor = isLight && spec.color === '#DFFF00' ? '#2563EB' : spec.color;
  const rating = getRating(trainer.trainer_id);

  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] items-center px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group border-l-2"
      style={{ borderLeftColor: drawColor }}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black font-space flex-shrink-0 border"
          style={{ backgroundColor: `${drawColor}15`, color: drawColor, borderColor: `${drawColor}30` }}>
          {getInitials(trainer.name)}
        </div>
        <div>
          <p className="text-white font-bold text-sm group-hover:text-iron-lime transition-colors">{trainer.name}</p>
          <p className="text-iron-text-secondary text-xs">{trainer.specialization || '—'}</p>
        </div>
      </div>
      <div>
        <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-widest ${spec.bgCls} ${spec.textCls}`}>
          {spec.label}
        </span>
      </div>
      <div>
        <p className="text-white text-sm font-bold">{trainer.active_clients ?? 0}</p>
        <p className="text-iron-text-secondary text-xs">clients</p>
      </div>
      <div className="flex items-center gap-1">
        <Star size={12} className="text-iron-lime fill-iron-lime" />
        <span className="text-iron-lime font-black font-space text-sm">{rating}</span>
      </div>
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <button onClick={() => onManage(trainer)}
            className="px-3 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-iron-text-secondary hover:text-white hover:border-white/20 transition-colors text-[10px] font-black uppercase tracking-widest">
            Edit
          </button>
          <button onClick={() => onDelete(trainer.trainer_id)}
            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-iron-text-secondary hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════════ */
export default function Trainers() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [stats, setStats]       = useState({ total_trainers: 0, sessions_today: 0, active_clients: 0, performance: 0 });
  const [trainers, setTrainers] = useState([]);
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData]   = useState(initForm);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr]     = useState('');
  const [formOk, setFormOk]       = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/stats`, { headers: getHeaders() });
      setStats(data);
    } catch(e) { console.error(e); }
  }, []);

  const fetchTrainers = useCallback(async (reset = false) => {
    const off = reset ? 0 : offset;
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const { data } = await axios.get(API, {
        headers: getHeaders(),
        params: { limit: PAGE, offset: off }
      });
      const list = Array.isArray(data.trainers) ? data.trainers : [];
      setTrainers(prev => reset ? list : [...prev, ...list]);
      setTotal(data.total || 0);
      setOffset(off + PAGE);
    } catch(e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [offset]);

  useEffect(() => { fetchStats(); fetchTrainers(true); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trainer?')) return;
    try {
      await axios.delete(`${API}/${id}`, { headers: getHeaders() });
      fetchStats(); fetchTrainers(true); setOffset(0);
    } catch(e) { console.error(e); }
  };

  const openModal = () => {
    setEditingId(null);
    setFormData(initForm); setFormErr(''); setFormOk(false);
    setShowModal(true);
  };

  const openManageModal = (trainer) => {
    setEditingId(trainer.trainer_id);
    setFormData({
      name: trainer.name || '',
      specialization: trainer.specialization || '',
      phone: trainer.phone || '',
      salary: trainer.salary || '',
      hire_date: trainer.hire_date ? String(trainer.hire_date).split('T')[0] : '',
      email: trainer.email || '',
      password: ''
    });
    setFormErr('');
    setFormOk(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFormErr('');
    try {
      if (editingId) {
        await axios.put(`${API}/${editingId}`, formData, { headers: getHeaders() });
      } else {
        await axios.post(API, formData, { headers: getHeaders() });
      }
      setFormOk(true);
      fetchStats(); fetchTrainers(true); setOffset(0);
      setTimeout(() => { setShowModal(false); setFormOk(false); }, 1000);
    } catch(err) {
      setFormErr(err.response?.data?.message || 'Failed to add trainer.');
    } finally { setSubmitting(false); }
  };

  const hasMore    = trainers.length < total;
  const totalPages = Math.ceil(total / PAGE);
  const curPage    = Math.ceil(trainers.length / PAGE);

  return (
    <div className="space-y-6 pb-10 font-manrope" onClick={() => {}}>

      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-space font-black uppercase tracking-tighter text-white leading-none">
            Trainers
          </h1>
          <p className="text-iron-text-secondary text-xs font-bold uppercase tracking-widest mt-2">
            {stats.total_trainers} Total Trainers Active
          </p>
        </div>
        <button onClick={openModal}
          className="btn flex items-center gap-2">
          <UserPlus size={14} /> Hire New Trainer
        </button>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Team Performance */}
        <div className="stat-card space-y-3">
          <p className="text-xs font-space font-bold uppercase tracking-[0.2em] text-iron-text-secondary">Team Performance</p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-space font-black text-white tracking-tighter">{stats.performance}</p>
            <span className="text-iron-lime font-black text-xl">%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-iron-lime rounded-full transition-all duration-700"
              style={{ width: `${stats.performance}%` }} />
          </div>
        </div>

        {/* Sessions Today */}
        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-space font-bold uppercase tracking-[0.2em] text-iron-text-secondary">Sessions Today</p>
            <div className="w-9 h-9 rounded-lg bg-iron-lime/10 flex items-center justify-center text-iron-lime">
              <CalendarCheck size={16} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-5xl font-space font-black text-white tracking-tighter">{stats.sessions_today}</p>
            <TrendingUp size={18} className="text-iron-lime mb-2" />
          </div>
          <p className="text-iron-text-secondary text-xs italic mt-1">Active gym sessions</p>
        </div>

        {/* Active Clients */}
        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-space font-bold uppercase tracking-[0.2em] text-iron-text-secondary">Active Clients</p>
            <div className="w-9 h-9 rounded-lg bg-iron-blue/10 flex items-center justify-center text-blue-400">
              <Users size={16} />
            </div>
          </div>
          <p className="text-5xl font-space font-black text-white tracking-tighter">{stats.active_clients}</p>
          <p className="text-iron-text-secondary text-xs italic mt-3">Distinct members with an active workout or diet assignment</p>
        </div>
      </div>

      {/* ── Active Roster ──────────────────────────────────────── */}
      <div className="card !p-0 overflow-hidden">
        {/* Roster header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-white font-space font-black uppercase tracking-widest text-sm">Active Roster</h3>
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg p-1">
            <button onClick={() => setViewMode('grid')}
              className={`w-8 h-8 rounded flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-iron-lime text-dark' : 'text-iron-text-secondary hover:text-white'}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`w-8 h-8 rounded flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-iron-lime text-dark' : 'text-iron-text-secondary hover:text-white'}`}>
              <List size={14} />
            </button>
          </div>
        </div>

        {/* List header row */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] px-6 py-2 border-b border-border bg-white/[0.01]">
            {['Trainer', 'Specialty', 'Clients', 'Rating', 'Actions'].map(h => (
              <span key={h} className="text-xs font-black uppercase tracking-widest text-iron-text-secondary font-space">{h}</span>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="py-24 flex justify-center items-center gap-3 text-iron-text-secondary text-xs font-space uppercase tracking-widest">
            <Loader2 size={16} className="animate-spin text-iron-lime" /> Loading roster...
          </div>
        ) : trainers.length === 0 ? (
          <div className="py-24 text-center text-iron-text-secondary italic">
            No trainers found. Click "Hire New Trainer" to add one.
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trainers.map(t => (
              <TrainerCard key={t.trainer_id} trainer={t} onDelete={handleDelete} onManage={openManageModal} isLight={isLight} />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {trainers.map(t => (
              <TrainerRow key={t.trainer_id} trainer={t} onDelete={handleDelete} onManage={openManageModal} isLight={isLight} />
            ))}
          </div>
        )}

        {/* Load More + Pagination */}
        {!loading && trainers.length > 0 && (
          <div className="px-6 py-5 border-t border-border flex flex-col items-center gap-3">
            {hasMore && (
              <button onClick={() => fetchTrainers(false)} disabled={loadingMore}
                className="flex items-center gap-2 px-10 py-3 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-iron-text-secondary hover:text-white hover:border-white/30 hover:bg-white/[0.02] transition-all disabled:opacity-50">
                {loadingMore ? <><Loader2 size={13} className="animate-spin" /> Loading...</> : 'Load More Trainers'}
              </button>
            )}
            <p className="text-iron-text-secondary text-xs uppercase tracking-widest font-bold">
              Page {curPage} of {totalPages}&nbsp;
              <span className="mx-2 opacity-30">|</span>
              <button onClick={() => fetchTrainers(true)} className="hover:text-white transition-colors">Show All</button>
            </p>
          </div>
        )}
      </div>

      {/* ── Add Trainer Modal ──────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-white font-space font-bold text-base tracking-wide">{editingId ? 'Manage Trainer Profile' : 'Hire New Trainer'}</h2>
                <p className="text-iron-text-secondary text-xs italic mt-0.5">{editingId ? 'Update trainer profile and login details' : 'Add a trainer to the active roster'}</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-iron-text-secondary hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formErr && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">
                  <AlertCircle size={14} className="flex-shrink-0" />{formErr}
                </div>
              )}
              {formOk && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-xs">
                  <CheckCircle size={14} className="flex-shrink-0" />{editingId ? 'Trainer profile updated!' : 'Trainer added to roster!'}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="text-iron-text-secondary text-xs uppercase tracking-widest font-space font-bold">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input required type="text" placeholder="e.g. Arjun Kumar"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors placeholder:text-iron-text-secondary/50" />
              </div>

              {/* Specialization + Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-iron-text-secondary text-xs uppercase tracking-widest font-space font-bold">Specialization</label>
                  <input type="text" placeholder="e.g. Strength Training"
                    value={formData.specialization}
                    onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors placeholder:text-iron-text-secondary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-iron-text-secondary text-xs uppercase tracking-widest font-space font-bold">Phone</label>
                  <input type="text" placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors placeholder:text-iron-text-secondary/50" />
                </div>
              </div>

              {/* Salary + Hire Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-iron-text-secondary text-xs uppercase tracking-widest font-space font-bold">Monthly Salary (₹)</label>
                  <input type="number" min="0" placeholder="e.g. 35000"
                    value={formData.salary}
                    onChange={e => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-iron-text-secondary text-xs uppercase tracking-widest font-space font-bold">Hire Date</label>
                  <input type="date"
                    value={formData.hire_date}
                    onChange={e => setFormData({ ...formData, hire_date: e.target.value })}
                    className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-iron-text-secondary text-xs uppercase tracking-widest font-space font-bold">Email</label>
                  <input type="email" placeholder="trainer@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors placeholder:text-iron-text-secondary/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-iron-text-secondary text-xs uppercase tracking-widest font-space font-bold">
                    {editingId ? 'New Password' : 'Password'}
                  </label>
                  <input type="password" placeholder={editingId ? 'Leave blank to keep current' : 'Optional'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors placeholder:text-iron-text-secondary/50" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex-1 btn flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><UserPlus size={13} /> {editingId ? 'Save Profile' : 'Add Trainer'}</>}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 px-6 bg-white/[0.03] border border-white/10 rounded text-white text-xs font-space font-semibold uppercase tracking-wider hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
