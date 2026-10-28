import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Search, X, Dumbbell, Loader2, Clock, IndianRupee,
  UserCheck, Pencil, CreditCard, Banknote, Smartphone,
  Building2, CheckCircle, AlertCircle, BadgeCheck, CalendarDays
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const API = 'http://localhost:5000/api/members';
const PLANS_API = 'http://localhost:5000/api/plans';
const SUB_SP_API = 'http://localhost:5000/api/db/procedures/renew-subscription';

const METHOD_ICONS = {
  Card: <CreditCard size={14} />,
  Cash: <Banknote size={14} />,
  UPI: <Smartphone size={14} />,
  'Bank Transfer': <Building2 size={14} />,
};

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function getHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const initialFormState = {
  name: '', email: '', phone: '', gender: 'Male', date_of_birth: ''
};

export default function Members() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Subscription Modal ────────────────────────────────────────
  const [showSubModal, setShowSubModal] = useState(false);
  const [subTarget, setSubTarget] = useState(null); // { member_id, name }
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [subForm, setSubForm] = useState({ plan_id: '', payment_method: 'Card' });
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subError, setSubError] = useState('');
  const [subSuccess, setSubSuccess] = useState('');

  const selectedPlan = plans.find(p => p.plan_id === parseInt(subForm.plan_id));
  const today = new Date().toISOString().split('T')[0];
  const endDate = selectedPlan ? addMonths(today, selectedPlan.duration_months) : '';

  const openSubModal = useCallback(async (member) => {
    setSubTarget(member);
    setSubForm({ plan_id: '', payment_method: 'Card' });
    setSubError('');
    setSubSuccess('');
    setShowSubModal(true);
    setPlansLoading(true);
    try {
      const { data: planData } = await axios.get(PLANS_API, { headers: getHeaders() });
      setPlans(Array.isArray(planData) ? planData : []);
    } catch {
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const location = useLocation();

  const fetchMembers = async () => {
    try {
      const res = await axios.get(API, { headers: getHeaders() });
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };


  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subForm.plan_id) { setSubError('Please select a membership plan.'); return; }
    setSubSubmitting(true);
    setSubError('');
    setSubSuccess('');
    try {
      const { data: result } = await axios.post(SUB_SP_API, {
        member_id: subTarget.member_id,
        plan_id: parseInt(subForm.plan_id),
        payment_method: subForm.payment_method,
      }, { headers: getHeaders() });
      if (result.subscription_id > 0) {
        setSubSuccess(result.message || 'Subscription assigned successfully!');
        fetchMembers();
        setTimeout(() => { setShowSubModal(false); setSubSuccess(''); }, 2500);
      } else {
        setSubError(result.message || 'Failed to assign subscription.');
      }
    } catch (err) {
      setSubError(err.response?.data?.message || err.response?.data?.error || 'Failed to assign subscription.');
    } finally {
      setSubSubmitting(false);
    }
  };

  useEffect(() => { 
    fetchMembers(); 
    if (location.state?.openModal) {
      setShowModal(true);
      // Optional: clear state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Uses sp_register_member STORED PROCEDURE via backend
  const handleAdd = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError('');
    setModalSuccess('');
    try {
      const res = await axios.post(API, formData, { headers: getHeaders() });
      setModalSuccess(res.data.message || 'Member registered successfully!');
      fetchMembers();
      setTimeout(() => { setShowModal(false); setModalSuccess(''); setFormData(initialFormState); }, 1500);
    } catch (err) {
      // Error message comes from stored procedure validation
      setModalError(err.response?.data?.message || 'Failed to add member.');
    } finally { setIsSubmitting(false); }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setModalError('');
    setModalSuccess('');
    setShowModal(true);
  };

  const openEditModal = (member) => {
    setEditingId(member.member_id);
    setFormData({
      name: member.member_name || member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      gender: member.gender || 'Male',
      date_of_birth: member.date_of_birth ? new Date(member.date_of_birth).toISOString().split('T')[0] : '',
      join_date: member.join_date ? new Date(member.join_date).toISOString().split('T')[0] : '',
      status: member.member_status || member.status || 'Active'
    });
    setModalError('');
    setModalSuccess('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    if (editingId) {
      e.preventDefault();
      setIsSubmitting(true);
      setModalError('');
      setModalSuccess('');
      try {
        await axios.put(`${API}/${editingId}`, formData, { headers: getHeaders() });
        setModalSuccess('Member updated successfully!');
        fetchMembers();
        setTimeout(() => {
          setShowModal(false);
          setModalSuccess('');
          setEditingId(null);
          setFormData(initialFormState);
        }, 1200);
      } catch (err) {
        setModalError(err.response?.data?.message || 'Failed to update member.');
      } finally { setIsSubmitting(false); }
      return;
    }
    return handleAdd(e);
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??';

  // Filter + search
  const filtered = data.filter(m => {
    const matchesSearch = !searchQuery ||
      (m.member_name || m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const status = (m.member_status || m.status || '').toLowerCase();
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = data.filter(m => (m.member_status || m.status || '').toLowerCase() === 'active').length;

  // Check if enriched data is available (view + functions ran)
  const hasEnrichedData = data.length > 0 && data[0].subscription_status_label !== undefined;

  return (
    <div className="space-y-8 pb-12 font-manrope">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-space font-bold tracking-tighter mb-2" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>Members</h1>
          <p className="text-iron-text-secondary font-medium italic text-sm">
            {data.length} total · {activeCount} active
            {hasEnrichedData && <span className="ml-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-black uppercase tracking-widest">View + Functions Active</span>}
          </p>
        </div>
        <button className="btn flex items-center gap-2 group" onClick={openCreateModal}>
          <Dumbbell size={18} className="group-hover:rotate-12 transition-transform" />
          <span>Register Member</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-iron-text-secondary group-focus-within:text-iron-lime transition-colors">
            <Search size={18} />
          </div>
          <input type="text" placeholder="Search by name or email..."
            className="w-full bg-surface border border-border rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-iron-lime transition-all"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-4">
          <select className="bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-iron-lime appearance-none min-w-[140px] cursor-pointer"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="card !p-0 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="iron-table">
            <thead>
              <tr className="bg-white/[0.01]">
                <th>MEMBER</th>
                <th>CONTACT</th>
                {hasEnrichedData && <th>AGE</th>}
                {hasEnrichedData && <th>PLAN & STATUS</th>}
                {hasEnrichedData && <th>REVENUE</th>}
                {hasEnrichedData && <th>VISITS</th>}
                {!hasEnrichedData && <th>JOIN DATE</th>}
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading ? (
                <tr>
                  <td colSpan={hasEnrichedData ? 8 : 6} className="py-20 text-center text-iron-text-secondary font-space uppercase tracking-widest text-xs animate-pulse italic">
                    Retrieving member directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={hasEnrichedData ? 8 : 6} className="py-20 text-center text-iron-text-secondary italic">
                    No members found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(member => {
                  const name = member.member_name || member.name;
                  const status = (member.member_status || member.status || 'Active').toLowerCase();
                  const isActive = status === 'active';

                  return (
                    <tr key={member.member_id} className="group hover:bg-iron-lime/[0.02] transition-colors">
                      <td>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-iron-lime/10 border border-iron-lime/20 flex items-center justify-center font-bold text-xs text-iron-lime group-hover:border-iron-lime/40 transition-all">
                            {getInitials(name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold group-hover:text-iron-lime transition-colors" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{name}</span>
                            <span className="text-xs font-bold text-iron-text-secondary uppercase tracking-tighter">ID: IC-{member.member_id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-white/80">{member.email}</span>
                          <span className="text-xs font-medium text-iron-text-secondary tracking-tighter italic">{member.phone || '—'}</span>
                        </div>
                      </td>

                      {/* ── Enriched columns from VIEW + FUNCTIONS ── */}
                      {hasEnrichedData && (
                        <>
                          {/* fn_member_age() */}
                          <td>
                            <span className="text-sm font-space font-bold" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>
                              {member.age != null ? member.age : '—'}
                            </span>
                            {member.age != null && <span className="text-iron-text-secondary text-xs ml-1">yrs</span>}
                          </td>

                          {/* vw_member_dashboard plan + fn_subscription_status_label() */}
                          <td>
                            <div className="flex flex-col gap-1.5">
                              {member.plan_name ? (
                                <span className="px-2.5 py-0.5 bg-iron-blue/10 text-iron-blue border border-iron-blue/20 rounded text-[11px] font-black uppercase tracking-widest w-fit">
                                  {member.plan_name}
                                </span>
                              ) : (
                                <span className="text-iron-text-secondary text-xs italic">No plan</span>
                              )}
                              <span className={`text-xs font-bold italic ${
                                (member.subscription_status_label || '').includes('Expiring') ? 'text-amber-400' :
                                (member.subscription_status_label || '').includes('Expired') ? 'text-red-400' :
                                (member.subscription_status_label || '').includes('Active') ? 'text-emerald-400' :
                                'text-iron-text-secondary'
                              }`}>
                                {member.subscription_status_label || '—'}
                              </span>
                              {member.days_remaining != null && member.days_remaining > 0 && member.days_remaining <= 7 && (
                                <span className="flex items-center gap-1 text-amber-400 text-[11px] font-black uppercase tracking-widest">
                                  <Clock size={10} /> Renew Soon
                                </span>
                              )}
                            </div>
                          </td>

                          {/* fn_total_revenue_by_member() */}
                          <td>
                            <div className="flex items-center gap-1.5">
                              <IndianRupee size={12} className="text-emerald-500" />
                              <span className="font-space font-bold text-sm" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>
                                {member.lifetime_revenue != null ? parseFloat(member.lifetime_revenue).toFixed(2) : '0.00'}
                              </span>
                            </div>
                          </td>

                          {/* vw_member_dashboard total_visits */}
                          <td>
                            <span className="px-2.5 py-1 bg-surface border border-border rounded text-xs font-bold text-iron-text-secondary font-space">
                              {member.total_visits || 0}
                            </span>
                          </td>
                        </>
                      )}

                      {!hasEnrichedData && (
                        <td>
                          <span className="text-xs text-iron-text-secondary font-medium">
                            {member.join_date ? new Date(member.join_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                          </span>
                        </td>
                      )}

                      <td>
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-iron-lime shadow-[0_0_8px_rgba(223,255,0,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                          <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-iron-lime' : 'text-red-400'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(member)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs font-black uppercase tracking-widest text-iron-text-secondary hover:text-white hover:border-iron-lime/30 transition-all"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => openSubModal(member)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-iron-lime/10 border border-iron-lime/20 text-xs font-black uppercase tracking-widest text-iron-lime hover:bg-iron-lime/20 hover:border-iron-lime/40 transition-all"
                          >
                            <BadgeCheck size={12} />
                            Subscribe
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-white/[0.01] border-t border-white/[0.03] flex items-center justify-between">
          <p className="text-xs font-bold text-iron-text-secondary uppercase tracking-widest italic">
            Showing {filtered.length} of {data.length} members
          </p>
        </div>
      </div>

      {/* Register Modal — calls sp_register_member STORED PROCEDURE */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="bg-surface border border-border rounded-xl w-full max-w-[640px] relative z-[210] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-6 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{editingId ? 'Edit Member' : 'Register Member'}</h2>
                <p className="text-iron-text-secondary text-xs italic mt-1">
                  {editingId ? 'Update profile details and membership status' : 'Uses sp_register_member stored procedure'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-iron-text-secondary hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="w-full h-px bg-white/5" />

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {modalError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-3 italic">
                  <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-3">
                  <UserCheck size={14} />
                  <span className="font-bold">{modalSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-iron-text-secondary uppercase tracking-[0.2em] block">Full Name <span className="text-red-400">*</span></label>
                  <input required type="text" placeholder="e.g. Arjun Sharma"
                    className="w-full bg-surface border border-border rounded py-3 px-4 text-sm focus:outline-none focus:border-iron-lime transition-all placeholder:text-iron-text-secondary"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-iron-text-secondary uppercase tracking-[0.2em] block">Email Address <span className="text-red-400">*</span></label>
                  <input required type="email" placeholder="email@example.com"
                    className="w-full bg-surface border border-border rounded py-3 px-4 text-sm focus:outline-none focus:border-iron-lime transition-all placeholder:text-iron-text-secondary"
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-iron-text-secondary uppercase tracking-[0.2em] block">Phone Number</label>
                  <input type="text" placeholder="+91 00000 00000"
                    className="w-full bg-surface border border-border rounded py-3 px-4 text-sm focus:outline-none focus:border-iron-lime transition-all placeholder:text-iron-text-secondary"
                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-iron-text-secondary uppercase tracking-[0.2em] block">DOB</label>
                    <input type="date"
                      className="w-full bg-surface border border-border rounded py-3 px-4 text-sm focus:outline-none focus:border-iron-lime transition-all [color-scheme:light]"
                      value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-iron-text-secondary uppercase tracking-[0.2em] block">Gender</label>
                    <select className="w-full bg-surface border border-border rounded py-3 px-4 text-sm focus:outline-none focus:border-iron-lime cursor-pointer"
                      value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                {editingId && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-iron-text-secondary uppercase tracking-[0.2em] block">Join Date</label>
                      <input type="date"
                        className="w-full bg-surface border border-border rounded py-3 px-4 text-sm focus:outline-none focus:border-iron-lime transition-all [color-scheme:light]"
                        value={formData.join_date || ''} onChange={e => setFormData({ ...formData, join_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-iron-text-secondary uppercase tracking-[0.2em] block">Status</label>
                      <select className="w-full bg-surface border border-border rounded py-3 px-4 text-sm focus:outline-none focus:border-iron-lime cursor-pointer"
                        value={formData.status || 'Active'} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-lg border border-border text-xs font-bold tracking-widest uppercase hover:bg-black/5 transition-all" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-6 py-3 rounded-lg bg-iron-lime text-dark text-xs font-black tracking-widest uppercase hover:shadow-[0_0_20px_rgba(223,255,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <span>{editingId ? 'Save Changes' : 'Register Member'}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Subscription Modal ─────────────────────────────────────── */}
      {showSubModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark/80 backdrop-blur-md" onClick={() => setShowSubModal(false)} />
          <div className="bg-surface border border-border rounded-xl w-full max-w-[560px] relative z-[210] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden">

            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-iron-lime/10 flex items-center justify-center">
                    <BadgeCheck size={20} className="text-iron-lime" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Assign Membership</h2>
                    <p className="text-iron-text-secondary text-xs italic mt-0.5">
                      Subscribing: <span className="text-white font-bold">{subTarget?.member_name || subTarget?.name}</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowSubModal(false)} className="text-iron-text-secondary hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubscribe} className="p-6 space-y-5">
              {/* Alerts */}
              {subError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-3">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{subError}</span>
                </div>
              )}
              {subSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-3">
                  <CheckCircle size={14} className="shrink-0" />
                  <span>{subSuccess}</span>
                </div>
              )}

              {/* Plan selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-iron-text-secondary uppercase tracking-[0.2em] block">
                  Membership Plan <span className="text-red-400">*</span>
                </label>
                {plansLoading ? (
                  <div className="flex items-center gap-3 py-4 text-iron-text-secondary text-xs">
                    <Loader2 size={14} className="animate-spin text-iron-lime" />
                    Loading plans...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {plans.map(p => {
                      const isSelected = parseInt(subForm.plan_id) === p.plan_id;
                      return (
                        <button
                          key={p.plan_id}
                          type="button"
                          onClick={() => setSubForm(f => ({ ...f, plan_id: String(p.plan_id) }))}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                            isSelected
                              ? 'bg-iron-lime/10 border-iron-lime/40 shadow-[0_0_15px_rgba(223,255,0,0.08)]'
                              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                          }`}
                        >
                          <div>
                            <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-iron-text-secondary'}`}>
                              {p.plan_name}
                            </p>
                            {p.description && (
                              <p className="text-iron-text-secondary text-xs italic mt-0.5">{p.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className={`text-lg font-space font-black ${isSelected ? 'text-iron-lime' : 'text-white'}`}>
                              ₹{parseFloat(p.price).toLocaleString('en-IN')}
                            </p>
                            <p className="text-iron-text-secondary text-[11px] font-bold uppercase tracking-widest">
                              {p.duration_months} month{p.duration_months !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                    {plans.length === 0 && !plansLoading && (
                      <p className="text-iron-text-secondary text-xs italic py-2">No membership plans found. Create one from the Payments page first.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Duration preview */}
              {selectedPlan && (
                <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                  <CalendarDays size={16} className="text-iron-lime shrink-0" />
                  <div className="flex-1">
                    <p className="text-iron-text-secondary text-xs">Subscription Period</p>
                    <p className="text-white text-sm font-bold mt-0.5">
                      {new Date(today).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})}
                      {' → '}
                      {new Date(endDate).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-iron-text-secondary text-xs">Total</p>
                    <p className="text-iron-lime font-space font-black text-base mt-0.5">
                      ₹{parseFloat(selectedPlan.price).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}

              {/* Payment method */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-iron-text-secondary uppercase tracking-[0.2em] block">
                  Payment Method <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['Card','Cash','UPI','Bank Transfer'].map(method => {
                    const isActive = subForm.payment_method === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSubForm(f => ({ ...f, payment_method: method }))}
                        className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-iron-lime/10 border-iron-lime/30 text-white'
                            : 'bg-white/[0.02] border-white/5 text-iron-text-secondary hover:border-white/10 hover:text-white'
                        }`}
                      >
                        <span className={isActive ? 'text-iron-lime' : ''}>{METHOD_ICONS[method]}</span>
                        <span className="capitalize leading-tight text-center text-[11px]">{method}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-6 py-3 rounded-lg border border-white/10 text-xs font-bold tracking-widest uppercase text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subSubmitting || !subForm.plan_id}
                  className="px-8 py-3 rounded-lg bg-iron-lime text-dark text-xs font-black tracking-widest uppercase hover:shadow-[0_0_20px_rgba(223,255,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {subSubmitting ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />}
                  {subSubmitting ? 'Assigning...' : 'Confirm Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
