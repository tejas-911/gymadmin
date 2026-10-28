import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart3, Users, DollarSign, Calendar, AlertTriangle, TrendingUp,
  Award, ShoppingBag, Dumbbell, Loader2, RefreshCw, ScrollText,
  Zap, Shield, Clock, Eye, Cog, CreditCard, CheckCircle2,
  XCircle, RotateCcw, TrendingDown, Activity
} from 'lucide-react';

const API = 'http://localhost:5000/api/reports';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const METHOD_COLORS = { Card: '#3B82F6', UPI: '#DFFF00', Cash: '#10B981', 'Bank Transfer': '#A855F7' };
const METHOD_COLORS_LIGHT = { Card: '#2563EB', UPI: '#D97706', Cash: '#059669', 'Bank Transfer': '#7C3AED' };
const PLAN_COLORS = ['#3B82F6', '#DFFF00', '#10B981', '#F59E0B', '#A855F7'];
const PLAN_COLORS_LIGHT = ['#2563EB', '#D97706', '#059669', '#B45309', '#7C3AED'];

function fmt(n) {
  const v = parseFloat(n) || 0;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${v.toFixed(0)}`;
}

function getHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Tooltips ────────────────────────────────────────────────────────────────
const RevenueTooltip = ({ active, payload, label, isLight }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-iron-text-secondary text-xs uppercase tracking-widest font-bold mb-1">{label}</p>
      <p className="font-space font-bold text-base" style={{ color: isLight ? '#2563EB' : '#DFFF00' }}>
        {fmt(payload[0].value)}
      </p>
      {payload[1] && (
        <p className="text-iron-text-secondary text-xs mt-0.5">{payload[1].value} transactions</p>
      )}
    </div>
  );
};

const PlanTooltip = ({ active, payload, label, isLight }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white text-xs font-bold mb-1">{label}</p>
      <p className="font-space font-bold text-base" style={{ color: isLight ? '#2563EB' : '#DFFF00' }}>
        {fmt(payload[0].value)}
      </p>
    </div>
  );
};

const MethodPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ── Stat Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color = 'lime', border }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const colors = {
    lime: 'text-iron-lime bg-iron-lime/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    red: 'text-red-400 bg-red-500/10',
    zinc: 'text-zinc-400 bg-white/5',
  };
  return (
    <div className={`stat-card ${border || ''}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-space font-bold uppercase tracking-[0.18em] text-iron-text-secondary">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-3xl font-space font-black leading-none" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{value ?? '—'}</p>
      {sub && <p className="text-iron-text-secondary text-xs mt-1.5 font-medium">{sub}</p>}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
function DbBadge({ label, icon: Icon, color }) {
  const styles = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  };
  return (
    <span className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[11px] font-black uppercase tracking-widest ${styles[color]}`}>
      <Icon size={10} /> {label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Reports() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, { headers: getHeaders(), params: { month, year } });
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  if (loading) return (
    <div className="flex items-center justify-center h-96 gap-3 text-iron-text-secondary">
      <Loader2 size={20} className="animate-spin text-iron-lime" />
      <span className="font-space uppercase tracking-widest text-xs">Generating Report...</span>
    </div>
  );
  if (!data) return <div className="text-iron-text-secondary text-center py-20">Error loading reports.</div>;

  // ── Derived values ──────────────────────────────────────────────────────
  const membership = data.membership || {};
  const attendance = data.attendance || {};
  const subStats = data.subscriptionStats || {};
  const revTotals = data.revenueTotals || {};
  const methodColors = isLight ? METHOD_COLORS_LIGHT : METHOD_COLORS;
  const planColors = isLight ? PLAN_COLORS_LIGHT : PLAN_COLORS;

  const chartRevenue = (data.monthlyRevenue || []).map(r => ({
    ...r,
    label: r.payment_month?.slice(5) ? `${MONTHS[parseInt(r.payment_month.slice(5)) - 1]} ${r.payment_month.slice(0, 4)}` : r.payment_month,
    total_revenue: parseFloat(r.total_revenue) || 0,
    transaction_count: parseInt(r.transaction_count) || 0,
  }));

  const bestMonth = [...chartRevenue].sort((a, b) => b.total_revenue - a.total_revenue)[0];
  const avgMonthly = chartRevenue.length
    ? chartRevenue.reduce((s, r) => s + r.total_revenue, 0) / chartRevenue.filter(r => r.total_revenue > 0).length
    : 0;

  const pieData = (data.revenueByMethod || []).map(r => ({
    name: r.payment_method,
    value: parseFloat(r.total) || 0,
    count: r.count,
  }));

  const hasAudit = data.auditLog?.length > 0;
  const hasEquipHealth = data.equipmentHealth?.length > 0;
  const lineColor = isLight ? '#2563EB' : '#DFFF00';

  return (
    <div className="space-y-6 pb-12 font-manrope">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-space font-bold tracking-tighter mb-1" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>Analytics & Reports</h1>
          <p className="text-iron-text-secondary font-medium italic text-sm">
            Powered by stored procedures, views, functions &amp; triggers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="bg-surface border border-border rounded-xl px-3 py-2.5 text-xs font-space outline-none focus:border-iron-lime/40 cursor-pointer" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="bg-surface border border-border rounded-xl px-3 py-2.5 text-xs font-space outline-none focus:border-iron-lime/40 w-20" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }} />
          <button onClick={fetchReports}
            className="flex items-center gap-2 px-4 py-2.5 bg-iron-lime text-dark rounded-xl font-space font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(223,255,0,0.3)] transition-all">
            <RefreshCw size={12} /> Generate
          </button>
        </div>
      </div>

      {/* ── DB FEATURE BADGES ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <DbBadge label="sp_gym_performance_report" icon={Cog} color="blue" />
        <DbBadge label="vw_monthly_revenue" icon={Eye} color="purple" />
        <DbBadge label="vw_equipment_health" icon={Eye} color="amber" />
        <DbBadge label="Audit Log Triggers" icon={Zap} color="red" />
        <DbBadge label="fn_subscription_status" icon={Activity} color="emerald" />
      </div>

      {/* ── YEAR REVENUE KPI STRIP ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={`${year} Total Revenue`}   value={fmt(revTotals.total_revenue)}   icon={DollarSign}  color="lime"    sub="Paid payments only" />
        <KpiCard label="Best Month"                value={bestMonth ? fmt(bestMonth.total_revenue) : '—'} icon={TrendingUp} color="emerald" sub={bestMonth?.label || '—'} />
        <KpiCard label="Monthly Average"           value={fmt(avgMonthly)}                icon={BarChart3}   color="blue"    sub="Non-zero months only" />
        <KpiCard 
          label="Total Transactions" 
          value={revTotals.total_transactions ?? '—'} 
          icon={CreditCard} 
          color="purple" 
          sub={`${((revTotals.total_transactions - (revTotals.pending_count || 0) - (revTotals.refunded_count || 0)) / (revTotals.total_transactions || 1) * 100).toFixed(0)}% success rate`} 
        />
      </div>

      {/* ── MEMBERSHIP + SUBSCRIPTION STATUS ──────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        {/* Membership stats from stored procedure */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Members" value={membership.total_members ?? '—'} icon={Users} color="lime" />
          <KpiCard label="Active Members" value={membership.active_members ?? '—'} icon={CheckCircle2} color="emerald" />
          <KpiCard label="Absent 7 Days" value={data.absentMembers ?? '—'} icon={Clock} color="amber" sub="Active, not visited" />
          <KpiCard label="New This Month" value={membership.new_this_month ?? '—'} icon={TrendingUp} color="blue" />
        </div>

        {/* Subscription Status Breakdown */}
        <div className="card flex flex-col justify-between gap-3">
          <p className="text-[11px] font-space font-bold uppercase tracking-[0.18em] text-iron-text-secondary">Subscription Status</p>
          <div className="space-y-2.5">
            {[
              { label: 'Active', val: subStats.active_subs, color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
              { label: 'Expired', val: subStats.expired_subs, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
              { label: 'Cancelled', val: subStats.cancelled_subs, color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle },
            ].map(({ label, val, color, bg, icon: Icon }) => {
              const pct = subStats.total_subs > 0 ? ((val || 0) / subStats.total_subs * 100).toFixed(0) : 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
                    <Icon size={12} className={color} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{label}</span>
                      <span className={`font-space font-black ${color.replace('400', '500')}`}>{val ?? 0}</span>
                    </div>
                    <div className="h-1 bg-border/40 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        label === 'Active' ? 'bg-emerald-500' : label === 'Expired' ? 'bg-amber-500' : 'bg-red-500'
                      }`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-iron-text-secondary text-[10px] font-space w-7 text-right">{pct}%</span>
                </div>
              );
            })}
            <p className="text-iron-text-secondary text-[10px] text-right font-space pt-1">
              Total: {subStats.total_subs ?? 0} subscriptions
            </p>
          </div>
        </div>
      </div>

      {/* ── REVENUE CHARTS ROW ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

        {/* Monthly Revenue Area Chart — vw_monthly_revenue VIEW */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-space font-bold text-sm uppercase tracking-widest" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>Monthly Revenue</h3>
              <p className="text-iron-text-secondary text-xs italic mt-0.5">Source: vw_monthly_revenue · 12-month rolling</p>
            </div>
            <span className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-[11px] font-black uppercase tracking-widest">View</span>
          </div>
          {chartRevenue.some(r => r.total_revenue > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartRevenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#E4E4EB' : '#1F1F26'} vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false}
                  tick={{ fill: '#71717A', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: '#71717A', fontSize: 10 }} tickFormatter={v => fmt(v)} width={54} />
                <Tooltip content={<RevenueTooltip isLight={isLight} />} />
                <Area type="monotone" dataKey="total_revenue" stroke={lineColor} strokeWidth={2}
                  fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: lineColor }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-iron-text-secondary text-sm italic text-center py-14">No revenue data for this period.</p>
          )}
        </div>

        {/* Payment Method Pie Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-space font-bold text-sm uppercase tracking-widest" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>By Method</h3>
              <p className="text-iron-text-secondary text-xs italic mt-0.5">{year} revenue split</p>
            </div>
            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[11px] font-black uppercase tracking-widest">Proc</span>
          </div>
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={72}
                    dataKey="value" labelLine={false} label={MethodPieLabel}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={methodColors[entry.name] || '#71717A'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [fmt(v), 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-1.5">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: methodColors[d.name] || '#71717A' }} />
                      <span className="text-white font-medium">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-iron-text-secondary font-space">
                      <span>{d.count}×</span>
                      <span className="font-bold" style={{ color: methodColors[d.name] }}>{fmt(d.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-iron-text-secondary text-sm italic text-center py-10">No payment data for {year}.</p>
          )}
        </div>
      </div>

      {/* ── REVENUE BY PLAN + MEMBER GROWTH ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Revenue by Membership Plan */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-space font-bold text-sm uppercase tracking-widest" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>Revenue by Plan</h3>
              <p className="text-iron-text-secondary text-xs italic mt-0.5">{year} · Paid transactions only</p>
            </div>
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-black uppercase tracking-widest">Query</span>
          </div>
          {data.revenueByPlan?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.revenueByPlan} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#E4E4EB' : '#1F1F26'} horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false}
                  tick={{ fill: '#71717A', fontSize: 10 }} tickFormatter={v => fmt(v)} />
                <YAxis type="category" dataKey="plan_name" axisLine={false} tickLine={false}
                  tick={{ fill: '#A1A1AA', fontSize: 10 }} width={100} />
                <Tooltip content={<PlanTooltip isLight={isLight} />} />
                <Bar dataKey="total_revenue" radius={[0, 6, 6, 0]}>
                  {(data.revenueByPlan || []).map((_, i) => (
                    <Cell key={i} fill={planColors[i % planColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-iron-text-secondary text-sm italic text-center py-10">No plan revenue data for {year}.</p>
          )}
        </div>

        {/* Member Growth Chart — direct query */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-space font-bold text-sm uppercase tracking-widest" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>Member Growth</h3>
              <p className="text-iron-text-secondary text-xs italic mt-0.5">New sign-ups over time</p>
            </div>
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-black uppercase tracking-widest">Query</span>
          </div>
          {data.memberGrowth?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.memberGrowth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#E4E4EB' : '#1F1F26'} vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                  tick={{ fill: '#71717A', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: '#71717A', fontSize: 10 }} allowDecimals={false} width={28} />
                <Tooltip formatter={(v) => [v, 'New Members']} contentStyle={{
                  background: isLight ? '#fff' : '#18181A',
                  border: `1px solid ${isLight ? '#E4E4EB' : '#2A2A35'}`,
                  borderRadius: 12, fontSize: 12
                }} />
                <Bar dataKey="count" fill={lineColor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-iron-text-secondary text-sm italic text-center py-10">No member growth data.</p>
          )}
        </div>
      </div>

      {/* ── ATTENDANCE SUMMARY + TOP PERFORMERS ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

        {/* Attendance stats from stored procedure */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white font-space font-bold text-sm uppercase tracking-widest">
                Attendance — {MONTHS[month - 1]} {year}
              </h3>
              <p className="text-iron-text-secondary text-xs italic mt-0.5">Source: sp_gym_performance_report</p>
            </div>
            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[11px] font-black uppercase tracking-widest">Procedure</span>
          </div>
          {attendance && (attendance.unique_visitors || attendance.total_check_ins) ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-border/20 rounded-xl border border-border/40">
                <p className="text-[11px] font-space font-bold uppercase tracking-widest text-iron-text-secondary mb-2">Unique Visitors</p>
                <p className="text-3xl font-space font-black" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{attendance.unique_visitors ?? '—'}</p>
              </div>
              <div className="p-4 bg-border/20 rounded-xl border border-border/40">
                <p className="text-[11px] font-space font-bold uppercase tracking-widest text-iron-text-secondary mb-2">Total Check-Ins</p>
                <p className="text-3xl font-space font-black" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{attendance.total_check_ins ?? '—'}</p>
              </div>
              <div className="p-4 bg-border/20 rounded-xl border border-border/40">
                <p className="text-[11px] font-space font-bold uppercase tracking-widest text-iron-text-secondary mb-2">Avg Session</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-space font-black" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{attendance.avg_session_minutes ?? '—'}</p>
                  <span className="text-iron-text-secondary text-sm font-bold">min</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-iron-text-secondary text-sm italic text-center py-8">
              No attendance data for {MONTHS[month - 1]} {year}.
            </p>
          )}
        </div>

        {/* Top Performers */}
        <div className="space-y-4">
          {/* Top Members */}
          {data.topMembers?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Award size={13} className="text-iron-lime" />
                <h4 className="font-space font-bold text-xs uppercase tracking-widest flex-1" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>
                  Top Members — {MONTHS[month-1]}
                </h4>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-black uppercase">Procedure</span>
              </div>
              <div className="space-y-2.5">
                {data.topMembers.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-iron-lime/10 flex items-center justify-center text-[10px] font-black text-iron-lime font-space shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium flex-1 truncate" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{m.name}</span>
                    <span className="text-iron-text-secondary text-xs font-space font-bold shrink-0">{m.visits}v</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Assets */}
          <div className="card space-y-3">
            <h4 className="text-white font-space font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={12} className="text-iron-lime" /> Top Assets
            </h4>
            {[
              { icon: Dumbbell, label: 'Workout', value: data.popularWorkout ? `${data.popularWorkout.plan_name} (${data.popularWorkout.count})` : null },
              { icon: Users, label: 'Trainer', value: data.topTrainer ? `${data.topTrainer.name} (${data.topTrainer.count})` : null },
              { icon: ShoppingBag, label: 'Supplement', value: data.topSupplement ? `${data.topSupplement.name} (${data.topSupplement.sold} sold)` : null },
            ].map(({ icon: Icon, label, value }) => value ? (
              <div key={label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <Icon size={11} className="text-iron-text-secondary" />
                  <span className="text-[11px] text-iron-text-secondary uppercase tracking-widest font-bold">{label}</span>
                </div>
                <span className="text-xs font-bold text-right truncate" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{value}</span>
              </div>
            ) : null)}
          </div>
        </div>
      </div>

      {/* ── EQUIPMENT HEALTH VIEW ──────────────────────────────────────── */}
      {hasEquipHealth && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={14} className="text-amber-500" />
              <div>
                <h3 className="font-space font-bold text-sm uppercase tracking-widest" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>Equipment Health</h3>
                <p className="text-iron-text-secondary text-xs italic">Source: vw_equipment_health</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[11px] font-black uppercase tracking-widest">View</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  {['Equipment', 'Condition', 'Location', 'Last Service', 'Days Since', 'Flag'].map(h => (
                    <th key={h} className="px-6 py-3 text-xs font-space font-bold uppercase tracking-widest text-iron-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.equipmentHealth.map(eq => (
                  <tr key={eq.equipment_id} className="hover:bg-iron-lime/5 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{eq.equipment_name}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-bold ${eq.condition_status === 'New' || eq.condition_status === 'Good' ? 'text-emerald-400' :
                          eq.condition_status === 'Needs Repair' ? 'text-amber-400' : 'text-red-400'}`}>
                        {eq.condition_status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-iron-text-secondary text-xs">{eq.location || '—'}</td>
                    <td className="px-6 py-3 text-iron-text-secondary text-xs">
                      {eq.last_service_date
                        ? new Date(eq.last_service_date).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-6 py-3 text-xs font-space font-bold" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{eq.days_since_service ?? '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-widest ${eq.maintenance_flag === 'Overdue' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          eq.maintenance_flag === 'Due Soon' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {eq.maintenance_flag || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EQUIPMENT ALERTS (from stored procedure) ──────────────────── */}
      {data.equipmentAlerts?.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={13} className="text-red-500" />
            <h3 className="font-space font-bold text-xs uppercase tracking-widest flex-1" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>Equipment Alerts</h3>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-[10px] font-black uppercase">Procedure</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.equipmentAlerts.map((eq, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                <span className="text-sm font-medium" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{eq.equipment_name}</span>
                <span className="text-red-500 text-xs font-black uppercase tracking-widest">{eq.condition_status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AUDIT LOG (populated by TRIGGERS) ─────────────────────────── */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScrollText size={14} className="text-red-500" />
              <div>
                <h3 className="font-space font-bold text-sm uppercase tracking-widest" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>Audit Log</h3>
                <p className="text-iron-text-secondary text-xs italic">Auto-populated by AFTER INSERT / AFTER UPDATE triggers</p>
              </div>
            </div>
          <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[11px] font-black uppercase tracking-widest">Triggers</span>
        </div>

        {hasAudit ? (
          <div className="overflow-x-auto" style={{ maxHeight: 340 }}>
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border">
                  {['ID', 'Table', 'Action', 'Record ID', 'Values', 'Timestamp'].map(h => (
                    <th key={h} className="px-6 py-3 text-xs font-space font-bold uppercase tracking-widest text-iron-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.auditLog.map(log => (
                  <tr key={log.log_id} className={`transition-colors ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/[0.02]'}`}>
                    <td className="px-6 py-3 text-iron-text-secondary text-xs font-space">#{log.log_id}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 bg-border/20 border border-border/40 rounded text-[11px] font-black uppercase tracking-widest" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>
                        {log.table_name}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-black uppercase tracking-widest ${log.action_type === 'INSERT' ? 'text-emerald-400' :
                          log.action_type === 'UPDATE' ? 'text-amber-400' : 'text-red-400'}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-space font-bold" style={{ color: isLight ? '#0A0A0E' : '#FFFFFF' }}>{log.record_id}</td>
                    <td className="px-6 py-3">
                      <pre className="text-xs font-mono max-w-[280px] truncate" style={{ color: isLight ? '#2563EB' : 'rgba(223, 255, 0, 0.7)' }}>
                        {typeof log.new_values === 'string' ? log.new_values : JSON.stringify(log.new_values)}
                      </pre>
                    </td>
                    <td className="px-6 py-3 text-iron-text-secondary text-xs whitespace-nowrap">
                      {log.changed_at
                        ? new Date(log.changed_at).toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-iron-text-secondary text-sm italic">
            No audit entries yet. Triggers will auto-populate this when payments are made or member statuses change.
          </div>
        )}
      </div>

    </div>
  );
}
