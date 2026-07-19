import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Server, Cpu, Database, Network, HardDrive, 
  PlaySquare, StopCircle, RefreshCw, Zap, Clock, Terminal, AlertTriangle,
  ListTodo, Pause, Play, Search, X, MessageCircle, Send,
  Globe, Shield, Eye, EyeOff, Download, Maximize2, Minimize2,
  Wifi, WifiOff, TrendingUp, TrendingDown, Gauge
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import DataFlowVisualizer from '../components/DataFlowVisualizer';

// ── Gauge component ────────────────────────────────────────────────────────

function GaugeWidget({ value, label, color, icon: Icon, suffix = '' }: {
  value: number; label: string; color: string; icon: React.ElementType; suffix?: string;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, value) / 100) * circumference;
  const statusColor = value > 80 ? '#ef4444' : value > 60 ? '#f59e0b' : '#34d399';

  return (
    <div className="bg-brand-surface/50 border border-brand-border/50 rounded-2xl p-4 flex flex-col items-center justify-center hover:border-brand-border transition-colors group">
      <div className="relative w-20 h-20 flex items-center justify-center mb-2">
        <svg className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={radius} stroke="#27272a" strokeWidth="5" fill="none" />
          <circle cx="40" cy="40" r={radius} stroke={color} strokeWidth="5" fill="none"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-mono font-bold text-white">{Math.round(value)}{suffix}</span>
        </div>
      </div>
      <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-text-muted group-hover:text-brand-text transition-colors">{label}</p>
    </div>
  );
}

// ── Service card ───────────────────────────────────────────────────────────

