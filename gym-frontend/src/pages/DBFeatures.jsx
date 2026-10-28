import React, { useState, useCallback } from 'react';
import axios from 'axios';
import {
  Database, Eye, Cog, FunctionSquare, Zap, ScrollText,
  Play, Loader2, ChevronDown, ChevronRight, AlertCircle,
  CheckCircle, Users, DollarSign, Calendar, Wrench,
  UserPlus, CreditCard, BarChart3, Shield, Clock,
  RefreshCw, X
} from 'lucide-react';

const API = 'http://localhost:5000/api/db';

function getHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Reusable Section Card ──────────────────────────────────────
function Section({ icon: Icon, title, badge, badgeColor = 'iron-lime', description, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card !p-0 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-5 border-b border-border hover:bg-white/[0.01] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-iron-lime/10 flex items-center justify-center text-iron-lime">
            <Icon size={18} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-3">
              <h3 className="text-white font-space font-bold text-sm tracking-widest">{title}</h3>
              {badge && (
                <span className={`px-2 py-0.5 bg-${badgeColor}/10 text-${badgeColor} border border-${badgeColor}/20 rounded text-[11px] font-black tracking-widest`}>
                  {badge}
                </span>
              )}
            </div>
            {description && <p className="text-iron-text-secondary text-xs italic mt-0.5">{description}</p>}
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-iron-text-secondary" /> : <ChevronRight size={16} className="text-iron-text-secondary" />}
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  );
}

