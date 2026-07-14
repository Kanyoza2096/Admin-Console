import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Server, Cpu, Database, Network, HardDrive, 
  PlaySquare, StopCircle, RefreshCw, Zap, Clock, Terminal, AlertTriangle,
  ListTodo, Pause, Play, Search, X, MessageCircle, Send,
  Globe, Shield
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

// ═══════════════════════════════════════════════════════════════════════════
// DATA FLOW VISUALIZER — Enterprise
// ═══════════════════════════════════════════════════════════════════════════

interface FlowNode {
  id: string;
  label: string;
  icon: React.ElementType;
  x: number;
  y: number;
  status: 'online' | 'degraded' | 'offline' | 'active' | 'thinking';
  failureReason?: string;
  recoveredAt?: number;
}

interface FlowEdge {
  from: string;
  to: string;
  packets: { id: string; progress: number; opacity: number; isError: boolean }[];
}

interface SparkParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

const NODE_LAYOUT: Omit<FlowNode, 'status'>[] = [
  { id: 'gemini',     label: 'Gemini AI',        icon: Cpu,            x: 50,  y: 8 },
  { id: 'pipeline',   label: 'Content Pipeline',  icon: Zap,            x: 50,  y: 26 },
  { id: 'render',     label: 'Render Queue',      icon: Activity,       x: 82,  y: 26 },
  { id: 'command',    label: 'Command Executor',   icon: MessageCircle, x: 15,  y: 44 },
  { id: 'scheduler',  label: 'Post Scheduler',     icon: Send,          x: 50,  y: 44 },
  { id: 'browser',    label: 'Browser Manager',    icon: Globe,         x: 82,  y: 44 },
  { id: 'connectors', label: 'Connectors',         icon: Server,        x: 50,  y: 62 },
  { id: 'supabase',   label: 'Supabase',           icon: Database,      x: 30,  y: 80 },
  { id: 'redis',      label: 'Upstash Redis',      icon: Database,      x: 70,  y: 80 },
  { id: 'socketio',   label: 'Socket.IO',          icon: Activity,      x: 50,  y: 92 },
];

const EDGES: [string, string][] = [
  ['gemini', 'pipeline'], ['pipeline', 'render'], ['pipeline', 'scheduler'],
  ['gemini', 'command'], ['command', 'connectors'], ['scheduler', 'connectors'],
  ['render', 'browser'], ['browser', 'connectors'], ['connectors', 'supabase'],
  ['connectors', 'redis'], ['supabase', 'socketio'], ['redis', 'socketio'],
];

const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e', degraded: '#f59e0b', offline: '#ef4444', active: '#3b82f6', thinking: '#a855f7',
};

const STATUS_LABELS: Record<string, string> = {
  online: 'Healthy', degraded: 'Degraded', offline: 'Down', active: 'Processing', thinking: 'Generating',
};

