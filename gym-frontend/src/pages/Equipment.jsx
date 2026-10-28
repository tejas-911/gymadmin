import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Package, Zap, AlertTriangle, Search, Plus, X,
  Loader2, AlertCircle, CheckCircle, CalendarClock,
  Dumbbell, Bike, Heart, LayoutGrid, Wrench,
  ChevronRight, Clock, ShieldAlert
} from 'lucide-react';
import useDialog from '../hooks/useDialog';

const API = 'http://localhost:5000/api/equipment';

function getHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatShortDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Category badge config ───────────────────────────────────────
const CATEGORY_CFG = {
  Strength: { cls: 'bg-iron-lime/15 text-iron-lime border-iron-lime/20',  Icon: Dumbbell },
  Cardio:   { cls: 'bg-iron-blue/15 text-blue-400  border-iron-blue/20',  Icon: Bike     },
  Recovery: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', Icon: Heart },
  General:  { cls: 'bg-white/5 text-iron-text-secondary border-white/10',  Icon: LayoutGrid },
};

function CategoryBadge({ category }) {
  const cfg = CATEGORY_CFG[category] || CATEGORY_CFG.General;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-black tracking-widest border ${cfg.cls}`}>
      <Icon size={10} /> {category}
    </span>
  );
}

// ── Condition text colour ───────────────────────────────────────
const CONDITION_COLOR = {
  New:           'text-iron-lime font-bold',
  Good:          'text-white font-semibold',
  'Needs Repair':'text-amber-400 font-bold',
  'Out of Order':'text-red-400 font-bold',
};

// ── Status dot ─────────────────────────────────────────────────
const STATUS_CFG = {
  'Available':    { dot: 'bg-emerald-400', label: 'Available'   },
  'In-Use':       { dot: 'bg-white',       label: 'In-Use'      },
  'Out of Order': { dot: 'bg-red-500',     label: 'Out of Order'},
};

function StatusDot({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG['Available'];
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${cfg.dot} ${cfg.dot === 'bg-emerald-400' ? 'shadow-[0_0_6px_rgba(52,211,153,0.6)]' : ''}`} />
      <span className="text-xs text-white/80 font-medium">{cfg.label}</span>
    </div>
  );
}

// ── Equipment icon per category ─────────────────────────────────
const EQUIP_ICONS = {
  Strength: '🏋️',
  Cardio:   '🚴',
  Recovery: '💆',
  General:  '⚙️',
};

// ── Maintenance item ────────────────────────────────────────────
function MaintenanceItem({ item }) {
  const isPast   = item.days_diff < 0;
  const isSoon   = item.days_diff >= 0 && item.days_diff <= 3;
  const borderCls = isPast ? 'border-red-500' : isSoon ? 'border-iron-lime' : 'border-border';
  const labelCls  = isPast ? 'text-red-400' : 'text-iron-text-secondary';

  return (
    <div className={`pl-4 border-l-2 ${borderCls} py-1 space-y-1`}>
      <p className={`text-xs font-black tracking-widest ${labelCls}`}>
        {item.date_label}
        {isPast && <span className="ml-1 text-red-400">(Overdue)</span>}
      </p>
      <p className="text-white text-sm font-bold">{item.equipment_name}</p>
      {item.description && (
        <p className="text-iron-text-secondary text-xs leading-relaxed line-clamp-2">{item.description}</p>
      )}
    </div>
  );
}

const CONDITION_OPTIONS = ['New', 'Good', 'Needs Repair', 'Out of Order'];
const initialForm = { equipment_name: '', purchase_date: '', condition_status: 'Good', location: '' };