// ── Run Button ─────────────────────────────────────────────────
function RunButton({ onClick, loading, label = 'Execute', icon: Icon = Play }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 bg-iron-lime text-dark rounded-lg font-space font-bold text-xs tracking-widest hover:shadow-[0_0_20px_rgba(223,255,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

// ── Result Table ───────────────────────────────────────────────
function ResultTable({ data, maxHeight = '400px' }) {
  if (!data || data.length === 0) return <p className="text-iron-text-secondary text-sm italic py-4">No results returned.</p>;
  const keys = Object.keys(data[0]);
  return (
    <div className="overflow-auto rounded-xl border border-border" style={{ maxHeight }}>
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-surface z-10">
          <tr>
            {keys.map(k => (
              <th key={k} className="px-4 py-3 text-xs font-space font-bold tracking-widest text-iron-text-secondary border-b border-border whitespace-nowrap">
                {k.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
              {keys.map(k => (
                <td key={k} className="px-4 py-3 text-xs text-white/80 whitespace-nowrap font-medium">
                  {row[k] === null ? <span className="text-iron-text-secondary italic">NULL</span> : String(row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── SQL Code Block ─────────────────────────────────────────────
function SQLBlock({ sql }) {
  return (
    <pre className="bg-[#0A0A0E] border border-border rounded-xl p-4 text-xs text-iron-lime/80 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed mb-4">
      <code>{sql}</code>
    </pre>
  );
}

// ── Status Message ─────────────────────────────────────────────
function StatusMsg({ msg }) {
  if (!msg) return null;
  const isError = msg.type === 'error';
  return (
    <div role={isError ? 'alert' : 'status'} className={`flex items-start gap-3 p-4 rounded-xl text-xs border mt-4 ${
      isError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    }`}>
      {isError ? <AlertCircle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle size={16} className="shrink-0 mt-0.5" />}
      <span className="font-medium">{msg.text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function DBFeatures() {
  // ── Views state ──────────────────────────────────────────────
  const [viewData, setViewData] = useState({});
  const [viewLoading, setViewLoading] = useState({});

  const runView = useCallback(async (key, endpoint) => {
    setViewLoading(p => ({ ...p, [key]: true }));
    try {
      const { data } = await axios.get(`${API}${endpoint}`, { headers: getHeaders() });
      setViewData(p => ({ ...p, [key]: data }));
    } catch (e) {
      setViewData(p => ({ ...p, [key]: [{ error: e.response?.data?.error || e.message }] }));
    }
    setViewLoading(p => ({ ...p, [key]: false }));
  }, []);

  // ── Functions state ──────────────────────────────────────────
  const [fnData, setFnData] = useState(null);
  const [fnLoading, setFnLoading] = useState(false);

  const runFunctions = useCallback(async () => {
    setFnLoading(true);
    try {
      const { data } = await axios.get(`${API}/functions/all`, { headers: getHeaders() });
      setFnData(data);
    } catch (e) {
      setFnData([{ error: e.response?.data?.error || e.message }]);
    }
    setFnLoading(false);
  }, []);

  // ── Procedures state ─────────────────────────────────────────
  const [procResult, setProcResult] = useState({});
  const [procLoading, setProcLoading] = useState({});
  const [procForm, setProcForm] = useState({
    reg: { name: '', gender: 'Male', phone: '', email: '', date_of_birth: '' },
    renew: { member_id: '', plan_id: '', payment_method: 'Card' },
    report: { month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) }
  });

  const runProcedure = useCallback(async (key, method, endpoint, body) => {
    setProcLoading(p => ({ ...p, [key]: true }));
    setProcResult(p => ({ ...p, [key]: null }));
    try {
      const config = { headers: getHeaders() };
      const { data } = method === 'GET'
        ? await axios.get(`${API}${endpoint}`, config)
        : await axios.post(`${API}${endpoint}`, body, config);
      setProcResult(p => ({ ...p, [key]: { type: 'success', data } }));
    } catch (e) {
      setProcResult(p => ({ ...p, [key]: { type: 'error', text: e.response?.data?.message || e.response?.data?.error || e.message } }));
    }
    setProcLoading(p => ({ ...p, [key]: false }));
  }, []);

  // ── Audit Log state ──────────────────────────────────────────
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);
  const [triggerLoading, setTriggerLoading] = useState(false);

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { data } = await axios.get(`${API}/audit-log`, { headers: getHeaders() });
      setAuditData(data);
    } catch (e) {
      setAuditData([{ error: e.response?.data?.error || e.message }]);
    }
    setAuditLoading(false);
  }, []);

  const runTriggerTest = useCallback(async () => {
    setTriggerLoading(true);
    try {
      const { data } = await axios.post(`${API}/trigger-test`, {}, { headers: getHeaders() });
      setTriggerResult({ type: 'success', text: data.message, entry: data.audit_entry });
    } catch (e) {
      setTriggerResult({ type: 'error', text: e.response?.data?.error || e.message });
    }
    setTriggerLoading(false);
  }, []);

  return (
    <div className="space-y-6 pb-12 font-manrope">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-4xl font-space font-bold tracking-tighter text-white mb-2">Advanced DB Features</h2>
          <p className="text-iron-text-secondary font-medium italic text-sm">
            Views, Stored Procedures, Functions & Triggers — CSS 2212 DBS Lab
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <Database size={14} className="text-emerald-400" />
          <span className="text-emerald-400 text-xs font-bold tracking-widest">MySQL 8.x Connected</span>
        </div>
      </div>

      {/* Feature summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Eye, label: 'Views', count: 4, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Cog, label: 'Procedures', count: 3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { icon: FunctionSquare, label: 'Functions', count: 3, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { icon: Zap, label: 'Triggers', count: 5, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map(({ icon: Icon, label, count, color, bg }) => (
          <div key={label} className="stat-card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-3xl font-space font-black text-white">{String(count).padStart(2, '0')}</p>
              <p className="text-xs font-bold text-iron-text-secondary tracking-widest">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION B: VIEWS                                         */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Section icon={Eye} title="Views" badge="4 Views" description="Pre-defined SQL views that join and aggregate data across tables" defaultOpen>
        <div className="space-y-6">

          {/* B1 — Member Dashboard */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Users size={16} className="text-blue-400" />
                <div>
                  <h4 className="text-white text-sm font-bold font-space">vw_member_dashboard</h4>
                  <p className="text-iron-text-secondary text-xs italic">Member + active plan + days remaining + total paid + visit count</p>
                </div>
              </div>
              <RunButton onClick={() => runView('member', '/views/member-dashboard')} loading={viewLoading.member} label="Run Query" />
            </div>
            <SQLBlock sql="SELECT * FROM vw_member_dashboard ORDER BY member_id;" />
            {viewData.member && <ResultTable data={viewData.member} />}
          </div>

          <hr className="border-border" />

          {/* B2 — Monthly Revenue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <DollarSign size={16} className="text-emerald-400" />
                <div>
                  <h4 className="text-white text-sm font-bold font-space">vw_monthly_revenue</h4>
                  <p className="text-iron-text-secondary text-xs italic">Revenue aggregated by month, plan, and payment method</p>
                </div>
              </div>
              <RunButton onClick={() => runView('revenue', '/views/monthly-revenue')} loading={viewLoading.revenue} label="Run Query" />
            </div>
            <SQLBlock sql="SELECT * FROM vw_monthly_revenue ORDER BY payment_month DESC;" />
            {viewData.revenue && <ResultTable data={viewData.revenue} />}
          </div>

          <hr className="border-border" />

          {/* B3 — Daily Attendance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-amber-400" />
                <div>
                  <h4 className="text-white text-sm font-bold font-space">vw_daily_attendance</h4>
                  <p className="text-iron-text-secondary text-xs italic">Today's check-ins with session duration and visit status</p>
                </div>
              </div>
              <RunButton onClick={() => runView('attendance', '/views/daily-attendance')} loading={viewLoading.attendance} label="Run Query" />
            </div>
            <SQLBlock sql="SELECT * FROM vw_daily_attendance WHERE date = CURDATE();" />
            {viewData.attendance && <ResultTable data={viewData.attendance} />}
          </div>

          <hr className="border-border" />

          {/* B4 — Equipment Health */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Wrench size={16} className="text-red-400" />
                <div>
                  <h4 className="text-white text-sm font-bold font-space">vw_equipment_health</h4>
                  <p className="text-iron-text-secondary text-xs italic">Equipment + last service date + maintenance overdue flag</p>
                </div>
              </div>
              <RunButton onClick={() => runView('equipment', '/views/equipment-health')} loading={viewLoading.equipment} label="Run Query" />
            </div>
            <SQLBlock sql="SELECT * FROM vw_equipment_health WHERE maintenance_flag = 'Overdue';" />
            {viewData.equipment && <ResultTable data={viewData.equipment} />}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION C: STORED PROCEDURES                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Section icon={Cog} title="Stored Procedures" badge="3 Procedures" badgeColor="purple-400" description="Reusable server-side logic with validation, transactions, and multi-result reports">
        <div className="space-y-8">

          {/* C1 — Register Member */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <UserPlus size={16} className="text-purple-400" />
              <div>
                <h4 className="text-white text-sm font-bold font-space">sp_register_member</h4>
                <p className="text-iron-text-secondary text-xs italic">Inserts a new member with name, email uniqueness, and gender validation</p>
              </div>
            </div>
            <SQLBlock sql={`CALL sp_register_member(\n  'Rahul Sharma', 'Male', '9876543210',\n  'rahul@gym.com', '1998-03-15',\n  @new_id, @msg\n);\nSELECT @new_id AS member_id, @msg AS result;`} />

              <p className="text-xs text-iron-text-secondary">Fields marked <span aria-hidden="true" className="text-red-400">*</span><span className="sr-only">with an asterisk</span> are required.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-iron-text-secondary">
                <span>Name <span aria-hidden="true" className="text-red-400">*</span></span>
                <input aria-required="true" placeholder="e.g. Rahul Sharma" value={procForm.reg.name}
                  onChange={e => setProcForm(p => ({ ...p, reg: { ...p.reg, name: e.target.value } }))}
                  className="bg-[#18181A] border border-border rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-iron-lime/40" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-iron-text-secondary">
                <span>Email <span aria-hidden="true" className="text-red-400">*</span></span>
                <input aria-required="true" placeholder="rahul@gym.com" value={procForm.reg.email}
                  onChange={e => setProcForm(p => ({ ...p, reg: { ...p.reg, email: e.target.value } }))}
                  className="bg-[#18181A] border border-border rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-iron-lime/40" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-iron-text-secondary">
                <span>Phone</span>
                <input placeholder="9876543210" value={procForm.reg.phone}
                  onChange={e => setProcForm(p => ({ ...p, reg: { ...p.reg, phone: e.target.value } }))}
                  className="bg-[#18181A] border border-border rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-iron-lime/40" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-iron-text-secondary">
                <span>Gender</span>
                <select value={procForm.reg.gender}
                  onChange={e => setProcForm(p => ({ ...p, reg: { ...p.reg, gender: e.target.value } }))}
                  className="bg-[#18181A] border border-border rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-iron-lime/40">
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-iron-text-secondary">
                <span>Date of Birth</span>
                <input type="date" value={procForm.reg.date_of_birth}
                  onChange={e => setProcForm(p => ({ ...p, reg: { ...p.reg, date_of_birth: e.target.value } }))}
                  className="bg-[#18181A] border border-border rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-iron-lime/40" />
              </label>
              <RunButton
                onClick={() => runProcedure('reg', 'POST', '/procedures/register-member', procForm.reg)}
                loading={procLoading.reg} label="Execute" />
            </div>
            {procResult.reg && (
              procResult.reg.type === 'error'
                ? <StatusMsg msg={procResult.reg} />
                : <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
                    <CheckCircle size={14} className="inline mr-2" />
                    <span className="font-bold">Result:</span> {procResult.reg.data?.message}
                    {procResult.reg.data?.member_id > 0 && <span className="ml-2 text-white font-space">(ID: {procResult.reg.data.member_id})</span>}
                  </div>
            )}
          </div>

          <hr className="border-border" />

          {/* C2 — Renew Subscription */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CreditCard size={16} className="text-purple-400" />
              <div>
                <h4 className="text-white text-sm font-bold font-space">sp_renew_subscription</h4>
                <p className="text-iron-text-secondary text-xs italic">Expires old subscription, creates new one, records payment, reactivates member</p>
              </div>
            </div>
            <SQLBlock sql={`CALL sp_renew_subscription(\n  2, 3, 'UPI',\n  @sub_id, @msg\n);\nSELECT @sub_id AS subscription_id, @msg AS result;`} />

            <div className="flex gap-3 flex-wrap items-end">
              <label className="flex flex-col gap-1 text-xs font-bold text-iron-text-secondary">
                <span>Member ID <span aria-hidden="true" className="text-red-400">*</span></span>
                <input aria-required="true" type="number" placeholder="e.g. 2" value={procForm.renew.member_id}
                  onChange={e => setProcForm(p => ({ ...p, renew: { ...p.renew, member_id: e.target.value } }))}
                  className="bg-[#18181A] border border-border rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-iron-lime/40 w-32" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-iron-text-secondary">
                <span>Plan ID <span aria-hidden="true" className="text-red-400">*</span></span>
                <input aria-required="true" type="number" placeholder="e.g. 3" value={procForm.renew.plan_id}
                  onChange={e => setProcForm(p => ({ ...p, renew: { ...p.renew, plan_id: e.target.value } }))}
                  className="bg-[#18181A] border border-border rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-iron-lime/40 w-32" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-iron-text-secondary">
                <span>Payment Method</span>
                <select value={procForm.renew.payment_method}
                  onChange={e => setProcForm(p => ({ ...p, renew: { ...p.renew, payment_method: e.target.value } }))}
                  className="bg-[#18181A] border border-border rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-iron-lime/40">
                  <option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option>
                </select>
              </label>
              <RunButton
                onClick={() => runProcedure('renew', 'POST', '/procedures/renew-subscription', procForm.renew)}
                loading={procLoading.renew} label="Execute" />
            </div>
            {procResult.renew && (
              procResult.renew.type === 'error'
                ? <StatusMsg msg={procResult.renew} />
                : <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
                    <CheckCircle size={14} className="inline mr-2" />
                    <span className="font-bold">Result:</span> {procResult.renew.data?.message}
                  </div>
            )}
          </div>

          <hr className="border-border" />

          {/* C3 — Performance Report */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <BarChart3 size={16} className="text-purple-400" />
              <div>
                <h4 className="text-white text-sm font-bold font-space">sp_gym_performance_report</h4>
                <p className="text-iron-text-secondary text-xs italic">Multi-result-set report: membership, revenue, attendance, top members, equipment alerts</p>
              </div>
            </div>
            <SQLBlock sql={`CALL sp_gym_performance_report(1, 2023);\n-- Returns 5 result sets: membership, revenue, attendance, top members, alerts`} />

            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label htmlFor="dbfeatures-month" className="text-iron-text-secondary text-xs tracking-widest font-bold block mb-1">Month</label>
                <select id="dbfeatures-month" value={procForm.report.month}
                  onChange={e => setProcForm(p => ({ ...p, report: { ...p.report, month: e.target.value } }))}
                  className="bg-[#18181A] border border-border rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-iron-lime/40">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString('en', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dbfeatures-year" className="text-iron-text-secondary text-xs tracking-widest font-bold block mb-1">Year</label>
                <input id="dbfeatures-year" type="number" value={procForm.report.year}
                  onChange={e => setProcForm(p => ({ ...p, report: { ...p.report, year: e.target.value } }))}
                  className="bg-[#18181A] border border-border rounded-lg px-4 py-3 text-xs text-white outline-none focus:border-iron-lime/40 w-24" />
              </div>
              <RunButton
                onClick={() => runProcedure('report', 'GET', `/procedures/performance-report?month=${procForm.report.month}&year=${procForm.report.year}`)}
                loading={procLoading.report} label="Generate Report" icon={BarChart3} />
            </div>
            {procResult.report && procResult.report.type === 'error' && <StatusMsg msg={procResult.report} />}
            {procResult.report && procResult.report.type === 'success' && procResult.report.data && (
              <div className="space-y-4 mt-4">
                <h5 className="text-white font-space font-bold text-xs tracking-widest flex items-center gap-2">
                  <BarChart3 size={12} className="text-iron-lime" />
                  Report for {new Date(2000, procResult.report.data.month - 1).toLocaleString('en', { month: 'long' })} {procResult.report.data.year}
                </h5>

                {procResult.report.data.membership && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(procResult.report.data.membership).map(([k, v]) => (
                      <div key={k} className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
                        <p className="text-[11px] text-iron-text-secondary tracking-widest font-bold">{k.replace(/_/g, ' ')}</p>
                        <p className="text-white font-space font-bold text-lg">{v ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                )}

                {procResult.report.data.revenue && procResult.report.data.revenue.length > 0 && (
                  <div>
                    <p className="text-iron-text-secondary text-xs tracking-widest font-bold mb-2">Revenue by Method</p>
                    <ResultTable data={procResult.report.data.revenue} maxHeight="200px" />
                  </div>
                )}

                {procResult.report.data.attendance && (
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(procResult.report.data.attendance).map(([k, v]) => (
                      <div key={k} className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
                        <p className="text-[11px] text-iron-text-secondary tracking-widest font-bold">{k.replace(/_/g, ' ')}</p>
                        <p className="text-white font-space font-bold text-lg">{v ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                )}

                {procResult.report.data.top_members && procResult.report.data.top_members.length > 0 && (
                  <div>
                    <p className="text-iron-text-secondary text-xs tracking-widest font-bold mb-2">Top Active Members</p>
                    <ResultTable data={procResult.report.data.top_members} maxHeight="200px" />
                  </div>
                )}

                {procResult.report.data.equipment_alerts && procResult.report.data.equipment_alerts.length > 0 && (
                  <div>
                    <p className="text-iron-text-secondary text-xs tracking-widest font-bold mb-2">Equipment Alerts</p>
                    <ResultTable data={procResult.report.data.equipment_alerts} maxHeight="200px" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION D: FUNCTIONS                                     */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Section icon={FunctionSquare} title="Functions" badge="3 Functions" badgeColor="amber-400" description="Reusable calculations — age, subscription status label, lifetime revenue">
        <div className="space-y-4">
          <SQLBlock sql={`-- Three functions applied to every member at once:\nSELECT\n  m.member_id,\n  m.name,\n  fn_member_age(m.member_id)                AS age,\n  fn_subscription_status_label(m.member_id) AS subscription_status,\n  fn_total_revenue_by_member(m.member_id)   AS lifetime_revenue\nFROM Member m\nORDER BY m.member_id;`} />

          <div className="flex items-center gap-4">
            <RunButton onClick={runFunctions} loading={fnLoading} label="Execute All Functions" icon={FunctionSquare} />
            <p className="text-iron-text-secondary text-xs italic">Runs fn_member_age, fn_subscription_status_label, fn_total_revenue_by_member for all members</p>
          </div>

          {fnData && <ResultTable data={fnData} />}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION E: TRIGGERS & AUDIT LOG                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Section icon={Zap} title="Triggers & Audit Log" badge="5 Triggers" badgeColor="red-400" description="Automatic actions: validation, stock deduction, and audit logging">
        <div className="space-y-6">

          {/* Trigger descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'trg_attendance_validate_member', event: 'BEFORE INSERT', table: 'Attendance', desc: 'Blocks check-in if member status is Inactive' },
              { name: 'trg_payment_audit_log', event: 'AFTER INSERT', table: 'Payment', desc: 'Logs every payment to Audit_Log with JSON snapshot' },
              { name: 'trg_supplement_stock_update', event: 'AFTER INSERT', table: 'Supplement_Sale', desc: 'Auto-decrements stock, blocks if insufficient' },
              { name: 'trg_subscription_auto_expire', event: 'BEFORE INSERT', table: 'Subscription', desc: 'Auto-expires overlapping active subscriptions' },
              { name: 'trg_member_status_audit', event: 'AFTER UPDATE', table: 'Member', desc: 'Logs member status changes (Active↔Inactive)' },
            ].map(t => (
              <div key={t.name} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap size={12} className="text-red-400" />
                  <span className="text-white text-xs font-bold font-space">{t.name}</span>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[11px] font-black tracking-widest">{t.event}</span>
                  <span className="px-2 py-0.5 bg-white/5 text-iron-text-secondary border border-white/10 rounded text-[11px] font-black tracking-widest">{t.table}</span>
                </div>
                <p className="text-iron-text-secondary text-xs italic">{t.desc}</p>
              </div>
            ))}
          </div>

          <hr className="border-border" />

          {/* Trigger Test */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-bold font-space flex items-center gap-2">
              <Shield size={14} className="text-iron-lime" /> Live Trigger Test
            </h4>
            <p className="text-iron-text-secondary text-xs italic">
              Inserts a test payment → the AFTER INSERT trigger fires → creates an Audit_Log entry → test payment is deleted.
            </p>
            <RunButton onClick={runTriggerTest} loading={triggerLoading} label="Fire Test Trigger" icon={Zap} />
            {triggerResult && (
              <div className={`p-4 rounded-xl text-xs border ${
                triggerResult.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                <p className="font-bold mb-2">{triggerResult.text}</p>
                {triggerResult.entry && (
                  <pre className="bg-black/30 rounded-lg p-3 text-[11px] text-iron-lime/80 font-mono overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(triggerResult.entry, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Audit Log Viewer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white text-sm font-bold font-space flex items-center gap-2">
                <ScrollText size={14} className="text-iron-text-secondary" /> Audit Log
              </h4>
              <RunButton onClick={fetchAudit} loading={auditLoading} label="Refresh Log" icon={RefreshCw} />
            </div>
            {auditData && <ResultTable data={auditData} maxHeight="350px" />}
          </div>
        </div>
      </Section>
    </div>
  );
}
