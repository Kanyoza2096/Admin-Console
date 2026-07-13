import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import { BarChart3, TrendingUp, Users, MessageSquare, Activity, Bot, ThumbsUp, RefreshCw, AlertTriangle, Zap, Coins } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-surface border border-brand-border p-3 rounded-xl shadow-xl font-mono text-xs">
      <p className="text-brand-text-muted mb-1.5 font-bold">{label}</p>
      {payload.map((item: any) => (
        <div key={item.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
          <span className="text-brand-text-muted">{item.name}:</span>
          <span className="text-brand-text font-bold ml-auto">{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, loading }: any) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color.replace('text-', 'bg-') + '/20')}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
      </div>
      <div className="text-2xl font-bold text-brand-text mb-1">
        {loading ? <div className="h-7 w-20 bg-brand-elevated animate-pulse rounded" /> : value}
      </div>
      <div className="text-xs font-mono text-brand-text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function Analytics() {
  const { restEndpoint, masterToken, stats } = useStore();
  const headers = masterToken ? { Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [analytics, setAnalytics] = useState<any>({});
  const [perfPosts, setPerfPosts] = useState<any[]>([]);
  const [perfMessages, setPerfMessages] = useState<any[]>([]);
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [tokenData, setTokenData] = useState<any>({});
  const [heatmap, setHeatmap] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    setError(false);
    try {
      const [aRes, pRes, tRes, hRes, mRes] = await Promise.allSettled([
        fetch(`${base}/analytics`, { headers }),
        fetch(`${base}/analytics/posts-performance`, { headers }),
        fetch(`${base}/analytics/token-usage`, { headers }),
        fetch(`${base}/analytics/engagement-heatmap`, { headers }),
        fetch(`${base}/metrics`, { headers }),
      ]);
      if (aRes.status === 'fulfilled' && aRes.value.ok) setAnalytics(await aRes.value.json());
      if (pRes.status === 'fulfilled' && pRes.value.ok) {
        const d = await pRes.value.json();
        setPerfPosts(d.posts || []);
        setTopPosts(d.posts || []);
      }
      if (tRes.status === 'fulfilled' && tRes.value.ok) setTokenData(await tRes.value.json());
      if (hRes.status === 'fulfilled' && hRes.value.ok) setHeatmap(await hRes.value.json());
      if (mRes.status === 'fulfilled' && mRes.value.ok) {
        const d = await mRes.value.json();
        const m = d.metrics || {};
        setMetrics(Object.entries(m).filter((e): e is [string, number] => typeof e[1] === 'number').map(([name, value]) => ({ name, value, unit: '' })));
      }
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [restEndpoint]);

  const s = analytics;
  const heatGrid: number[][] = heatmap?.heatmap ? DAYS.map((_, i) => heatmap.heatmap[i]?.hours ?? Array(24).fill(0)) : DAYS.map(() => Array(24).fill(0));
  const heatMax = Math.max(1, ...heatGrid.flat());

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-24 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-brand-primary" /> Analytics
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">PERFORMANCE INTELLIGENCE</p>
        </div>
        <button onClick={fetchAll} className="p-2.5 bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-text">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-brand-warning/10 border border-brand-warning/30 rounded-xl text-brand-warning text-sm font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> Some endpoints returned errors — showing available data only.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Posts" value={(s?.total_posts ?? stats?.postsPublished ?? 0).toLocaleString()} icon={MessageSquare} color="text-brand-primary" loading={loading} />
        <StatCard label="Messages" value={(s?.total_messages ?? stats?.messagesToday ?? 0).toLocaleString()} icon={Bot} color="text-brand-accent" loading={loading} />
        <StatCard label="Active Users" value={(s?.active_users ?? stats?.activeUsers ?? 0).toLocaleString()} icon={Users} color="text-brand-success" loading={loading} />
        <StatCard label="API Calls" value={(s?.api_calls ?? stats?.apiCalls ?? 0).toLocaleString()} icon={Activity} color="text-brand-warning" loading={loading} />
        <StatCard label="Tokens Used" value={(s?.token_usage ?? 0).toLocaleString()} icon={Coins} color="text-brand-danger" loading={loading} />
        <StatCard label="Engagement" value={`${(s?.engagement_rate ?? 0).toFixed(1)}%`} icon={ThumbsUp} color="text-brand-primary" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text-muted mb-5 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-primary" /> Post Volume</h2>
          {loading ? <div className="h-48 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-brand-text-muted" /></div> :
           perfPosts.length === 0 ? <div className="h-48 flex items-center justify-center text-brand-text-muted font-mono text-xs uppercase">No data</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={perfPosts}>
                <defs><linearGradient id="grad-posts" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} /><stop offset="95%" stopColor="#4F46E5" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" /><XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} /><YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip content={<CustomTooltip />} /><Area type="monotone" dataKey="count" name="Posts" stroke="#4F46E5" fill="url(#grad-posts)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text-muted mb-5 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-brand-accent" /> Top Posts</h2>
          {loading ? <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-brand-elevated animate-pulse rounded-xl" />)}</div> :
           topPosts.length === 0 ? <div className="h-40 flex items-center justify-center text-brand-text-muted font-mono text-xs uppercase">No data</div> : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {topPosts.slice(0, 8).map((p: any, i: number) => (
                <div key={p.id ?? i} className="flex items-center gap-3 p-3 bg-brand-elevated rounded-xl border border-brand-border">
                  <span className="text-[10px] font-mono text-brand-text-muted w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0"><div className="text-xs font-bold text-brand-text truncate">{p.title ?? `Post ${p.id}`}</div></div>
                  <div className="flex items-center gap-3 text-[10px] font-mono shrink-0">
                    {p.reach !== undefined && <span className="text-brand-primary">{p.reach.toLocaleString()} reach</span>}
                    {p.likes !== undefined && <span className="text-brand-success">{p.likes} ♥</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text-muted mb-5 flex items-center gap-2"><Activity className="w-4 h-4 text-brand-success" /> Engagement Heatmap</h2>
        {loading ? <div className="h-32 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-brand-text-muted" /></div> : (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex items-center gap-1 mb-1 ml-8">{HOURS.map(h => <div key={h} className="w-6 text-[8px] font-mono text-brand-text-muted text-center">{h}</div>)}</div>
              {DAYS.map((day, di) => (
                <div key={day} className="flex items-center gap-1 mb-1">
                  <div className="w-7 text-[9px] font-mono text-brand-text-muted shrink-0">{day}</div>
                  {HOURS.map(hi => {
                    const val = heatGrid[di]?.[hi] ?? 0;
                    return <div key={hi} title={`${day} ${hi}:00 — ${val}`} className="w-6 h-6 rounded-sm" style={{ backgroundColor: `rgba(99, 102, 241, ${0.08 + (val / heatMax) * 0.92})` }} />;
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {metrics.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text-muted mb-5">System Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((m, i) => (
              <div key={i} className="bg-brand-elevated rounded-xl p-3 border border-brand-border">
                <div className="text-xs font-bold text-brand-text">{m.value.toFixed(1)}</div>
                <div className="text-[9px] font-mono text-brand-text-muted truncate mt-0.5">{m.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
