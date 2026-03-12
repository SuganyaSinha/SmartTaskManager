import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { getProductivityStats } from '../services/analyticsService';
import { ProductivityStats } from '../types/analytics';

type Period = 'day' | 'week' | 'month';

// ─── helpers ────────────────────────────────────────────────────────────────

function startOf(period: Period, date: Date): Date {
  const d = new Date(date);
  if (period === 'day') { d.setHours(0, 0, 0, 0); return d; }
  if (period === 'week') {
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addPeriod(period: Period, date: Date, delta: number): Date {
  const d = new Date(date);
  if (period === 'day') d.setDate(d.getDate() + delta);
  else if (period === 'week') d.setDate(d.getDate() + delta * 7);
  else d.setMonth(d.getMonth() + delta);
  return d;
}

function periodLabel(period: Period, date: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (period === 'day') return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  if (period === 'week') {
    const sun = startOf('week', date);
    const sat = new Date(sun); sat.setDate(sat.getDate() + 6);
    return `${fmt(sun)} – ${fmt(sat)}`;
  }
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function isFuturePeriod(period: Period, date: Date): boolean {
  return startOf(period, addPeriod(period, date, 1)) > startOf(period, new Date());
}

// ─── ring progress ───────────────────────────────────────────────────────────

function RingProgress({ value, color, size = 52 }: { value: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.7s ease' }}
      />
    </svg>
  );
}

// ─── custom tooltip ──────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <p style={{ color: '#64748b', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill, margin: 0 }}>
          {p.name}: <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── skeleton ────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className ?? ''}`} />
);

// ─── main page ───────────────────────────────────────────────────────────────

export default function ProductivityPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [stats, setStats] = useState<ProductivityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryToggle, setCategoryToggle] = useState<'allocated' | 'completed'>('allocated');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProductivityStats(period, anchor);
      setStats(data);
    } catch {
      setError('Could not load productivity data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [period, anchor]);

  useEffect(() => { load(); }, [load]);

  const navigate = (delta: number) => {
    if (delta > 0 && isFuturePeriod(period, anchor)) return;
    setAnchor(prev => addPeriod(period, prev, delta));
  };

  const canGoForward = !isFuturePeriod(period, anchor);

  const priorityData = stats ? [
    { name: 'High', Total: stats.priorityBreakdown.high.total, Completed: stats.priorityBreakdown.high.completed },
    { name: 'Med', Total: stats.priorityBreakdown.medium.total, Completed: stats.priorityBreakdown.medium.completed },
    { name: 'Low', Total: stats.priorityBreakdown.low.total, Completed: stats.priorityBreakdown.low.completed },
  ] : [];

  const PERIODS: Period[] = ['day', 'week', 'month'];

  return (
    <div className="bg-gray-50 px-4 py-4 sm:px-6">
      <div>

        {/* ── Period tabs + date navigator in one row ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setAnchor(new Date()); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                  period === p
                    ? 'bg-white text-blue-600 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-700 px-1 min-w-[130px] text-center">{periodLabel(period, anchor)}</span>
            <button
              onClick={() => navigate(1)}
              disabled={!canGoForward}
              className={`p-1.5 rounded-lg transition-colors ${
                canGoForward
                  ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && stats && (
          <>
            {stats.totalTasks === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3 className="text-gray-700 font-semibold mb-1">No tasks this {period}</h3>
                <p className="text-gray-400 text-sm max-w-xs">No tasks were scheduled. Try a different period or create some tasks.</p>
              </div>
            ) : (
              <>
                {/* ── Stat cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">

                  {/* Completed + Completion Rate combined */}
                  <div className="bg-sky-100 border border-sky-300 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Completed</p>
                      <p className="text-3xl font-bold text-gray-900 leading-none">{stats.completedTasks}</p>
                      <p className="text-xs text-gray-400 mt-1">of {stats.totalTasks} tasks</p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 ml-2">
                      <div className="relative flex items-center justify-center">
                        <RingProgress value={stats.completionRate} color="#3b82f6" size={52} />
                        <span className="absolute text-[10px] font-bold text-gray-600">{stats.completionRate}%</span>
                      </div>
                      <span className="text-[10px] text-gray-400">completion</span>
                    </div>
                  </div>

                  {/* On-Time Rate */}
                  <div className="bg-teal-100 border border-teal-300 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">On Time</p>
                      <p className="text-3xl font-bold text-gray-900 leading-none">{stats.onTimeRate}%</p>
                      <p className="text-xs text-gray-400 mt-1">of completed</p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 ml-2">
                      <div className="relative flex items-center justify-center">
                        <RingProgress value={stats.onTimeRate} color="#10b981" size={52} />
                        <span className="absolute text-[10px] font-bold text-gray-600">{stats.onTimeRate}%</span>
                      </div>
                      <span className="text-[10px] text-gray-400">on-time</span>
                    </div>
                  </div>

                  {/* Daily Streak */}
                  <div className={`rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 border ${stats.currentStreak > 0 ? 'bg-amber-100 border-amber-300' : 'bg-gray-200 border-gray-300'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${stats.currentStreak > 0 ? 'bg-orange-50' : 'bg-gray-100'}`}>
                      {stats.currentStreak > 0 ? '🔥' : '💤'}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">Daily Streak</p>
                      <p className="text-3xl font-bold text-gray-900 leading-none">{stats.currentStreak}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {stats.currentStreak === 1 ? 'day in a row' : stats.currentStreak > 1 ? 'days in a row' : 'start your streak!'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Row 1: Time by Category + Priority Breakdown ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Time by Category */}
                  <div className="bg-green-100 border border-green-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-700">Time by Category</h2>
                        <p className="text-xs text-gray-400">Hours per category</p>
                      </div>
                      <div className="flex gap-1 bg-white rounded-lg p-0.5 border border-green-200">
                        {(['allocated', 'completed'] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setCategoryToggle(opt)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                              categoryToggle === opt
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {opt === 'allocated' ? 'Allocated' : 'Completed'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {stats.timeByCategory.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No categorised tasks this period</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={Math.max(80, stats.timeByCategory.length * 48)}>
                        <BarChart
                          data={stats.timeByCategory.map(c => ({
                            name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
                            Hours: categoryToggle === 'allocated' ? c.allocatedHours : c.completedHours,
                            category: c.category,
                          }))}
                          layout="vertical"
                          barSize={20}
                          margin={{ top: 2, right: 20, left: 10, bottom: 2 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" horizontal={false} />
                          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
                          <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={65} />
                          <Tooltip
                            formatter={(val: number) => [`${val} hrs`, categoryToggle === 'allocated' ? 'Allocated' : 'Completed']}
                            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                          />
                          <Bar dataKey="Hours" radius={[0, 4, 4, 0]}>
                            {stats.timeByCategory.map((entry) => {
                              const colors: Record<string, string> = { work: '#f59e0b', personal: '#6366f1', other: '#94a3b8' };
                              return <Cell key={entry.category} fill={colors[entry.category] ?? '#6366f1'} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Priority Breakdown */}
                  <div className="bg-rose-100 border border-rose-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-700">Priority Breakdown</h2>
                        <p className="text-xs text-gray-400">Completed vs total</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> Total
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="w-2 h-2 rounded-sm bg-emerald-600 inline-block" /> Done
                        </span>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={110}>
                      <BarChart data={priorityData} barCategoryGap="30%" barGap={3} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Completed" fill="#059669" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                      {[
                        { label: 'High', data: stats.priorityBreakdown.high, dot: 'bg-red-500' },
                        { label: 'Medium', data: stats.priorityBreakdown.medium, dot: 'bg-amber-500' },
                        { label: 'Low', data: stats.priorityBreakdown.low, dot: 'bg-green-500' },
                      ].map(({ label, data, dot }) => {
                        const pct = data.total > 0 ? (data.completed / data.total) * 100 : 0;
                        return (
                          <div key={label} className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
                            <span className="text-xs text-gray-600 w-10">{label}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-10 text-right">{data.completed}/{data.total}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
