import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import {
  Users,
  TrendingUp,
  Calendar,
  IndianRupee,
  ArrowUpRight,
  MoreHorizontal,
  Plus
} from 'lucide-react';

const API = 'http://localhost:5000/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatRevenue(val) {
  if (!val) return '₹0';
  const n = parseFloat(val);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toFixed(0)}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getDuration(checkIn, checkOut) {
  if (!checkIn) return null;
  const end = checkOut ? new Date(checkOut) : new Date();
  const mins = Math.floor((end - new Date(checkIn)) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function Dashboard() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();

  const [data, setData]             = useState(null);
  const [attStats, setAttStats]     = useState(null);
  const [classStats, setClassStats] = useState(null);
  const [recentMembers, setRecentMembers] = useState([]);
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/reports`, { headers: getHeaders() }).then(r => setData(r.data)).catch(() => {}),
      axios.get(`${API}/attendance/stats`, { headers: getHeaders() }).then(r => setAttStats(r.data)).catch(() => {}),
      axios.get(`${API}/classes/stats`, { headers: getHeaders() }).then(r => setClassStats(r.data)).catch(() => {}),
      axios.get(`${API}/members`, { headers: getHeaders() }).then(r => {
        const members = Array.isArray(r.data) ? r.data : [];
        setRecentMembers(members.slice(0, 4));
      }).catch(() => {}),
      axios.get(`${API}/attendance/today`, { headers: getHeaders() }).then(r => {
        const log = Array.isArray(r.data) ? r.data : (r.data?.records || []);
        setAttendanceLog(log.slice(0, 4));
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full text-iron-text-secondary font-space uppercase tracking-widest animate-pulse">
      Loading IronCore Metrics...
    </div>
  );

  if (!data) return <div className="p-6 text-red-500">Error loading dashboard data.</div>;

  // ── Derived values ──
  const activeMembers   = data.membership?.active_members ?? 0;
  const totalMembers    = data.membership?.total_members ?? 0;
  const newThisMonth    = data.membership?.new_this_month ?? 0;
  const checkinsTodayVal = attStats?.checked_in_today ?? attStats?.total_checkins ?? 0;
  const classesToday    = classStats?.classes_today ?? 0;
  const fullyBooked     = classStats?.full_today ?? 0;

  // Current month revenue from monthlyRevenue array
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentMonthRev = data.monthlyRevenue?.find(r => r.payment_month === currentMonthStr);
  const monthlyRevenue  = parseFloat(currentMonthRev?.total_revenue || 0);

  // Last month for % change
  const lastMonthDate = new Date(); lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStr  = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthRev  = parseFloat(data.monthlyRevenue?.find(r => r.payment_month === lastMonthStr)?.total_revenue || 0);
  const revPctChange  = lastMonthRev > 0 ? (((monthlyRevenue - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : null;

  // Revenue chart — last 6 months of monthlyRevenue
  const revenueChartData = (data.monthlyRevenue || [])
    .slice(-6)
    .map(r => ({
      month: r.payment_month?.slice(5) || '',
      total: parseFloat(r.total_revenue) || 0
    }));

  // Membership split from plan durations
  const planCounts = {};
  recentMembers.forEach(m => {
    const plan = m.plan_name || 'No Plan';
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  });

  const PLAN_COLORS_DARK  = ['#1A3AFF', '#DFFF00', '#2A2A35', '#71717A', '#059669'];
  const PLAN_COLORS_LIGHT = ['#2563EB', '#3B82F6', '#93C5FD', '#BFDBFE', '#60A5FA'];
  const membershipData = Object.entries(planCounts).map(([name, value], i) => ({
    name,
    value,
    fill: isLight ? PLAN_COLORS_LIGHT[i % PLAN_COLORS_LIGHT.length] : PLAN_COLORS_DARK[i % PLAN_COLORS_DARK.length]
  }));

  const getInitials = (name) =>
    (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-8 pb-12">
      {/* Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Active Members */}
        <div className="stat-card group">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="stat-label">ACTIVE MEMBERS</h3>
              <p className="stat-value">{activeMembers}</p>
            </div>
            <div className="p-2 bg-iron-lime/10 rounded-lg group-hover:bg-iron-lime/20 transition-colors">
              <Users size={18} className="text-iron-lime" />
            </div>
          </div>
          <div className="stat-change text-emerald-400">
            <TrendingUp size={14} />
            <span>+{newThisMonth} this month</span>
          </div>
          <div className="mt-6 h-1 w-full bg-border/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-iron-lime rounded-full"
              style={{ 
                width: totalMembers > 0 ? `${Math.round((activeMembers / totalMembers) * 100)}%` : '0%',
                boxShadow: isLight ? '0 0 10px rgba(37,99,235,0.3)' : '0 0 10px rgba(223,255,0,0.5)'
              }}
            />
          </div>
        </div>

        {/* Today's Check-ins */}
        <div className="stat-card group">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="stat-label">TODAY'S CHECK-INS</h3>
              <p className="stat-value">{checkinsTodayVal}</p>
            </div>
            <div className="p-2 bg-iron-blue/10 rounded-lg group-hover:bg-iron-blue/20 transition-colors">
              <Calendar size={18} className="text-iron-blue" />
            </div>
          </div>
          <div className="stat-change text-iron-text-secondary">
            <span>of {activeMembers} active</span>
          </div>
          <div className="mt-6 flex gap-1">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i < Math.round((checkinsTodayVal / Math.max(activeMembers, 1)) * 6) ? 'bg-iron-lime' : 'bg-border/40'}`} 
                style={{ boxShadow: i < Math.round((checkinsTodayVal / Math.max(activeMembers, 1)) * 6) && !isLight ? '0 0 8px rgba(223,255,0,0.3)' : 'none' }}
              />
            ))}
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="stat-card group">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="stat-label">MONTHLY REVENUE</h3>
              <p className="stat-value">{formatRevenue(monthlyRevenue)}</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
              <IndianRupee size={18} className="text-emerald-400" />
            </div>
          </div>
          <div className={`stat-change ${revPctChange !== null && parseFloat(revPctChange) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <ArrowUpRight size={14} />
            <span>{revPctChange !== null ? `${revPctChange > 0 ? '+' : ''}${revPctChange}% vs last month` : 'No prior data'}</span>
          </div>
          <p className="mt-4 text-xs text-iron-text-secondary font-medium italic">
            {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Classes Today */}
        <div className="stat-card group">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="stat-label">CLASSES TODAY</h3>
              <p className="stat-value">{classesToday}</p>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
              <TrendingUp size={18} className="text-amber-400" />
            </div>
          </div>
          <div className="stat-change text-iron-blue">
            <span>{fullyBooked} fully booked</span>
          </div>
          <div className="mt-4 flex -space-x-2">
            <div className={`w-6 h-6 rounded-full bg-amber-400 border-2 border-surface flex items-center justify-center text-[10px] font-bold ${isLight ? 'text-white' : 'text-dark'}`}>H</div>
            <div className="w-6 h-6 rounded-full bg-iron-blue border-2 border-surface flex items-center justify-center text-[10px] font-bold text-white">C</div>
            <div className="w-6 h-6 rounded-full bg-border border-2 border-surface flex items-center justify-center text-[10px] font-bold text-iron-text-secondary">+{Math.max(0, classesToday - 2)}</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="card lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-sm font-bold tracking-widest uppercase">REVENUE LAST 6 MONTHS</h2>
            <button className="text-iron-text-secondary hover:text-white transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isLight ? '#2563EB' : '#DFFF00'} stopOpacity={isLight ? 0.2 : 0.1} />
                    <stop offset="95%" stopColor={isLight ? '#2563EB' : '#DFFF00'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isLight ? '#E4E4EB' : '#1F1F26'} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717A', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v) => [formatRevenue(v), 'Revenue']}
                  contentStyle={{ background: isLight ? '#FFFFFF' : '#111116', border: `1px solid ${isLight ? '#E4E4EB' : '#1F1F26'}`, borderRadius: '8px', color: isLight ? '#0A0A0E' : '#FFFFFF' }}
                  itemStyle={{ color: isLight ? '#2563EB' : '#DFFF00' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={isLight ? '#2563EB' : '#DFFF00'}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Membership Split */}
        <div className="card">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-sm font-bold tracking-widest uppercase">MEMBERSHIP SPLIT</h2>
          </div>
          <div className="relative h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={membershipData.length > 0 ? membershipData : [{ name: 'No Data', value: 1, fill: '#1F1F26' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {(membershipData.length > 0 ? membershipData : [{ fill: '#1F1F26' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold font-space">{totalMembers}</span>
              <span className="text-xs text-iron-text-secondary font-bold tracking-widest uppercase mt-1">TOTAL</span>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {membershipData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                <span className="text-xs text-iron-text-secondary font-bold uppercase truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 - Recent Members & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="card lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold tracking-widest uppercase">RECENT MEMBERS</h2>
            <button 
              className="text-xs text-iron-lime font-bold tracking-widest uppercase hover:underline"
              onClick={() => navigate('/members')}
            >
              VIEW ALL
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="iron-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>PLAN</th>
                  <th>JOIN DATE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentMembers.length > 0 ? recentMembers.map((member) => (
                  <tr key={member.member_id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-iron-lime/10 flex items-center justify-center font-bold text-xs border border-iron-lime/20 text-iron-lime">
                          {getInitials(member.member_name || member.name)}
                        </div>
                        <span className="font-semibold">{member.member_name || member.name}</span>
                      </div>
                    </td>
                    <td className="text-iron-text-secondary text-xs">{member.plan_name || '—'}</td>
                    <td className="text-iron-text-secondary text-xs">{formatDate(member.join_date)}</td>
                    <td>
                      <span className={`badge ${member.status === 'Active' ? 'badge-active' : 'badge-expired'}`}>
                        {member.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="text-center text-iron-text-secondary py-8">No members found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance Log */}
        <div className="card flex flex-col">
          <h2 className="text-sm font-bold tracking-widest uppercase mb-6">TODAY'S ATTENDANCE LOG</h2>
          <div className="space-y-5 flex-1">
            {attendanceLog.length > 0 ? attendanceLog.map((entry, i) => {
              const isActive = !entry.check_out_time;
              const name = entry.member_name || entry.name || `Member ${entry.member_id}`;
              return (
                <div key={entry.attendance_id || i} className="flex items-center gap-4 relative">
                  {i < attendanceLog.length - 1 && (
                    <div className="absolute left-5 top-10 bottom-[-20px] w-px bg-border/50" />
                  )}
                  <div className="w-10 h-10 rounded-full border-2 border-border/50 overflow-hidden relative z-10 shrink-0">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${isLight ? 'E4E4EB' : '1F1F26'}&color=${isLight ? '52525B' : 'FFFFFF'}`}
                      alt={name}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-bold truncate">{name}</h4>
                      <span className={`text-xs font-bold shrink-0 ${isActive ? 'text-iron-lime' : 'text-iron-text-secondary'}`}>
                        {formatTime(entry.check_in_time)}
                      </span>
                    </div>
                    <p className="text-xs text-iron-text-secondary font-medium">
                      {isActive ? `Active · ${getDuration(entry.check_in_time, null)}` : `Duration · ${getDuration(entry.check_in_time, entry.check_out_time)}`}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <p className="text-iron-text-secondary text-xs italic text-center py-4">No check-ins today</p>
            )}
          </div>
          <button 
            className="btn w-full mt-6 flex items-center justify-center gap-2"
            onClick={() => navigate('/members', { state: { openModal: true } })}
          >
            <Plus size={16} strokeWidth={3} />
            <span>NEW MEMBER</span>
          </button>
        </div>
      </div>
    </div>
  );
}