function ServiceCard({ name, status, uptime, latency, lastChecked }: {
  name: string; status: string; uptime: string; latency: number[]; lastChecked: string;
}) {
  const maxLat = Math.max(...latency, 1);
  const avgLat = Math.round(latency.reduce((a, b) => a + b, 0) / latency.length);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-brand-surface/50 border border-brand-border/50 rounded-2xl p-4 hover:border-brand-primary/30 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-white">{name}</h4>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase border',
          status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
          status === 'degraded' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
          'bg-red-500/10 text-red-400 border-red-500/30'
        )}>
          {status}
        </span>
      </div>
      {/* Latency sparkline */}
      <div className="h-8 flex items-end gap-px mb-3">
        {latency.map((val, i) => (
          <div key={i} className="flex-1 bg-brand-elevated/50 rounded-t-sm" style={{ height: `${Math.max(4, (val / maxLat) * 100)}%` }}>
            <div className={cn('w-full rounded-t-sm transition-all', val > 400 ? 'bg-amber-400' : 'bg-brand-primary')}
              style={{ height: '100%' }} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono border-t border-brand-border/30 pt-2.5">
        <span className="text-brand-text-muted">UP {uptime}</span>
        <div className="flex items-center gap-2">
          <span className="text-brand-text-muted">{lastChecked}</span>
          <span className="text-brand-primary font-bold">{avgLat}ms</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Log row ────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<string, { color: string; border: string; bg: string }> = {
  DEBUG:    { color: '#6b7280', border: 'border-l-zinc-500',    bg: 'bg-zinc-500/5' },
  INFO:     { color: '#818cf8', border: 'border-l-violet-500',  bg: 'bg-violet-500/5' },
  WARNING:  { color: '#f59e0b', border: 'border-l-amber-500',   bg: 'bg-amber-500/5' },
  WARN:     { color: '#f59e0b', border: 'border-l-amber-500',   bg: 'bg-amber-500/5' },
  ERROR:    { color: '#ef4444', border: 'border-l-red-500',     bg: 'bg-red-500/5' },
  CRITICAL: { color: '#a855f7', border: 'border-l-purple-500',  bg: 'bg-purple-500/5' },
};

function LogRow({ entry }: { entry: any }) {
  const config = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.INFO;
  return (
    <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
      className={cn('flex items-center gap-3 py-1.5 px-2 rounded text-[10px] font-mono border-l-2 hover:bg-brand-elevated/20 transition-colors', config.border)}>
      <span className="text-brand-text-muted w-20 flex-shrink-0 tabular-nums">
        {new Date(entry.timestamp || entry.time).toLocaleTimeString('en-US', { hour12: false })}
      </span>
      <span className="w-14 text-center font-bold flex-shrink-0" style={{ color: config.color }}>
        {entry.level}
      </span>
      <span className="text-brand-text-muted w-24 truncate flex-shrink-0">{entry.module || 'system'}</span>
      <span className="text-brand-text truncate">{entry.message || entry.msg}</span>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export default function Monitoring() {
  const { healthMatrix, restEndpoint, masterToken, stats, latencyHistory, pushLatency, socketConnected } = useStore();
  const [events, setEvents] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState({ level: '', search: '' });
  const [logStats, setLogStats] = useState({ errors: 0, warnings: 0, info: 0, total_logs: 0 });
  const [resources, setResources] = useState({ cpu_percent: 0, memory_percent: 0, disk_percent: 0, network_in_kbps: 0, network_out_kbps: 0, queue_depth: 0, workers_active: 0 });
  const [connectionMode, setConnectionMode] = useState<'sse' | 'polling'>('sse');
  const [activeTab, setActiveTab] = useState<'overview' | 'logs'>('overview');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pausedBufferRef = useRef<any[]>([]);
  const headers = masterToken ? { Authorization: `Bearer ${masterToken}` } : {};

  // Fetch resources
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await fetch(`${restEndpoint.replace(/\/+$/, '')}/metrics/resources`, { headers });
        if (res.ok) { const d = await res.json(); setResources(d); }
      } catch {}
    };
    fetchResources();
    const id = setInterval(fetchResources, 5000);
    return () => clearInterval(id);
  }, [restEndpoint]);

  // Fetch log stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${restEndpoint.replace(/\/+$/, '')}/logs/stats`, { headers });
        if (res.ok) setLogStats(await res.json());
      } catch {}
    };
    fetchStats();
    const id = setInterval(fetchStats, 30000);
    return () => clearInterval(id);
  }, [restEndpoint]);

  // SSE log stream
  useEffect(() => {
    const p = new URLSearchParams();
    if (filter.level) p.append('level', filter.level);
    const es = new EventSource(`${restEndpoint.replace(/\/+$/, '')}/logs/stream?${p}`);
    es.onopen = () => setConnectionMode('sse');
    es.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data);
        if (paused) pausedBufferRef.current.push(entry);
        else setEvents(prev => [entry, ...prev].slice(0, 300));
      } catch {}
    };
    es.onerror = () => { setConnectionMode('polling'); es.close(); };
    const poll = setInterval(async () => {
      if (es.readyState === EventSource.OPEN) return;
      try {
        const r = await fetch(`${restEndpoint.replace(/\/+$/, '')}/logs/recent?limit=100`, { headers });
        if (r.ok) { const d = await r.json(); if (d.logs?.length) setEvents(d.logs); }
      } catch {}
    }, 10000);
    return () => { es.close(); clearInterval(poll); };
  }, [restEndpoint, filter.level, paused]);

  useEffect(() => { if (!paused && logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [events, paused]);

  // Derived data
  const services = useMemo(() => healthMatrix.map(h => ({
    name: h.name, status: h.status, uptime: `${h.uptime || 99.9}%`,
    latency: [h.latency || 0, (h.latency || 0) * 0.9, (h.latency || 0) * 1.1, (h.latency || 0) * 0.95, (h.latency || 0), (h.latency || 0) * 1.05, (h.latency || 0) * 0.85, (h.latency || 0), (h.latency || 0) * 1.15, (h.latency || 0) * 0.9],
    lastChecked: new Date(h.lastChecked).toLocaleTimeString('en-US', { hour12: false }),
  })), [healthMatrix]);

  const filteredEvents = useMemo(() => {
    if (!filter.search) return events;
    const q = filter.search.toLowerCase();
    return events.filter(e => (e.message || e.msg || '').toLowerCase().includes(q));
  }, [events, filter.search]);

  const gauges = { cpu: resources.cpu_percent || 0, mem: resources.memory_percent || 0, disk: resources.disk_percent || 0 };

  const chartData = useMemo(() => 
    latencyHistory.length > 0 ? latencyHistory.slice(-30).map((v, i) => ({ time: i, latency: v })) : [],
    [latencyHistory]
  );

  const errorCount = logStats.errors || events.filter(e => e.level === 'ERROR' || e.level === 'CRITICAL').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-20 md:pb-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
            <Activity className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Monitoring</h1>
            <p className="text-[10px] text-brand-text-muted font-mono uppercase tracking-wider mt-0.5">
              {services.length} services · {errorCount} errors · {connectionMode === 'sse' ? 'SSE Live' : 'Polling'}
              {socketConnected ? <span className="text-emerald-400 ml-2">● Connected</span> : <span className="text-amber-400 ml-2">● Offline</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-brand-surface border border-brand-border/50 rounded-xl">
            {(['overview', 'logs'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn('px-3.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all',
                  activeTab === tab ? 'bg-brand-primary text-white shadow-glow-primary' : 'text-brand-text-muted hover:text-white')}>
                {tab}
              </button>
            ))}
          </div>
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-mono font-bold',
            connectionMode === 'sse' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          )}>
            <div className={cn('w-1.5 h-1.5 rounded-full', connectionMode === 'sse' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} />
            {connectionMode === 'sse' ? 'Live' : 'Polling'}
          </div>
        </div>
      </div>

      {/* Log stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Errors', value: errorCount, color: 'text-red-400' },
          { label: 'Warnings', value: logStats.warnings || 0, color: 'text-amber-400' },
          { label: 'Info', value: logStats.info || 0, color: 'text-sky-400' },
          { label: 'Total', value: logStats.total_logs || 0, color: 'text-brand-text-muted' },
        ].map(s => (
          <div key={s.label} className="bg-brand-surface/50 border border-brand-border/50 rounded-xl p-2.5 text-center">
            <p className={cn('text-lg font-mono font-bold', s.color)}>{s.value}</p>
            <p className="text-[9px] font-mono uppercase text-brand-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overview Tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">

            {/* Gauges */}
            <div className="grid grid-cols-3 gap-3">
              <GaugeWidget value={gauges.cpu} label="CPU" color="#818cf8" icon={Cpu} suffix="%" />
              <GaugeWidget value={gauges.mem} label="Memory" color="#06b6d4" icon={Database} suffix="%" />
              <GaugeWidget value={gauges.disk} label="Disk" color="#34d399" icon={HardDrive} suffix="%" />
            </div>

            {/* Topology */}
            <div className="rounded-2xl border border-brand-border/50 overflow-hidden">
              <DataFlowVisualizer />
            </div>

            {/* Latency Chart */}
            <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-5">
              <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-4 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-brand-primary" /> API Latency
              </h2>
              <div className="h-48">
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-brand-text-muted text-xs font-mono uppercase">Waiting for data...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="monLatGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}ms`} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="latency" stroke="#818cf8" strokeWidth={2} fill="url(#monLatGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Service Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {services.map((svc, i) => (
                <ServiceCard key={i} {...svc} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <motion.div key="logs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-brand-surface border border-brand-border/50 rounded-2xl overflow-hidden flex flex-col h-[600px]">
            
            {/* Log header */}
            <div className="p-4 border-b border-brand-border/30 flex flex-wrap items-center gap-3 bg-brand-elevated/10 shrink-0">
              <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted">Live Log Stream</h2>
              <select value={filter.level} onChange={e => setFilter(f => ({ ...f, level: e.target.value }))}
                className="bg-brand-elevated border border-brand-border/50 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-brand-text focus:outline-none focus:border-brand-primary/50">
                <option value="">All Levels</option>
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-text-muted" />
                <input type="text" placeholder="Search messages..." value={filter.search}
                  onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                  className="w-full pl-7 pr-3 py-1.5 bg-brand-elevated border border-brand-border/50 rounded-lg text-[10px] font-mono text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-primary/50" />
              </div>
              <button
                onClick={() => {
                  if (paused) { setPaused(false); if (pausedBufferRef.current.length) { setEvents(p => [...pausedBufferRef.current, ...p].slice(0, 300)); pausedBufferRef.current = []; } }
                  else setPaused(true);
                }}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all',
                  paused ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30')}>
                {paused ? <><Play className="w-3 h-3" /> Resume</> : <><Pause className="w-3 h-3" /> Pause</>}
              </button>
              <span className="text-[9px] text-brand-text-muted font-mono ml-auto">{filteredEvents.length} entries</span>
            </div>

            {/* Log entries */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {filteredEvents.length === 0 ? (
                <div className="flex items-center justify-center h-full text-brand-text-muted text-xs font-mono uppercase">
                  {connectionMode === 'sse' ? 'Waiting for log events...' : 'No logs received'}
                </div>
              ) : (
                filteredEvents.map((entry, i) => <LogRow key={entry.id || i} entry={entry} />)
              )}
              <div ref={logsEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
