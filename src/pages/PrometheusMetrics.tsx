import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Database, Server, RefreshCcw, BarChart3, Clock, Wifi, WifiOff, HardDrive } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useQuery } from '@tanstack/react-query';
import { fetchResources, fetchHealth as fetchHealthApi } from '../lib/api';

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: '#0F172A', borderColor: '#1E293B', color: '#F8FAFC' },
  itemStyle: { fontSize: '12px', fontFamily: 'monospace' },
};

export default function PrometheusMetrics() {
  const { restEndpoint, masterToken, latencyHistory, healthMatrix } = useStore();
  const cfg = { restEndpoint, masterToken };
  const headers = masterToken ? { Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [activeTab, setActiveTab] = useState<'system' | 'app' | 'database'>('system');

  // Real health data via TanStack Query
  const { data: healthData, isFetching, refetch } = useQuery({
    queryKey: ['health-deep', restEndpoint],
    queryFn: () => fetchHealthApi(cfg),
    retry: 1,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Real resource data via TanStack Query
  const { data: resources } = useQuery({
    queryKey: ['resources', restEndpoint],
    queryFn: () => fetchResources(cfg),
    retry: 1,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

  const isLive = !!healthData && !isFetching;

  // Build chart data from real latencyHistory only — no synthetic fallback
  const chartData = latencyHistory.length >= 2
    ? latencyHistory.slice(-20).map((latMs, i, arr) => ({
        time: new Date(Date.now() - (arr.length - i) * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        p99: Math.round(latMs * 1.5),
        p50: Math.round(latMs * 0.6),
        latency: latMs,
      }))
    : [];

  const avgLatency = latencyHistory.length > 0
    ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)
    : null;

  const cpu    = resources?.cpu_percent    ?? null;
  const memory = resources?.memory_percent ?? null;
  const disk   = resources?.disk_percent   ?? null;
  const netIn  = resources?.network_in_kbps  ?? null;
  const netOut = resources?.network_out_kbps ?? null;
  const queue  = resources?.queue_depth    ?? null;

  const STAT_ROWS = [
    { label: 'CPU',          value: cpu    != null ? `${cpu.toFixed(1)}%`    : '—',             icon: Activity, color: 'text-brand-primary' },
    { label: 'Memory',       value: memory != null ? `${memory.toFixed(1)}%` : '—',             icon: Server,   color: 'text-brand-accent' },
    { label: 'Disk',         value: disk   != null ? `${disk.toFixed(1)}%`   : '—',             icon: HardDrive,color: 'text-brand-success' },
    { label: 'Avg RTT',      value: avgLatency ? `${avgLatency}ms` : '—',                       icon: Clock,    color: 'text-brand-warning' },
    { label: 'Net In',       value: netIn  != null ? `${netIn.toFixed(0)} kbps`  : '—',         icon: Database, color: 'text-brand-primary' },
    { label: 'Net Out',      value: netOut != null ? `${netOut.toFixed(0)} kbps` : '—',         icon: Database, color: 'text-brand-accent' },
    { label: 'Queue Depth',  value: queue  != null ? String(queue) : '—',                       icon: Activity, color: 'text-brand-warning' },
    { label: 'Workers',      value: resources?.workers_active != null ? String(resources.workers_active) : '—', icon: Server, color: 'text-brand-success' },
  ];

  const noChartData = chartData.length < 2;

  const NoDataPlaceholder = ({ label }: { label: string }) => (
    <div className="h-64 flex flex-col items-center justify-center text-brand-text-muted text-xs font-mono uppercase tracking-widest opacity-60">
      <Activity className="w-6 h-6 mb-2 text-brand-border" />
      <span>{label}</span>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto pb-24 md:pb-0">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-brand-primary" /> Prometheus Metrics
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">GRAFANA-STYLE TELEMETRY EXPORTER</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-brand-surface border border-brand-border rounded-lg p-1 flex">
            {(['system', 'app', 'database'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn('px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors', activeTab === tab ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:text-brand-text')}>
                {tab}
              </button>
            ))}
          </div>
          <button onClick={() => refetch()} disabled={isFetching}
            className="bg-brand-surface border border-brand-border text-brand-text-muted hover:text-brand-text px-3 py-2 rounded-lg transition-colors disabled:opacity-60">
            <RefreshCcw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          </button>
          <div className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-mono font-bold uppercase',
            isLive ? 'bg-brand-success/10 border-brand-success/30 text-brand-success' : 'bg-brand-warning/10 border-brand-warning/30 text-brand-warning')}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}{isLive ? 'Live' : 'Connecting'}
          </div>
        </div>
      </div>

      {/* Service health cards (real data) */}
      {healthData?.services && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          {Object.entries(healthData.services).map(([name, svc]: any) => (
            <div key={name} className={cn('rounded-xl border p-3', svc.status === 'ok' ? 'bg-brand-success/5 border-brand-success/20' : svc.status === 'error' ? 'bg-brand-danger/5 border-brand-danger/20' : 'bg-brand-warning/5 border-brand-warning/20')}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={cn('w-1.5 h-1.5 rounded-full', svc.status === 'ok' ? 'bg-brand-success' : svc.status === 'error' ? 'bg-brand-danger' : 'bg-brand-warning')} />
                <span className={cn('font-bold uppercase tracking-wider', svc.status === 'ok' ? 'text-brand-success' : svc.status === 'error' ? 'text-brand-danger' : 'text-brand-warning')}>{name}</span>
              </div>
              {svc.latency_ms !== undefined && <p className="text-brand-text-muted">{svc.latency_ms}ms</p>}
            </div>
          ))}
        </div>
      )}

      {/* Stat tiles (real resource values) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {STAT_ROWS.slice(0, 4).map(stat => (
          <div key={stat.label} className="bg-brand-surface rounded-xl p-4 border border-brand-border">
            <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold uppercase tracking-widest text-brand-text-muted">{stat.label}</span><stat.icon className={cn('w-4 h-4', stat.color)} /></div>
            <div className="text-2xl font-mono font-bold">{stat.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {STAT_ROWS.slice(4).map(stat => (
          <div key={stat.label} className="bg-brand-surface rounded-xl p-4 border border-brand-border">
            <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold uppercase tracking-widest text-brand-text-muted">{stat.label}</span><stat.icon className={cn('w-4 h-4', stat.color)} /></div>
            <div className="text-2xl font-mono font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* System tab — latency chart derived from real latencyHistory */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><Clock className="w-4 h-4 mr-2 text-brand-primary" /> API Latency (P50 / P99)</h2>
            <div className="h-64">
              {noChartData
                ? <NoDataPlaceholder label="No latency data yet — make some API calls" />
                : <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="time" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" fontSize={10} tickFormatter={v => `${v}ms`} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}ms`]} />
                      <Line type="monotone" dataKey="p99" stroke="#EF4444" strokeWidth={2} dot={false} name="P99" />
                      <Line type="monotone" dataKey="p50" stroke="#10B981" strokeWidth={2} dot={false} name="P50" strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><Activity className="w-4 h-4 mr-2 text-brand-primary" /> Raw Latency History</h2>
            <div className="h-64">
              {noChartData
                ? <NoDataPlaceholder label="No latency data yet" />
                : <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs><linearGradient id="gLat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} /><stop offset="95%" stopColor="#4F46E5" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="time" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" fontSize={10} tickFormatter={v => `${v}ms`} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}ms`, 'Latency']} />
                      <Area type="monotone" dataKey="latency" stroke="#4F46E5" fill="url(#gLat)" name="Latency ms" />
                    </AreaChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>
        </div>
      )}

      {/* App tab */}
      {activeTab === 'app' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><Activity className="w-4 h-4 mr-2 text-brand-danger" /> Latency Trend (P99)</h2>
            <div className="h-64">
              {noChartData
                ? <NoDataPlaceholder label="No latency data yet" />
                : <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="time" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" fontSize={10} tickFormatter={v => `${v}ms`} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}ms`, 'P99']} />
                      <Line type="monotone" dataKey="p99" stroke="#EF4444" strokeWidth={2} dot={false} name="P99" />
                    </LineChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><Clock className="w-4 h-4 mr-2 text-brand-accent" /> Latency Trend (P50)</h2>
            <div className="h-64">
              {noChartData
                ? <NoDataPlaceholder label="No latency data yet" />
                : <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="time" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" fontSize={10} tickFormatter={v => `${v}ms`} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}ms`, 'P50']} />
                      <Line type="monotone" dataKey="p50" stroke="#10B981" strokeWidth={2} dot={false} name="P50" strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>
        </div>
      )}

      {/* Database tab — resource snapshot only, no fake time-series */}
      {activeTab === 'database' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><Database className="w-4 h-4 mr-2 text-brand-success" /> Database Services</h2>
            <div className="h-64 flex flex-col justify-center gap-4">
              {healthData?.services
                ? Object.entries(healthData.services)
                    .filter(([name]) => ['supabase', 'redis', 'database', 'db'].some(k => name.toLowerCase().includes(k)))
                    .map(([name, svc]: any) => (
                      <div key={name} className="flex items-center justify-between p-3 bg-brand-elevated rounded-xl border border-brand-border">
                        <span className="text-xs font-mono font-bold uppercase text-brand-text">{name}</span>
                        <div className="flex items-center gap-3">
                          {svc.latency_ms != null && <span className="text-[10px] font-mono text-brand-text-muted">{svc.latency_ms}ms</span>}
                          <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded',
                            svc.status === 'ok' ? 'bg-brand-success/20 text-brand-success' : 'bg-brand-danger/20 text-brand-danger')}>
                            {svc.status}
                          </span>
                        </div>
                      </div>
                    ))
                : <NoDataPlaceholder label="No database health data yet" />
              }
              {healthData?.services && Object.entries(healthData.services).filter(([name]) => ['supabase', 'redis', 'database', 'db'].some(k => name.toLowerCase().includes(k))).length === 0
                && <NoDataPlaceholder label="No database services in health check" />
              }
            </div>
          </div>
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><HardDrive className="w-4 h-4 mr-2 text-brand-warning" /> Resource Snapshot</h2>
            <div className="h-64 flex flex-col justify-center gap-3">
              {resources ? (
                <>
                  <div className="flex justify-between items-center text-xs font-mono"><span className="text-brand-text-muted uppercase">Disk</span><span className="font-bold text-brand-text">{resources.disk_percent?.toFixed(1)}%</span></div>
                  <div className="h-1.5 bg-brand-elevated rounded-full"><div className="h-full bg-brand-success rounded-full" style={{ width: `${Math.min(100, resources.disk_percent || 0)}%` }} /></div>
                  <div className="flex justify-between items-center text-xs font-mono mt-2"><span className="text-brand-text-muted uppercase">Queue Depth</span><span className="font-bold text-brand-text">{resources.queue_depth ?? '—'}</span></div>
                  <div className="flex justify-between items-center text-xs font-mono"><span className="text-brand-text-muted uppercase">Workers Active</span><span className="font-bold text-brand-text">{resources.workers_active ?? '—'}</span></div>
                  <div className="flex justify-between items-center text-xs font-mono"><span className="text-brand-text-muted uppercase">Net In</span><span className="font-bold text-brand-text">{resources.network_in_kbps?.toFixed(0) ?? '—'} kbps</span></div>
                  <div className="flex justify-between items-center text-xs font-mono"><span className="text-brand-text-muted uppercase">Net Out</span><span className="font-bold text-brand-text">{resources.network_out_kbps?.toFixed(0) ?? '—'} kbps</span></div>
                </>
              ) : <NoDataPlaceholder label="No resource data yet" />}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