export default function Equipment() {
  const [stats, setStats]         = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loadingEq, setLoadingEq] = useState(true);
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const modalDialogRef = useDialog(showModal, () => setShowModal(false));
  const [formData, setFormData]   = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Repair/Maintenance Modal State
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const repairModalDialogRef = useDialog(repairModalOpen, () => setRepairModalOpen(false));
  const [repairItemId, setRepairItemId]       = useState(null);
  const [repairDesc, setRepairDesc]           = useState('');
  const [repairCost, setRepairCost]           = useState(0);
  const [repairSubmitting, setRepairSubmitting] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const maintenanceModalDialogRef = useDialog(showMaintenanceModal, () => setShowMaintenanceModal(false));

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/stats`, { headers: getHeaders() });
      setStats(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchEquipment = useCallback(async (q = '') => {
    setLoadingEq(true);
    try {
      const { data } = await axios.get(API, { headers: getHeaders(), params: { search: q } });
      setEquipment(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); setEquipment([]); }
    finally { setLoadingEq(false); }
  }, []);

  const fetchMaintenance = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/maintenance`, { headers: getHeaders() });
      setMaintenance(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchStats(); fetchEquipment(); fetchMaintenance(); }, []);
  useEffect(() => { fetchEquipment(search); }, [search]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); };
  const clearSearch  = () => { setSearchInput(''); setSearch(''); };

  const openModal = () => {
    setFormData(initialForm); setFormError(''); setFormSuccess(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFormError('');
    try {
      await axios.post(API, formData, { headers: getHeaders() });
      setFormSuccess(true);
      fetchStats(); fetchEquipment(search);
      setTimeout(() => { setShowModal(false); setFormSuccess(false); }, 1200);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add equipment.');
    } finally { setSubmitting(false); }
  };

  const handleRepair = async (id) => {
    try {
      await axios.post(`${API}/${id}/repair`, {}, { headers: getHeaders() });
      fetchStats();
      fetchEquipment(search);
      fetchMaintenance();
    } catch (e) {
      console.error(e);
      alert('Failed to update repair status.');
    }
  };

  const handleSendToRepair = (id) => {
    setRepairItemId(id);
    setRepairDesc('Equipment sent to repair for maintenance.');
    setRepairCost(0);
    setRepairModalOpen(true);
  };

  const submitRepair = async (e) => {
    e.preventDefault();
    setRepairSubmitting(true);
    try {
      await axios.post(`${API}/${repairItemId}/send-repair`, 
        { description: repairDesc, cost: parseFloat(repairCost) }, 
        { headers: getHeaders() }
      );
      setRepairModalOpen(false);
      fetchStats();
      fetchEquipment(search);
      fetchMaintenance();
    } catch (e) {
      console.error(e);
      alert('Failed to send to repair.');
    } finally {
      setRepairSubmitting(false);
    }
  };

  // upcoming / overdue split for maintenance panel
  const overdue   = maintenance.filter(m => m.condition_status === 'Needs Repair' || m.condition_status === 'Out of Order').slice(0, 3);
  const upcoming  = maintenance.filter(m => m.condition_status !== 'Needs Repair' && m.condition_status !== 'Out of Order').slice(0, 3);
  const panelItems = [...upcoming, ...overdue].slice(0, 4);
  const urgentCount = stats?.maintenance_due ?? overdue.length;

  return (
    <div className="space-y-6 pb-10 font-manrope">

      {/* ── Stats Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Equipment */}
        <div className="stat-card group">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[10px] font-space font-black tracking-[0.2em] text-iron-text-secondary">Total Equipment</p>
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-iron-text-secondary group-hover:bg-iron-lime/10 group-hover:text-iron-lime transition-colors">
              <Package size={14} />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-space font-black text-white tracking-tighter">
              {stats?.total ?? '00'}
            </p>
            <div className="text-right">
              <p className="text-[10px] font-black tracking-widest text-iron-lime">Reliability</p>
              <p className="text-sm font-space font-black text-white tracking-tight">{stats?.reliability_score ?? '000'}</p>
            </div>
          </div>
        </div>

        {/* Active Equipment */}
        <div className="stat-card group">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[10px] font-space font-black tracking-[0.2em] text-iron-text-secondary">Active Assets</p>
            <div className="w-8 h-8 rounded-lg bg-iron-lime/10 flex items-center justify-center text-iron-lime">
              <Zap size={14} />
            </div>
          </div>
          <p className="text-4xl font-space font-black text-white tracking-tighter">
            {stats?.active ?? '00'}
          </p>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-iron-lime rounded-full" style={{ width: `${Math.min((stats?.active / (stats?.total || 1)) * 100, 100)}%` }} />
          </div>
        </div>

        {/* Utilization % */}
        <div className="stat-card group">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[10px] font-space font-black tracking-[0.2em] text-iron-text-secondary">Utilization %</p>
            <div className="w-8 h-8 rounded-lg bg-iron-blue/10 flex items-center justify-center text-iron-blue">
              <LayoutGrid size={14} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-space font-black text-white tracking-tighter">
              {stats?.utilization ?? '0.0'}%
            </p>
            <span className="text-emerald-400 text-[10px] font-black mb-1.5">Optimal</span>
          </div>
        </div>

        {/* Maintenance Due */}
        <div className="stat-card group border-red-500/20">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[10px] font-space font-black tracking-[0.2em] text-iron-text-secondary">Maintenance Due</p>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertTriangle size={14} />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-space font-black text-red-500 tracking-tighter">
              {stats?.maintenance_due !== undefined ? String(stats.maintenance_due).padStart(2, '0') : '00'}
            </p>
            <div className="flex items-center gap-1">
              <ShieldAlert size={12} className="text-red-500" />
              <span className="text-[10px] font-black tracking-widest text-red-500">Urgent</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">

        {/* ── LEFT: Gym Inventory ───────────────────────────────── */}
        <div className="card !p-0 overflow-hidden flex flex-col">
          {/* Panel header */}
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-white font-space font-black text-lg italic tracking-tight">Gym Inventory</h2>
                <p className="text-iron-text-secondary text-xs italic mt-0.5">Real-time equipment performance and status</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Search */}
                <form onSubmit={handleSearch} className="relative flex items-center">
                  <Search size={13} className="absolute left-3 text-iron-text-secondary pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search machine or ID..."
                    aria-label="Search equipment"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className="bg-[#18181A] border border-border rounded-lg pl-8 pr-8 py-2 text-xs text-white placeholder:text-iron-text-secondary/60 outline-none focus:border-iron-lime/40 transition-colors w-48"
                  />
                  {searchInput && (
                    <button type="button" onClick={clearSearch} aria-label="Clear search" className="absolute right-2 text-iron-text-secondary hover:text-white">
                      <X size={12} />
                    </button>
                  )}
                </form>
                {/* Add button */}
                <button onClick={openModal} className="btn flex items-center gap-2 whitespace-nowrap !py-2">
                  <Plus size={13} /> Add Equipment
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="iron-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Condition</th>
                  <th>Last Serviced</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingEq ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex justify-center items-center gap-3 text-iron-text-secondary text-xs font-space tracking-widest">
                        <Loader2 size={15} className="animate-spin text-iron-lime" /> Loading inventory...
                      </div>
                    </td>
                  </tr>
                ) : equipment.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-iron-text-secondary italic text-sm">
                      No equipment found. Click "+ Add Equipment" to get started.
                    </td>
                  </tr>
                ) : (
                  equipment.map(item => (
                    <tr key={item.equipment_id} className="group">
                      <td>
                        <span className="text-iron-text-secondary text-xs font-black tracking-widest font-space">
                          #{item.equipment_id.toString().padStart(3, '0')}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center text-sm flex-shrink-0">
                            {EQUIP_ICONS[item.category] || '⚙️'}
                          </div>
                          <span className="text-white font-semibold text-sm group-hover:text-iron-lime transition-colors">
                            {item.equipment_name}
                          </span>
                        </div>
                      </td>
                      <td><CategoryBadge category={item.category} /></td>
                      <td>
                        <span className={`text-sm ${CONDITION_COLOR[item.condition_status] || 'text-white'}`}>
                          {item.condition_status}
                        </span>
                      </td>
                      <td>
                        <span className="text-iron-text-secondary text-xs">{formatShortDate(item.last_serviced)}</span>
                      </td>
                      <td><StatusDot status={item.display_status} /></td>
                      <td className="text-right">
                        {(item.condition_status === 'Needs Repair' || item.condition_status === 'Out of Order') ? (
                          <button onClick={() => handleRepair(item.equipment_id)} className="px-3 py-1 bg-iron-lime/10 text-iron-lime text-[10px] font-black tracking-widest rounded hover:bg-iron-lime/20 transition-colors whitespace-nowrap">
                            Mark Repaired
                          </button>
                        ) : (
                          <button onClick={() => handleSendToRepair(item.equipment_id)} className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black tracking-widest rounded hover:bg-red-500/20 transition-colors whitespace-nowrap">
                            Send Repair
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          {equipment.length > 0 && (
            <div className="px-6 py-3 border-t border-border bg-white/[0.01]">
              <p className="text-iron-text-secondary text-xs italic">
                Showing <span className="text-white font-semibold">{equipment.length}</span> items
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Maintenance Panel ──────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Maintenance Schedule */}
          <div className="card !p-0 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={15} className="text-iron-text-secondary" />
                <h3 className="text-white font-space font-black tracking-widest text-sm italic">Maintenance</h3>
              </div>
              {urgentCount > 0 && (
                <span className="px-2.5 py-1 bg-red-500 text-white text-[11px] font-black tracking-widest rounded">
                  Urgent
                </span>
              )}
            </div>

            <div className="px-5 py-4 space-y-5 flex-1">
              {panelItems.length === 0 ? (
                <p className="text-iron-text-secondary text-xs italic text-center py-4">
                  No upcoming maintenance scheduled.
                </p>
              ) : (
                panelItems.map(item => (
                  <MaintenanceItem key={item.maintenance_id} item={item} />
                ))
              )}
            </div>

            {/* View full schedule */}
            <button
              onClick={() => setShowMaintenanceModal(true)}
              className="mx-5 mb-5 mt-auto flex items-center justify-center gap-2 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-[11px] font-black tracking-[0.2em] text-iron-text-secondary hover:text-white hover:border-white/20 transition-all"
            >
              <Clock size={12} /> Full Log
            </button>
          </div>

          {/* Quick stats card */}
          <div className="card space-y-3">
            <p className="text-xs font-space font-black tracking-widest text-iron-text-secondary mb-3">Condition Breakdown</p>
            {[
              { label: 'New',          color: 'bg-iron-lime',    key: 'New'           },
              { label: 'Good',         color: 'bg-emerald-400',  key: 'Good'          },
              { label: 'Needs Repair', color: 'bg-amber-400',    key: 'Needs Repair'  },
              { label: 'Out of Order', color: 'bg-red-500',      key: 'Out of Order'  },
            ].map(({ label, color, key }) => {
              const count = equipment.filter(e => e.condition_status === key).length;
              const pct   = equipment.length > 0 ? Math.round((count / equipment.length) * 100) : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-iron-text-secondary font-medium">{label}</span>
                    <span className="text-xs font-bold text-white font-space">{count}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Add Equipment Modal ────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div ref={modalDialogRef} role="dialog" aria-modal="true" aria-labelledby="equipment-showModal-title" tabIndex={-1} className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 id="equipment-showModal-title" className="text-white font-space font-bold text-base tracking-wide">Add Equipment</h2>
                <p className="text-iron-text-secondary text-xs italic mt-0.5">Register a new asset to the inventory</p>
              </div>
              <button aria-label="Close dialog" onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-iron-text-secondary hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <p className="text-xs text-iron-text-secondary">Fields marked <span aria-hidden="true" className="text-red-400">*</span><span className="sr-only">with an asterisk</span> are required.</p>
              {formError && (
                <div role="alert" className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs">
                  <AlertCircle size={14} className="flex-shrink-0" />{formError}
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-xs">
                  <CheckCircle size={14} className="flex-shrink-0" />Equipment added successfully!
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="equipment-equipment-name" className="text-iron-text-secondary text-xs tracking-widest font-space font-semibold">
                  Equipment Name <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <input id="equipment-equipment-name" required type="text" placeholder="e.g. SteelForce Power Rack"
                  value={formData.equipment_name}
                  onChange={e => setFormData({ ...formData, equipment_name: e.target.value })}
                  className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors placeholder:text-iron-text-secondary/50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="equipment-purchase-date" className="text-iron-text-secondary text-xs tracking-widest font-space font-semibold">
                    Purchase Date
                  </label>
                  <input id="equipment-purchase-date" type="date"
                    value={formData.purchase_date}
                    onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="equipment-condition-status" className="text-iron-text-secondary text-xs tracking-widest font-space font-semibold">
                    Condition <span aria-hidden="true" className="text-red-400">*</span>
                  </label>
                  <select id="equipment-condition-status" required value={formData.condition_status}
                    onChange={e => setFormData({ ...formData, condition_status: e.target.value })}
                    className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors">
                    {CONDITION_OPTIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="equipment-location" className="text-iron-text-secondary text-xs tracking-widest font-space font-semibold">
                  Location / Zone
                </label>
                <input id="equipment-location" type="text" placeholder="e.g. Main Floor, Zone A"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors placeholder:text-iron-text-secondary/50" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex-1 btn flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Plus size={13} /> Add Equipment</>}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 px-6 bg-white/[0.03] border border-white/10 rounded text-white text-xs font-space font-semibold tracking-wider hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Send to Repair Modal ─────────────────────────────────────── */}
      {repairModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setRepairModalOpen(false)}>
          <div ref={repairModalDialogRef} role="dialog" aria-modal="true" aria-labelledby="equipment-repairModalOpen-title" tabIndex={-1} className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 id="equipment-repairModalOpen-title" className="text-white font-space font-bold text-base tracking-wide">Send to Repair</h2>
                <p className="text-iron-text-secondary text-xs italic mt-0.5">Log maintenance details</p>
              </div>
              <button aria-label="Close dialog" onClick={() => setRepairModalOpen(false)} className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-iron-text-secondary hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>
            
            <form onSubmit={submitRepair} className="px-6 py-5 space-y-4">
              <p className="text-xs text-iron-text-secondary">Fields marked <span aria-hidden="true" className="text-red-400">*</span><span className="sr-only">with an asterisk</span> are required.</p>
              <div className="space-y-1">
                <label htmlFor="equipment-repairDesc" className="text-iron-text-secondary text-xs tracking-widest font-space font-semibold">Maintenance Description <span aria-hidden="true" className="text-red-400">*</span></label>
                <textarea id="equipment-repairDesc" 
                  required
                  value={repairDesc}
                  onChange={e => setRepairDesc(e.target.value)}
                  className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors h-24 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="equipment-repairCost" className="text-iron-text-secondary text-xs tracking-widest font-space font-semibold">Estimated Cost (₹)</label>
                <input id="equipment-repairCost" 
                  type="number" 
                  step="0.01"
                  value={repairCost}
                  onChange={e => setRepairCost(e.target.value)}
                  className="w-full bg-[#18181A] border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-iron-lime/50 transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={repairSubmitting} className="flex-1 btn flex items-center justify-center gap-2">
                  {repairSubmitting ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : 'Send to Repair'}
                </button>
                <button type="button" onClick={() => setRepairModalOpen(false)} className="flex-1 py-3 px-6 bg-white/[0.03] border border-white/10 rounded text-white text-xs font-space font-semibold tracking-wider hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setShowMaintenanceModal(false)}>
          <div ref={maintenanceModalDialogRef} role="dialog" aria-modal="true" aria-labelledby="equipment-showMaintenanceModal-title" tabIndex={-1} className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 id="equipment-showMaintenanceModal-title" className="text-white font-space font-bold text-base tracking-wide">Maintenance Schedule</h2>
                <p className="text-iron-text-secondary text-xs italic mt-0.5">Latest maintenance item per equipment</p>
              </div>
              <button aria-label="Close dialog" onClick={() => setShowMaintenanceModal(false)} className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center text-iron-text-secondary hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[65vh] px-6 py-5 space-y-4">
              {maintenance.length === 0 ? (
                <p className="text-iron-text-secondary text-sm italic text-center py-8">No maintenance records found.</p>
              ) : (
                maintenance.map(item => (
                  <div key={item.maintenance_id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-white font-bold text-sm">{item.equipment_name}</p>
                        <p className="text-iron-text-secondary text-xs italic mt-1">{item.description || 'No description provided'}</p>
                      </div>
                      <span className={`text-[11px] font-black tracking-widest ${
                        item.condition_status === 'Needs Repair' || item.condition_status === 'Out of Order' ? 'text-red-400' : 'text-iron-lime'
                      }`}>
                        {item.date_label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-iron-text-secondary">Condition: <span className="text-white">{item.condition_status}</span></span>
                      <span className="text-iron-text-secondary">Date: <span className="text-white">{formatDate(item.maintenance_date)}</span></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
