// ═══════════════════════════════════════════════════════════════════════════
// DATA FLOW VISUALIZER — Enterprise Edition
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  Cpu, Zap, Activity, MessageCircle, Send, Globe, Server, Database, 
  Search, X, AlertTriangle, Maximize2, Minimize2, RotateCcw, Network
} from 'lucide-react';
import { cn } from '../lib/utils';

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

export default function DataFlowVisualizer() {
  const { socket, healthMatrix, stats } = useStore();
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [sparks, setSparks] = useState<SparkParticle[]>([]);
  const [eventsPerSec, setEventsPerSec] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [failureEvents, setFailureEvents] = useState(0);
  const [lastFailure, setLastFailure] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [workflowActive, setWorkflowActive] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const packetIdRef = useRef(0);
  const sparkIdRef = useRef(0);
  const lastPinchRef = useRef<number | null>(null);
  const statsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize
  useEffect(() => {
    setNodes(NODE_LAYOUT.map(n => ({ ...n, status: 'online' })));
    setEdges(EDGES.map(([from, to]) => ({ from, to, packets: [] })));
  }, []);

  // Map health matrix to node statuses
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
      const newStatus = match.status === 'online' ? 'online' : match.status === 'degraded' ? 'degraded' : 'offline';
      if (node.status === 'offline' && newStatus === 'online') {
        return { ...node, status: 'online', failureReason: undefined, recoveredAt: Date.now() };
      }
      return { ...node, status: newStatus };
    }));
  }, [healthMatrix]);

  // Spark particle burst
  const burstSparks = useCallback((nodeId: string, color: string, count: number = 8) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const newSparks: SparkParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2;
      newSparks.push({
        id: `spark_${sparkIdRef.current++}`,
        x: node.x, y: node.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, color, size: 2 + Math.random() * 3,
      });
    }
    setSparks(prev => [...prev, ...newSparks].slice(-80));
  }, [nodes]);

  // Spark animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setSparks(prev => prev
        .map(s => ({ ...s, x: s.x + s.vx * 0.3, y: s.y + s.vy * 0.3, life: s.life - 0.02 }))
        .filter(s => s.life > 0)
      );
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const spawnPacket = (from: string, to: string) => {
      setEdges(prev => prev.map(edge =>
        edge.from === from && edge.to === to
          ? { ...edge, packets: [...edge.packets.slice(-4), { id: `pkt_${packetIdRef.current++}`, progress: 0, opacity: 0.9, isError: false }] }
          : edge
      ));
    };

    const spawnErrorPacket = (fromId: string, toId: string) => {
      setEdges(prev => prev.map(edge =>
        (edge.from === fromId || edge.to === toId || edge.to === fromId || edge.from === toId)
          ? { ...edge, packets: [...edge.packets.slice(-4), { id: `err_${packetIdRef.current++}`, progress: 0, opacity: 1, isError: true }] }
          : edge
      ));
    };

    socket.on('new_message', () => { spawnPacket('connectors', 'socketio'); burstSparks('connectors', '#22c55e', 4); setTotalEvents(p => p + 1); });
    socket.on('post_published', () => { spawnPacket('scheduler', 'connectors'); burstSparks('scheduler', '#3b82f6', 6); setWorkflowActive(true); setTimeout(() => setWorkflowActive(false), 3000); setTotalEvents(p => p + 1); });
    socket.on('api_payload', () => { spawnPacket('pipeline', 'scheduler'); setTotalEvents(p => p + 1); });
    socket.on('stats', () => { spawnPacket('supabase', 'socketio'); setTotalEvents(p => p + 1); });

    socket.on('scan_complete', (data: any) => {
      spawnPacket('gemini', 'command');
      if (data?.critical > 0 || data?.severity === 'CRITICAL') {
        setNodes(prev => prev.map(n => (n.id === 'command' || n.id === 'pipeline') ? { ...n, status: 'degraded', failureReason: `Scan: ${data.critical || 0} critical` } : n));
        burstSparks('command', '#ef4444', 10);
        setFailureEvents(p => p + 1);
      }
      setTotalEvents(p => p + 1);
    });

    socket.on('post_generated', () => {
      setNodes(prev => prev.map(n => n.id === 'gemini' ? { ...n, status: 'thinking' } : n));
      burstSparks('gemini', '#a855f7', 12);
      setTimeout(() => setNodes(prev => prev.map(n => n.id === 'gemini' && n.status === 'thinking' ? { ...n, status: 'online' } : n)), 2500);
      setTotalEvents(p => p + 1);
    });

    socket.on('worker_error', (data: any) => {
      const source = data?.source || data?.worker || '';
      setNodes(prev => prev.map(n => (n.id === source || n.label?.toLowerCase().includes(source?.toLowerCase())) ? { ...n, status: 'offline', failureReason: data?.error || 'Worker failure' } : n));
      burstSparks(source || 'render', '#ef4444', 15);
      setFailureEvents(p => p + 1);
      setLastFailure(data?.error || 'Worker error');
      setTotalEvents(p => p + 1);
    });

    socket.on('provider_failed', (data: any) => {
      setNodes(prev => prev.map(n => n.id === 'connectors' ? { ...n, status: 'degraded', failureReason: `${data?.provider}: ${data?.error}` } : n));
      EDGES.forEach(([from, to]) => { if (from === 'connectors' || to === 'connectors') spawnErrorPacket(from, to); });
      burstSparks('connectors', '#ef4444', 12);
      setFailureEvents(p => p + 1);
      setLastFailure(`${data?.provider}: ${data?.error}`);
      setTotalEvents(p => p + 1);
    });

    const packetInterval = setInterval(() => {
      setEdges(prev => prev.map(edge => ({
        ...edge,
        packets: edge.packets.map(p => ({ ...p, progress: p.progress + 0.025, opacity: p.opacity - 0.01 })).filter(p => p.progress < 1 && p.opacity > 0),
      })));
    }, 40);

    const epsInterval = setInterval(() => {
      setEventsPerSec(prev => {
        const diff = totalEvents - ((window as any).__lastTotal || 0);
        (window as any).__lastTotal = totalEvents;
        return diff;
      });
    }, 1000);

    const healthWatchdog = setInterval(() => {
      const now = Date.now();
      setNodes(prev => prev.map(node => {
        if (node.status === 'offline') return node;
        const health = healthMatrix.find(h => h.id === node.id || h.name?.toLowerCase().includes(node.id));
        if (health && health.lastChecked && (now - health.lastChecked) > 30000 && node.status !== 'degraded') {
          return { ...node, status: 'degraded', failureReason: 'No health check in 30s' };
        }
        return node;
      }));
    }, 10000);

    return () => {
      ['new_message', 'post_published', 'api_payload', 'stats', 'scan_complete', 'post_generated', 'worker_error', 'provider_failed'].forEach(e => socket.off(e));
      clearInterval(packetInterval);
      clearInterval(epsInterval);
      clearInterval(healthWatchdog);
    };
  }, [socket, totalEvents, healthMatrix, burstSparks]);

  // Search handler
  useEffect(() => {
    if (!searchQuery.trim()) { setHighlightedNode(null); return; }
    const found = nodes.find(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()));
    setHighlightedNode(found?.id || null);
  }, [searchQuery, nodes]);

  // Auto-hide stats pill
  const showStatsTemporarily = () => {
    setShowStats(true);
    if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
    statsTimeoutRef.current = setTimeout(() => setShowStats(false), 5000);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastPinchRef.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    } else if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchRef.current) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setScale(prev => Math.min(3, Math.max(0.5, prev * (dist / lastPinchRef.current!))));
      lastPinchRef.current = dist;
    } else if (e.touches.length === 1 && isPanning) {
      setPan({ x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - panStart.y });
    }
  };

  const handleTouchEnd = () => { setIsPanning(false); lastPinchRef.current = null; };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.min(3, Math.max(0.5, prev - e.deltaY * 0.001)));
  };

  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  const getNodeStatus = (node: FlowNode): string => {
    if (node.status === 'offline' || node.status === 'degraded' || node.status === 'thinking') return node.status;
    if (node.id === 'connectors' && stats.apiCalls > 0) return 'active';
    if (node.id === 'scheduler' && stats.postsPublished > 0) return 'active';
    if (node.id === 'socketio' && eventsPerSec > 0) return 'active';
    return node.status;
  };

  const offlineCount = nodes.filter(n => getNodeStatus(n) === 'offline').length;
  const degradedCount = nodes.filter(n => getNodeStatus(n) === 'degraded').length;
  const systemHealthy = offlineCount === 0 && degradedCount === 0;

  return (
    <div className={cn(
      "flex flex-col gap-3",
      isFullscreen ? "fixed inset-0 z-50 bg-brand-bg p-4" : "w-full"
    )}>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
            <Network className="w-4 h-4 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Data Flow Visualizer</h1>
            <p className="text-[9px] text-brand-text-muted font-mono">REAL-TIME SYSTEM TOPOLOGY</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-brand-text-muted">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />LIVE</span>
            <span>{eventsPerSec}/s</span>
            <span className="text-brand-primary font-bold">{totalEvents.toLocaleString()}</span>
          </div>
          <button onClick={resetView} className="p-1.5 rounded-lg bg-brand-elevated border border-brand-border text-brand-text-muted hover:text-white transition-colors" title="Reset view">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 rounded-lg bg-brand-elevated border border-brand-border text-brand-text-muted hover:text-white transition-colors">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {[
          { label: 'Events', value: totalEvents.toLocaleString(), icon: Activity, color: 'text-brand-primary' },
          { label: 'API Calls', value: stats.apiCalls?.toLocaleString() || '0', icon: Zap, color: 'text-yellow-400' },
          { label: 'Failures', value: failureEvents, icon: AlertTriangle, color: 'text-red-400' },
        ].map(card => (
          <div key={card.label} className="bg-brand-surface border border-brand-border rounded-xl p-2.5">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] text-brand-text-muted uppercase font-mono">{card.label}</span>
              <card.icon className={cn("w-3 h-3", card.color)} />
            </div>
            <div className={cn("text-lg font-mono font-bold", card.color)}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Topology Map */}
      <div className="relative flex-1 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden min-h-[350px]">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        {/* Search */}
        <div className="absolute top-3 right-3 z-30">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-text-muted" />
            <input type="text" placeholder="Search nodes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-36 bg-brand-elevated/90 backdrop-blur-sm border border-brand-border rounded-lg pl-7 pr-2 py-1.5 text-[10px] text-brand-text font-mono focus:outline-none focus:border-brand-primary/50" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-brand-text-muted hover:text-brand-text" />
              </button>
            )}
          </div>
        </div>

        {/* Failure overlay */}
        {!systemHealthy && (
          <motion.div className="absolute inset-0 pointer-events-none"
            animate={{ boxShadow: ['inset 0 0 0px rgba(239,68,68,0)', 'inset 0 0 30px rgba(239,68,68,0.1)', 'inset 0 0 0px rgba(239,68,68,0)'] }}
            transition={{ duration: 3, repeat: Infinity }} />
        )}

        {/* SVG Edges + Packets + Sparks */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'center' }}>
          {edges.map(edge => {
            const fn = nodes.find(n => n.id === edge.from);
            const tn = nodes.find(n => n.id === edge.to);
            if (!fn || !tn) return null;
            const fs = getNodeStatus(fn), ts = getNodeStatus(tn);
            const failed = fs === 'offline' || ts === 'offline';
            const degraded = fs === 'degraded' || ts === 'degraded';
            const wf = edge.from === 'scheduler' && edge.to === 'connectors' && workflowActive;
            return (
              <g key={`${edge.from}-${edge.to}`}>
                <line x1={`${fn.x}%`} y1={`${fn.y}%`} x2={`${tn.x}%`} y2={`${tn.y}%`}
                  stroke={failed ? '#ef4444' : degraded ? '#f59e0b' : wf ? '#3b82f6' : '#374151'}
                  strokeWidth={failed || wf ? '2' : '1'} strokeDasharray={failed ? '5 3' : 'none'}
                  opacity={failed ? 0.6 : wf ? 0.9 : 0.4} />
                {wf && <motion.circle r="6" fill="#3b82f6" opacity={0.12}
                  animate={{ cx: [`${fn.x}%`, `${tn.x}%`], cy: [`${fn.y}%`, `${tn.y}%`] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />}
                {edge.packets.map(p => (
                  <motion.circle key={p.id} r={p.isError ? 4 : 2.5} fill={p.isError ? '#ef4444' : wf ? '#60a5fa' : '#6366f1'}
                    opacity={p.opacity} animate={{ cx: [`${fn.x}%`, `${tn.x}%`], cy: [`${fn.y}%`, `${tn.y}%`] }}
                    transition={{ duration: p.isError ? 0.3 : 0.5, ease: 'linear' }} />
                ))}
              </g>
            );
          })}
          {sparks.map(s => <motion.circle key={s.id} r={s.size} fill={s.color} opacity={s.life} cx={`${s.x}%`} cy={`${s.y}%`} />)}
        </svg>

        {/* Touch overlay */}
        <div ref={containerRef} className="absolute inset-0 z-10"
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onWheel={handleWheel} />

        {/* Nodes */}
        {nodes.map(node => {
          const Icon = node.icon;
          const status = getNodeStatus(node);
          const color = STATUS_COLORS[status];
          const isHovered = hoveredNode === node.id;
          const isHighlighted = highlightedNode === node.id;

          return (
            <motion.div key={node.id}
              className="absolute flex flex-col items-center gap-0.5 pointer-events-auto z-20"
              style={{ left: `${node.x}%`, top: `${node.y}%`, transform: `translate(-50%, -50%) scale(${scale})`, opacity: highlightedNode && !isHighlighted ? 0.25 : 1 }}
              animate={{ scale: status === 'active' || status === 'thinking' ? [1, 1.08, 1] : status === 'offline' ? [1, 0.96, 1] : 1 }}
              transition={{ duration: status === 'thinking' ? 0.8 : 1.5, repeat: Infinity }}
              onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}
              onClick={() => { setSearchQuery(node.label); setHighlightedNode(node.id); }}>
              {status === 'thinking' && <motion.div className="absolute inset-0 rounded-full" style={{ border: '2px solid #a855f7' }} animate={{ scale: [1, 2.5], opacity: [0.5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />}
              {status === 'active' && <motion.div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${color}` }} animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />}
              {status === 'offline' && <motion.div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${color}` }} animate={{ scale: [1, 1.4], opacity: [0.7, 0] }} transition={{ duration: 2, repeat: Infinity }} />}
              {isHighlighted && <motion.div className="absolute -inset-2 rounded-full" style={{ border: '2px solid #f59e0b' }} animate={{ scale: [1, 1.15, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />}
              {node.recoveredAt && Date.now() - node.recoveredAt < 3000 && <motion.div className="absolute inset-0 rounded-full bg-green-400/30" animate={{ scale: [0, 2], opacity: [1, 0] }} transition={{ duration: 1.5 }} />}
              <motion.div className="p-2.5 rounded-xl cursor-pointer transition-all"
                style={{ backgroundColor: `${color}18`, border: `1.5px solid ${color}50`, boxShadow: status === 'offline' ? `0 0 14px ${color}40` : status === 'thinking' ? `0 0 18px #a855f740` : isHighlighted ? `0 0 16px #f59e0b40` : undefined, backdropFilter: 'blur(4px)' }}
                whileHover={{ scale: 1.2 }} title={`${node.label}: ${STATUS_LABELS[status]}${node.failureReason ? ` — ${node.failureReason}` : ''}`}>
                <Icon className="w-4 h-4" style={{ color }} />
              </motion.div>
              <span className="text-[8px] font-mono font-bold uppercase text-brand-text-muted text-center leading-tight max-w-[60px]">{node.label}</span>
              <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}
                animate={{ opacity: status === 'active' || status === 'thinking' ? [1, 0.3, 1] : status === 'offline' ? [1, 0.5, 1] : 1 }}
                transition={{ duration: status === 'offline' ? 0.5 : 1, repeat: Infinity }} />
              <AnimatePresence>
                {isHovered && (
                  <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute bottom-full mb-2 bg-brand-elevated/80 backdrop-blur-md border border-brand-border/50 rounded-xl px-3 py-2.5 shadow-2xl whitespace-nowrap z-50">
                    <p className="text-xs font-bold text-white">{node.label}</p>
                    <p className="text-[10px] font-mono" style={{ color }}>{STATUS_LABELS[status]}</p>
                    {node.failureReason && <p className="text-[9px] text-red-400 mt-1 max-w-[180px] whitespace-normal">{node.failureReason}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Minimap */}
        <div className="absolute bottom-10 right-3 w-24 h-16 bg-brand-elevated/80 backdrop-blur-sm border border-brand-border/50 rounded-lg overflow-hidden z-20 opacity-50 hover:opacity-100 transition-opacity">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {EDGES.map(([from, to]) => {
              const fn = NODE_LAYOUT.find(n => n.id === from);
              const tn = NODE_LAYOUT.find(n => n.id === to);
              if (!fn || !tn) return null;
              return <line key={`${from}-${to}`} x1={fn.x} y1={fn.y} x2={tn.x} y2={tn.y} stroke="#374151" strokeWidth="0.5" />;
            })}
            {nodes.map(node => <circle key={node.id} cx={node.x} cy={node.y} r="2.5" fill={STATUS_COLORS[getNodeStatus(node)]} />)}
          </svg>
        </div>

        {/* Collapsible Stats Pill */}
        <div className="absolute bottom-2 right-2 z-30">
          <AnimatePresence mode="wait">
            {showStats ? (
              <motion.div key="expanded" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-3 bg-brand-elevated/95 backdrop-blur-sm border border-brand-border rounded-lg px-3 py-1.5 text-[10px] font-mono shadow-lg"
                onMouseLeave={() => setShowStats(false)}>
                <div className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-brand-primary" /><span className="text-brand-text-muted">Events/s:</span><span className="text-brand-primary font-bold">{eventsPerSec}</span></div>
                <div className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-brand-success" /><span className="text-brand-text-muted">Total:</span><span className="text-brand-success font-bold">{totalEvents.toLocaleString()}</span></div>
                {failureEvents > 0 && <div className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-red-400" /><span className="text-red-400 font-bold">{failureEvents}</span></div>}
                {lastFailure && <span className="text-[9px] text-red-400/80 max-w-[160px] truncate hidden md:block">Last: {lastFailure}</span>}
                {workflowActive && <span className="text-[9px] text-blue-400 animate-pulse hidden md:block">⚡ Workflow</span>}
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: systemHealthy ? '#22c55e' : '#ef4444' }} />
                <span className="text-brand-text-muted uppercase">{systemHealthy ? 'Operational' : `${offlineCount} down`}</span>
              </motion.div>
            ) : (
              <motion.button key="collapsed" initial={{ opacity: 0.7 }} animate={{ opacity: 1 }}
                onClick={showStatsTemporarily}
                className="flex items-center gap-2 bg-brand-elevated/90 backdrop-blur-sm border border-brand-border/60 rounded-full px-3 py-1.5 text-[10px] font-mono text-brand-text-muted hover:text-white hover:border-brand-primary/30 transition-all shadow-lg">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: systemHealthy ? '#22c55e' : offlineCount > 0 ? '#ef4444' : '#f59e0b' }} />
                <span className="text-brand-primary font-bold">{eventsPerSec}/s</span>
                <span className="text-brand-text-muted">·</span>
                <span>{totalEvents.toLocaleString()}</span>
                {failureEvents > 0 && <><span className="text-brand-text-muted">·</span><span className="text-red-400">{failureEvents} err</span></>}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