function DataFlowVisualizer() {
  const { socket, healthMatrix, stats } = useStore();
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [sparks, setSparks] = useState<SparkParticle[]>([]);
  const [eventsPerSec, setEventsPerSec] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [failureEvents, setFailureEvents] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [workflowActive, setWorkflowActive] = useState(false);
  const packetIdRef = useRef(0);
  const sparkIdRef = useRef(0);

  useEffect(() => {
    setNodes(NODE_LAYOUT.map(n => ({ ...n, status: 'online' })));
    setEdges(EDGES.map(([from, to]) => ({ from, to, packets: [] })));
  }, []);

  // Map healthMatrix to nodes — use name matching
  useEffect(() => {
    if (!healthMatrix.length) return;
    setNodes(prev => prev.map(node => {
      const match = healthMatrix.find(h => {
        const name = (h.name || '').toLowerCase();
        const id = node.id.toLowerCase();
        return name.includes(id) || id.includes(name) ||
          (id === 'gemini' && name.includes('gemini')) ||
          (id === 'browser' && name.includes('browser')) ||
          (id === 'connectors' && name.includes('facebook')) ||
          (id === 'render' && name.includes('playwright'));
      });
      if (!match) return node;
      const status = match.status === 'online' ? 'online' : match.status === 'degraded' ? 'degraded' : 'offline';
      return { ...node, status };
    }));
  }, [healthMatrix]);

  const burstSparks = (nodeId: string, color: string, count: number = 8) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const newSparks: SparkParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      newSparks.push({ id: `sp_${sparkIdRef.current++}`, x: node.x, y: node.y, vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2, life: 1, color, size: 2.5 });
    }
    setSparks(prev => [...prev, ...newSparks].slice(-80));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSparks(prev => prev.map(s => ({ ...s, x: s.x + s.vx * 0.3, y: s.y + s.vy * 0.3, life: s.life - 0.02 })).filter(s => s.life > 0));
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    // Spawn a packet on a specific known edge (real source-driven)
    const spawnPacketOnEdge = (from: string, to: string) => {
      setEdges(prev => prev.map(e => e.from === from && e.to === to ? { ...e, packets: [...e.packets.slice(-4), { id: `p_${packetIdRef.current++}`, progress: 0, opacity: 0.9, isError: false }] } : e));
    };
    socket.on('new_message', () => { spawnPacketOnEdge('connectors', 'socketio'); burstSparks('connectors', '#22c55e', 4); setTotalEvents(p => p + 1); });
    socket.on('post_published', () => { spawnPacketOnEdge('scheduler', 'connectors'); burstSparks('scheduler', '#3b82f6', 6); setWorkflowActive(true); setTimeout(() => setWorkflowActive(false), 3000); setTotalEvents(p => p + 1); });
    socket.on('api_payload', () => { spawnPacketOnEdge('pipeline', 'scheduler'); setTotalEvents(p => p + 1); });
    socket.on('stats', () => { spawnPacketOnEdge('supabase', 'socketio'); setTotalEvents(p => p + 1); });
    socket.on('worker_error', (d: any) => { setNodes(p => p.map(n => n.id === (d?.source || d?.worker) ? { ...n, status: 'offline', failureReason: d?.error } : n)); burstSparks(d?.source || 'render', '#ef4444', 12); setFailureEvents(p => p + 1); setTotalEvents(p => p + 1); });
    socket.on('provider_failed', (d: any) => { setNodes(p => p.map(n => n.id === 'connectors' ? { ...n, status: 'degraded', failureReason: d?.error } : n)); burstSparks('connectors', '#ef4444', 10); setFailureEvents(p => p + 1); setTotalEvents(p => p + 1); });
    socket.on('post_generated', () => { setNodes(p => p.map(n => n.id === 'gemini' ? { ...n, status: 'thinking' } : n)); burstSparks('gemini', '#a855f7', 10); setTimeout(() => setNodes(p => p.map(n => n.id === 'gemini' && n.status === 'thinking' ? { ...n, status: 'online' } : n)), 2500); });
    const int = setInterval(() => setEdges(p => p.map(e => ({ ...e, packets: e.packets.map(p => ({ ...p, progress: p.progress + 0.025, opacity: p.opacity - 0.01 })).filter(p => p.progress < 1 && p.opacity > 0) }))), 40);
    const eps = setInterval(() => setEventsPerSec(p => { const d = totalEvents - ((window as any).__lt || 0); (window as any).__lt = totalEvents; return d; }), 1000);
    return () => { clearInterval(int); clearInterval(eps); ['new_message','post_published','api_payload','stats','worker_error','provider_failed','post_generated'].forEach(e => socket.off(e)); };
  }, [socket, totalEvents]);

  useEffect(() => {
    if (!searchQuery.trim()) { setHighlightedNode(null); return; }
    const found = nodes.find(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()));
    setHighlightedNode(found?.id || null);
  }, [searchQuery, nodes]);

  const getStatus = (n: FlowNode) => {
    if (n.status === 'offline' || n.status === 'degraded' || n.status === 'thinking') return n.status;
    if (n.id === 'connectors' && stats.apiCalls > 0) return 'active';
    if (n.id === 'scheduler' && stats.postsPublished > 0) return 'active';
    if (n.id === 'socketio' && eventsPerSec > 0) return 'active';
    return n.status;
  };

  const offlineCount = nodes.filter(n => getStatus(n) === 'offline').length;
  const systemHealthy = offlineCount === 0;

  return (
    <div className="relative w-full h-[500px] md:h-[600px] bg-brand-surface border border-brand-border rounded-2xl overflow-hidden group">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      
      {/* Search */}
      <div className="absolute top-3 right-3 z-30">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-text-muted" />
          <input type="text" placeholder="Search nodes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-36 bg-brand-elevated/90 backdrop-blur-sm border border-brand-border rounded-lg pl-7 pr-2 py-1.5 text-[10px] text-brand-text font-mono focus:outline-none focus:border-brand-primary/50" />
        </div>
      </div>

      {/* Failure glow */}
      {!systemHealthy && <motion.div className="absolute inset-0 pointer-events-none" animate={{ boxShadow: ['inset 0 0 0px rgba(239,68,68,0)','inset 0 0 40px rgba(239,68,68,0.12)','inset 0 0 0px rgba(239,68,68,0)'] }} transition={{ duration: 3, repeat: Infinity }} />}

      {/* SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
        {edges.map(edge => {
          const fn = nodes.find(n => n.id === edge.from);
          const tn = nodes.find(n => n.id === edge.to);
          if (!fn || !tn) return null;
          const fs = getStatus(fn), ts = getStatus(tn);
          const failed = fs === 'offline' || ts === 'offline';
          const degraded = fs === 'degraded' || ts === 'degraded';
          const wf = edge.from === 'scheduler' && edge.to === 'connectors' && workflowActive;
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <line x1={`${fn.x}%`} y1={`${fn.y}%`} x2={`${tn.x}%`} y2={`${tn.y}%`} stroke={failed ? '#ef4444' : degraded ? '#f59e0b' : wf ? '#3b82f6' : '#374151'} strokeWidth={failed || wf ? '2' : '1'} strokeDasharray={failed ? '5 3' : 'none'} opacity={failed ? 0.6 : wf ? 0.9 : 0.4} />
              {edge.packets.map(p => <motion.circle key={p.id} r={p.isError ? 4 : 2.5} fill={p.isError ? '#ef4444' : '#6366f1'} opacity={p.opacity} animate={{ cx: [`${fn.x}%`,`${tn.x}%`], cy: [`${fn.y}%`,`${tn.y}%`] }} transition={{ duration: 0.5, ease: 'linear' }} />)}
            </g>
          );
        })}
        {sparks.map(s => <motion.circle key={s.id} r={s.size || 2.5} fill={s.color} opacity={s.life} cx={`${s.x}%`} cy={`${s.y}%`} />)}
      </svg>

      {/* Nodes */}
      {nodes.map(node => {
        const Icon = node.icon;
        const status = getStatus(node);
        const color = STATUS_COLORS[status];
        const isHovered = hoveredNode === node.id;
        const isHighlighted = highlightedNode === node.id;
        return (
          <motion.div key={node.id} className="absolute flex flex-col items-center gap-0.5 pointer-events-auto z-20"
            style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)', opacity: highlightedNode && !isHighlighted ? 0.25 : 1 }}
            animate={{ scale: status === 'active' || status === 'thinking' ? [1, 1.08, 1] : status === 'offline' ? [1, 0.96, 1] : 1 }}
            transition={{ duration: status === 'thinking' ? 0.8 : 1.5, repeat: Infinity }}
            onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}
            onClick={() => { setSearchQuery(node.label); setHighlightedNode(node.id); }}>
            {status === 'thinking' && <><motion.div className="absolute inset-0 rounded-full" style={{ border: '2px solid #a855f7' }} animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} /></>}
            {status === 'active' && <motion.div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${color}` }} animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />}
            {status === 'offline' && <motion.div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${color}` }} animate={{ scale: [1, 1.4], opacity: [0.7, 0] }} transition={{ duration: 2, repeat: Infinity }} />}
            {isHighlighted && <motion.div className="absolute -inset-2 rounded-full" style={{ border: '2px solid #f59e0b' }} animate={{ scale: [1, 1.15, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />}
            <motion.div className="p-2.5 rounded-xl cursor-pointer transition-all" style={{ backgroundColor: `${color}18`, border: `1.5px solid ${color}50`, boxShadow: status === 'offline' ? `0 0 14px ${color}40` : isHighlighted ? '0 0 16px #f59e0b40' : undefined }} whileHover={{ scale: 1.2 }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </motion.div>
            <span className="text-[8px] font-mono font-bold uppercase text-brand-text-muted text-center leading-tight max-w-[60px]">{node.label}</span>
            <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} animate={{ opacity: status === 'active' || status === 'thinking' ? [1, 0.3, 1] : 1 }} transition={{ duration: 1, repeat: Infinity }} />
            <AnimatePresence>
              {isHovered && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full mb-2 bg-brand-elevated/80 backdrop-blur-md border border-brand-border/50 rounded-xl px-3 py-2.5 shadow-2xl whitespace-nowrap z-50">
                  <p className="text-xs font-bold text-brand-text">{node.label}</p>
                  <p className="text-[10px] font-mono" style={{ color }}>{STATUS_LABELS[status]}</p>
                  {node.failureReason && <p className="text-[9px] text-red-400 mt-1 max-w-[180px] whitespace-normal">{node.failureReason}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Minimap */}
      <div className="absolute bottom-14 right-3 w-24 h-16 bg-brand-elevated/80 backdrop-blur-sm border border-brand-border/50 rounded-lg overflow-hidden z-20 opacity-60 hover:opacity-100">
        <svg className="w-full h-full" viewBox="0 0 100 100"><line x1="50" y1="8" x2="50" y2="26" stroke="#374151" strokeWidth="0.5" /><line x1="50" y1="26" x2="82" y2="26" stroke="#374151" strokeWidth="0.5" /><line x1="50" y1="26" x2="50" y2="44" stroke="#374151" strokeWidth="0.5" /><line x1="50" y1="8" x2="15" y2="44" stroke="#374151" strokeWidth="0.5" /><line x1="82" y1="26" x2="82" y2="44" stroke="#374151" strokeWidth="0.5" /><line x1="15" y1="44" x2="50" y2="62" stroke="#374151" strokeWidth="0.5" /><line x1="50" y1="44" x2="50" y2="62" stroke="#374151" strokeWidth="0.5" /><line x1="82" y1="44" x2="50" y2="62" stroke="#374151" strokeWidth="0.5" /><line x1="50" y1="62" x2="30" y2="80" stroke="#374151" strokeWidth="0.5" /><line x1="50" y1="62" x2="70" y2="80" stroke="#374151" strokeWidth="0.5" /><line x1="30" y1="80" x2="50" y2="92" stroke="#374151" strokeWidth="0.5" /><line x1="70" y1="80" x2="50" y2="92" stroke="#374151" strokeWidth="0.5" />{nodes.map(n => <circle key={n.id} cx={n.x} cy={n.y} r="2.5" fill={STATUS_COLORS[getStatus(n)]} />)}</svg>
      </div>

      {/* Stats bar */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center bg-brand-elevated/95 backdrop-blur-sm border border-brand-border rounded-lg px-3 py-1.5 z-30">
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-brand-primary" /><span className="text-brand-text-muted">Events/s:</span><span className="text-brand-primary font-bold">{eventsPerSec}</span></div>
          <div className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-brand-success" /><span className="text-brand-text-muted">Total:</span><span className="text-brand-success font-bold">{totalEvents.toLocaleString()}</span></div>
          {failureEvents > 0 && <div className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-red-400" /><span className="text-red-400 font-bold">{failureEvents}</span></div>}
        </div>
        <div className="flex items-center gap-2">
          {workflowActive && <span className="text-[9px] text-blue-400 font-mono animate-pulse hidden md:block">⚡ Workflow Active</span>}
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: systemHealthy ? '#22c55e' : '#ef4444' }} />
          <span className="text-[9px] font-mono text-brand-text-muted uppercase">{systemHealthy ? 'All Systems Operational' : `${offlineCount} down`}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GAUGE
// ═══════════════════════════════════════════════════════════════════════════

const Gauge = ({ value, label, color, icon: Icon, suffix = '' }: any) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 flex flex-col items-center justify-center">
      <div className="absolute top-3 left-3 text-brand-text-muted"><Icon className="w-4 h-4" /></div>
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-brand-elevated" />
          <circle cx="48" cy="48" r={radius} stroke={color} strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-500" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-bold text-brand-text">{Math.round(value)}{suffix}</span></div>
      </div>
      <p className="text-[10px] text-brand-text-muted font-mono uppercase mt-3 tracking-widest">{label}</p>
    </div>
  );
};

const LEVEL_COLORS: Record<string, string> = { DEBUG: '#6b7280', INFO: '#4F46E5', WARNING: '#F59E0B', WARN: '#F59E0B', ERROR: '#EF4444', CRITICAL: '#7c3aed' };
const LEVEL_BORDER: Record<string, string> = { DEBUG: 'border-gray-500/30', INFO: 'border-brand-primary/30', WARNING: 'border-brand-warning/30', WARN: 'border-brand-warning/30', ERROR: 'border-brand-danger/30', CRITICAL: 'border-purple-500/30' };

// ═══════════════════════════════════════════════════════════════════════════
// MONITORING PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function Monitoring() {
  const { healthMatrix, restEndpoint, masterToken, stats, latencyHistory, pushLatency } = useStore();
  const [events, setEvents] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState({ level: '', search: '' });
  const [logStats, setLogStats] = useState({ errors: 0, warnings: 0, info: 0, total_logs: 0 });
  const [resources, setResources] = useState({ cpu_percent: 0, memory_percent: 0, disk_percent: 0, network_in_kbps: 0, network_out_kbps: 0, queue_depth: 0, workers_active: 0 });
  const [connectionMode, setConnectionMode] = useState<'sse' | 'polling'>('sse');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pausedBufferRef = useRef<any[]>([]);
  const headers = masterToken ? { Authorization: `Bearer ${masterToken}` } : {};

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await fetch(`${restEndpoint.replace(/\/+$/, '')}/metrics/resources`, { headers });
        if (res.ok) { const d = await res.json(); setResources(d); if (d.cpu_percent) pushLatency?.(d.cpu_percent); }
      } catch {}
    };
    fetchResources();
    const id = setInterval(fetchResources, 5000);
    return () => clearInterval(id);
  }, [restEndpoint]);

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

  useEffect(() => {
    const p = new URLSearchParams();
    if (filter.level) p.append('level', filter.level);
    const es = new EventSource(`${restEndpoint.replace(/\/+$/, '')}/logs/stream?${p}`);
    es.onopen = () => setConnectionMode('sse');
    es.onmessage = (e) => {
      try { const entry = JSON.parse(e.data); paused ? pausedBufferRef.current.push(entry) : setEvents(prev => [entry, ...prev].slice(0, 200)); } catch {}
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

  const services = healthMatrix.map(h => ({
    name: h.name, status: h.status, uptime: `${h.uptime}%`,
    latency: [h.latency, h.latency*0.9, h.latency*1.1, h.latency*0.95, h.latency, h.latency*1.05, h.latency*0.85, h.latency, h.latency*1.15, h.latency*0.9],
    lastChecked: new Date(h.lastChecked).toLocaleTimeString('en-US', { hour12: false }),
  }));

  const filteredEvents = filter.search ? events.filter(e => (e.message||e.msg||'').toLowerCase().includes(filter.search.toLowerCase())) : events;
  const gauges = { cpu: resources.cpu_percent||0, mem: resources.memory_percent||0, disk: resources.disk_percent||0, netIn: Math.min(100,(resources.network_in_kbps||0)/10), netOut: Math.min(100,(resources.network_out_kbps||0)/10), queue: resources.queue_depth||0 };
  const chartData = latencyHistory.length > 0 ? latencyHistory.map((v,i) => ({ time: i, latency: v })) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div><h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center"><Activity className="w-8 h-8 mr-3 text-brand-primary" />System Monitoring</h1><p className="text-brand-text-muted text-sm font-mono mt-1">INFRASTRUCTURE TELEMETRY</p></div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-3 text-xs font-mono"><span className="text-red-400">🔴 {logStats.errors||stats?.guardianIssues||0}</span><span className="text-amber-400">🟡 {logStats.warnings||0}</span><span className="text-blue-400">🔵 {logStats.info||0}</span><span className="text-gray-400">📋 {logStats.total_logs||0}</span></div>
          <div className="flex items-center gap-3 px-4 py-2 bg-brand-surface border border-brand-border rounded-xl"><div className={cn("w-2.5 h-2.5 rounded-full",connectionMode==='sse'?'bg-brand-success animate-pulse':'bg-brand-warning')} /><span className={cn("text-sm font-mono uppercase tracking-widest font-bold",connectionMode==='sse'?'text-brand-success':'text-brand-warning')}>{connectionMode==='sse'?'SSE Live':'REST Polling'}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Gauge value={gauges.cpu} label="CPU Usage" color="#4F46E5" icon={Cpu} suffix="%" />
        <Gauge value={gauges.mem} label="Memory" color="#06B6D4" icon={Database} suffix="%" />
        <Gauge value={gauges.disk} label="Disk I/O" color="#10B981" icon={HardDrive} suffix="%" />
        <Gauge value={gauges.netIn} label="Net In" color="#F59E0B" icon={Network} suffix="MB" />
        <Gauge value={gauges.netOut} label="Net Out" color="#8B5CF6" icon={Network} suffix="MB" />
        <Gauge value={gauges.queue} label="Queue Depth" color="#EF4444" icon={ListTodo} />
      </div>

      <DataFlowVisualizer />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text mb-6">API Latency</h3>
          <div className="h-64">
            {chartData.length===0 ? <div className="flex items-center justify-center h-full text-brand-text-muted text-sm uppercase">Waiting...</div> :
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4F46E5" stopOpacity={0.3}/><stop offset="100%" stopColor="#4F46E5" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/><XAxis dataKey="time" hide/><YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false}/><Tooltip contentStyle={{backgroundColor:'#0B1121',border:'1px solid #1E293B',borderRadius:'12px',fontSize:'12px'}}/><Area type="monotone" dataKey="latency" stroke="#4F46E5" strokeWidth={2} fill="url(#lg)" dot={false}/></AreaChart></ResponsiveContainer>}
          </div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text mb-6">Platform Stats</h3>
          <div className="h-64 flex items-center justify-center"><div className="text-center"><span className="text-5xl font-bold text-brand-primary">{stats?.apiCalls?.toLocaleString()||0}</span><p className="text-brand-text-muted text-sm mt-2">Total API Requests Today</p><div className="flex gap-8 mt-4 text-sm"><div><p className="text-brand-text-muted">Posts</p><p className="text-xl font-bold text-brand-success">{stats?.postsPublished||0}</p></div><div><p className="text-brand-text-muted">Messages</p><p className="text-xl font-bold text-brand-accent">{stats?.messagesToday||0}</p></div><div><p className="text-brand-text-muted">Users</p><p className="text-xl font-bold text-brand-warning">{stats?.activeUsers||0}</p></div></div></div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((svc,i) => (
          <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}} className="bg-brand-surface border border-brand-border rounded-2xl p-5 hover:border-brand-primary/30 transition-all">
            <div className="flex justify-between items-start mb-4"><h4 className="text-sm font-bold text-brand-text">{svc.name}</h4><span className={cn("px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase",svc.status==='online'?'bg-brand-success/20 text-brand-success':svc.status==='degraded'?'bg-brand-warning/20 text-brand-warning':'bg-brand-danger/20 text-brand-danger')}>{svc.status}</span></div>
            <div className="h-10 mb-4 flex items-end gap-1">{svc.latency.map((val,idx)=>{const h=Math.max(8,Math.min(100,(val/Math.max(...svc.latency,1))*100));return <div key={idx} className="flex-1 bg-brand-elevated rounded-t-sm"><div className={cn("w-full rounded-t-sm transition-all",val>400?"bg-brand-warning":"bg-brand-primary")} style={{height:`${h}%`}}/></div>})}</div>
            <div className="flex items-center justify-between text-xs text-brand-text-muted font-mono border-t border-brand-border pt-3"><span>UP {svc.uptime}</span><div className="flex gap-2"><span>{svc.lastChecked}</span><span className="text-brand-primary">{svc.latency[0]}ms</span></div></div>
          </motion.div>
        ))}
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden flex flex-col h-[500px]">
        <div className="p-5 border-b border-brand-border flex justify-between items-center flex-wrap gap-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text">Live Log Stream</h3>
          <div className="flex items-center gap-2">
            <select value={filter.level} onChange={e=>setFilter(f=>({...f,level:e.target.value}))} className="bg-brand-elevated border border-brand-border rounded px-2 py-1 text-xs text-brand-text"><option value="">All</option><option value="DEBUG">DEBUG</option><option value="INFO">INFO</option><option value="WARNING">WARNING</option><option value="ERROR">ERROR</option><option value="CRITICAL">CRITICAL</option></select>
            <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-text-muted"/><input type="text" placeholder="Search..." value={filter.search} onChange={e=>setFilter(f=>({...f,search:e.target.value}))} className="bg-brand-elevated border border-brand-border rounded pl-7 pr-2 py-1 text-xs text-brand-text w-36"/></div>
            <button onClick={paused?()=>{setPaused(false);if(pausedBufferRef.current.length){setEvents(p=>[...pausedBufferRef.current,...p].slice(0,200));pausedBufferRef.current=[]}}:()=>setPaused(true)} className={cn("px-3 py-1 rounded text-xs font-bold flex items-center gap-1",paused?"bg-brand-success text-white":"bg-brand-warning text-white")}>{paused?<><Play className="w-3 h-3"/>Resume</>:<><Pause className="w-3 h-3"/>Pause</>}</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
          {filteredEvents.length===0 && <div className="text-brand-text-muted text-center mt-8 uppercase tracking-widest">{connectionMode==='sse'?'Waiting for log events...':'No logs received'}</div>}
          {filteredEvents.map((entry,i)=>(<motion.div key={entry.id||i} initial={{opacity:0,x:-5}} animate={{opacity:1,x:0}} className={cn("flex gap-3 py-0.5 hover:bg-brand-elevated/50 rounded px-2 border-l-2",LEVEL_BORDER[entry.level]||'border-brand-primary/30')}><span className="text-brand-text-muted shrink-0 w-20">{new Date(entry.timestamp||entry.time).toLocaleTimeString('en-US',{hour12:false})}</span><span className="shrink-0 w-14 text-center font-bold" style={{color:LEVEL_COLORS[entry.level]||'#fff'}}>{entry.level}</span><span className="text-brand-text-muted shrink-0 w-28 truncate">{entry.module||'system'}</span><span className="text-brand-text break-all">{entry.message||entry.msg}</span></motion.div>))}
          <div ref={logsEndRef}/>
        </div>
      </div>
    </motion.div>
  );
}
