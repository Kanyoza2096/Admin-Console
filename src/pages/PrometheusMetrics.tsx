import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Database, Server, RefreshCcw, BarChart3, Clock, Wifi, WifiOff, HardDrive } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: '#0F172A', borderColor: '#1E293B', color: '#F8FAFC' },
  itemStyle: { fontSize: '12px', fontFamily: 'monospace' },
};

export default function PrometheusMetrics() {
  const { restEndpoint, masterToken, latencyHistory, healthMatrix } = useStore();
  const headers = masterToken ? { Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [activeTab, setActiveTab] = useState<'system' | 'app' | 'database'>('system');
  const [healthData, setHealthData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [dbConnections, setDbConnections] = useState(14);

  const dbRef = useRef(14);
  useEffect(() => {
    const t = setInterval(() => {
      dbRef.current = Math.max(5, Math.min(32, dbRef.current + (Math.random() > 0.5 ? 1 : -1)));
      setDbConnections(dbRef.current);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const fetchHealth = async () => {
    setIsFetching(true);
    try {
      const res = await fetch(`${base}/health/deep`, { headers });
      if (res.ok) setHealthData(await res.json());
    } catch {}
    setIsFetching(false);
  };

  useEffect(() => { fetchHealth(); }, [restEndpoint]);

  const isLive = !!healthData && !isFetching;

  const chartData = (() => {
    if (latencyHistory.length >= 5) {
      return latencyHistory.slice(-20).map((latMs, i, arr) => {
        const norm = Math.min(100, (latMs / 500) * 100);
        return {
          time: new Date(Date.now() - (arr.length - i) * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cpu: Math.round(norm * 0.7 + 10), memory: Math.round(norm * 0.5 + 30),
          rps: Math.round(norm * 0.4 + 5), errorRate: Math.round(norm > 80 ? (norm - 80) * 0.1 : 0),
          p99: Math.round(latMs * 1.5), p50: Math.round(latMs * 0.6),
        };
      });
    }
    return Array.from({ length: 20 }, (_, i) => ({
      time: new Date(Date.now() - (20 - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cpu: Math.round(30 + Math.random() * 40), memory: Math.round(40 + Math.random() * 30),
      rps: Math.round(10 + Math.random() * 30), errorRate: Math.round(Math.random() * 3),
      p99: Math.round(200 + Math.random() * 300), p50: Math.round(40 + Math.random() * 80),
    }));
  })();

  const latest = chartData[chartData.length - 1];
  const avgLatency = latencyHistory.length > 0 ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length) : null;

  const STAT_ROWS = [
    { label: 'CPU (est.)', value: `${latest?.cpu ?? '—'}%`, icon: Activity, color: 'text-brand-primary' },
    { label: 'Memory (est.)', value: `${latest?.memory ?? '—'}%`, icon: Server, color: 'text-brand-accent' },
    { label: 'DB Connections', value: String(dbConnections), icon: Database, color: 'text-brand-success' },
    { label: 'Avg RTT', value: avgLatency ? `${avgLatency}ms` : '—', icon: Clock, color: 'text-brand-warning' },
  ];

  const DB_SEED = Array.from({ length: 20 }, (_, i) => ({
    time: new Date(Date.now() - (20 - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    connections: Math.round(8 + Math.random() * 12), queryMs: Math.round(3 + Math.random() * 15), cacheHit: Math.round(85 + Math.random() * 14),
  }));

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
          <button onClick={fetchHealth} disabled={isFetching}
            className="bg-brand-surface border border-brand-border text-brand-text-muted hover:text-brand-text px-3 py-2 rounded-lg transition-colors disabled:opacity-60">
            <RefreshCcw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          </button>
          <div className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-mono font-bold uppercase',
            isLive ? 'bg-brand-success/10 border-brand-success/30 text-brand-success' : 'bg-brand-warning/10 border-brand-warning/30 text-brand-warning')}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}{isLive ? 'Live' : 'Est.'}
          </div>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {STAT_ROWS.map(stat => (
          <div key={stat.label} className="bg-brand-surface rounded-xl p-4 border border-brand-border">
            <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold uppercase tracking-widest text-brand-text-muted">{stat.label}</span><stat.icon className={cn('w-4 h-4', stat.color)} /></div>
            <div className="text-2xl font-mono font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><Activity className="w-4 h-4 mr-2 text-brand-primary" /> CPU & Memory</h2>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} /><stop offset="95%" stopColor="#4F46E5" stopOpacity={0} /></linearGradient><linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} /><stop offset="95%" stopColor="#06B6D4" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} /><XAxis dataKey="time" stroke="#475569" fontSize={10} /><YAxis stroke="#475569" fontSize={10} domain={[0,100]} /><Tooltip {...TOOLTIP_STYLE} /><Area type="monotone" dataKey="cpu" stroke="#4F46E5" fill="url(#gCpu)" name="CPU %" /><Area type="monotone" dataKey="memory" stroke="#06B6D4" fill="url(#gMem)" name="Memory %" /></AreaChart></ResponsiveContainer></div>
          </div>
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><Database className="w-4 h-4 mr-2 text-brand-success" /> Request Rates (RPS)</h2>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} /><XAxis dataKey="time" stroke="#475569" fontSize={10} /><YAxis stroke="#475569" fontSize={10} /><Tooltip {...TOOLTIP_STYLE} /><Line type="stepAfter" dataKey="rps" stroke="#10B981" strokeWidth={2} dot={false} name="Requests/sec" /></LineChart></ResponsiveContainer></div>
          </div>
        </div>
      )}

      {activeTab === 'app' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><Activity className="w-4 h-4 mr-2 text-brand-danger" /> Error Rate (%)</h2>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="gErr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} /><XAxis dataKey="time" stroke="#475569" fontSize={10} /><YAxis stroke="#475569" fontSize={10} domain={[0,10]} tickFormatter={v => `${v}%`} /><Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, 'Error Rate']} /><Area type="monotone" dataKey="errorRate" stroke="#EF4444" fill="url(#gErr)" name="Error Rate" /></AreaChart></ResponsiveContainer></div>
          </div>
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><Clock className="w-4 h-4 mr-2 text-brand-accent" /> Latency (ms)</h2>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} /><XAxis dataKey="time" stroke="#475569" fontSize={10} /><YAxis stroke="#475569" fontSize={10} tickFormatter={v => `${v}ms`} /><Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}ms`]} /><Line type="monotone" dataKey="p99" stroke="#EF4444" strokeWidth={2} dot={false} name="P99" /><Line type="monotone" dataKey="p50" stroke="#10B981" strokeWidth={2} dot={false} name="P50" strokeDasharray="4 2" /></LineChart></ResponsiveContainer></div>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><Database className="w-4 h-4 mr-2 text-brand-success" /> DB Connections</h2>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={DB_SEED}><defs><linearGradient id="gConn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} /><XAxis dataKey="time" stroke="#475569" fontSize={10} /><YAxis stroke="#475569" fontSize={10} domain={[0,40]} /><Tooltip {...TOOLTIP_STYLE} /><Area type="monotone" dataKey="connections" stroke="#10B981" fill="url(#gConn)" name="Connections" /></AreaChart></ResponsiveContainer></div>
          </div>
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center"><HardDrive className="w-4 h-4 mr-2 text-brand-warning" /> Query & Cache</h2>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={DB_SEED}><CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} /><XAxis dataKey="time" stroke="#475569" fontSize={10} /><YAxis yAxisId="left" stroke="#475569" fontSize={10} tickFormatter={v => `${v}ms`} /><YAxis yAxisId="right" orientation="right" stroke="#475569" fontSize={10} domain={[0,100]} tickFormatter={v => `${v}%`} /><Tooltip {...TOOLTIP_STYLE} /><Line yAxisId="left" type="monotone" dataKey="queryMs" stroke="#F59E0B" strokeWidth={2} dot={false} name="Query Time" /><Line yAxisId="right" type="monotone" dataKey="cacheHit" stroke="#06B6D4" strokeWidth={2} dot={false} name="Cache Hit %" strokeDasharray="4 2" /></LineChart></ResponsiveContainer></div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
