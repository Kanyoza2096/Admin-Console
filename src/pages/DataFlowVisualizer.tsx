// ═══════════════════════════════════════════════════════════════════════════
// DATA FLOW VISUALIZER — Real Traffic Edition v11
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  Cpu, Zap, Activity, MessageCircle, Send, Globe, Server, Database, 
  Search, X, AlertTriangle, Maximize2, Minimize2, RotateCcw, Network,
  Clock, Eye, EyeOff, Download
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface FlowNode {
  id: string;
  label: string;
  icon: React.ElementType;
  x: number;
  y: number;
  status: 'online' | 'degraded' | 'offline' | 'active' | 'thinking';
  failureReason?: string;
  recoveredAt?: number;
  latency?: number;
}

interface TrafficPacket {
  id: string;
  progress: number;
  opacity: number;
  isError: boolean;
  latency?: number;
  method?: string;
  path?: string;
}

interface FlowEdge {
  from: string;
  to: string;
  packets: TrafficPacket[];
  totalPackets: number;
  errorPackets: number;
  avgLatency: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const NODE_LAYOUT: Omit<FlowNode, 'status'>[] = [
  { id: 'frontend',   label: 'Frontend',         icon: Globe,         x: 50,  y: 4 },
  { id: 'gemini',     label: 'Gemini AI',        icon: Cpu,           x: 50,  y: 16 },
  { id: 'pipeline',   label: 'Pipeline',         icon: Zap,           x: 50,  y: 28 },
  { id: 'render',     label: 'Render Queue',     icon: Activity,      x: 82,  y: 28 },
  { id: 'command',    label: 'Command Executor', icon: MessageCircle, x: 15,  y: 42 },
  { id: 'scheduler',  label: 'Scheduler',        icon: Send,          x: 50,  y: 42 },
  { id: 'browser',    label: 'Browser Manager',  icon: Globe,         x: 82,  y: 42 },
  { id: 'connectors', label: 'Connectors',       icon: Server,        x: 50,  y: 56 },
  { id: 'supabase',   label: 'Supabase',         icon: Database,      x: 30,  y: 72 },
  { id: 'redis',      label: 'Redis',            icon: Database,      x: 70,  y: 72 },
  { id: 'socketio',   label: 'Socket.IO',        icon: Activity,      x: 50,  y: 86 },
  { id: 'facebook',   label: 'Facebook',         icon: Globe,         x: 15,  y: 56 },
];

const EDGES: [string, string][] = [
  ['frontend', 'gemini'],
  ['frontend', 'scheduler'],
  ['frontend', 'supabase'],
  ['frontend', 'connectors'],
  ['frontend', 'command'],
  ['frontend', 'socketio'],
  ['gemini', 'pipeline'],
  ['pipeline', 'render'],
  ['pipeline', 'scheduler'],
  ['render', 'browser'],
  ['browser', 'connectors'],
  ['command', 'connectors'],
  ['scheduler', 'connectors'],
  ['facebook', 'connectors'],
  ['connectors', 'supabase'],
  ['connectors', 'redis'],
  ['connectors', 'socketio'],
  ['supabase', 'socketio'],
  ['redis', 'socketio'],
];

const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e', degraded: '#f59e0b', offline: '#ef4444', active: '#3b82f6', thinking: '#a855f7',
};

const STATUS_LABELS: Record<string, string> = {
  online: 'Healthy', degraded: 'Degraded', offline: 'Down', active: 'Active', thinking: 'Generating',
};

// ═══════════════════════════════════════════════════════════════════════════

export default function DataFlowVisualizer() {
  const { socket, healthMatrix, stats } = useStore();
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [eventsPerSec, setEventsPerSec] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [failureEvents, setFailureEvents] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const packetIdRef = useRef(0);

  // Init
  useEffect(() => {
    setNodes(NODE_LAYOUT.map(n => ({ ...n, status: 'online' })));
    setEdges(EDGES.map(([from, to]) => ({ from, to, packets: [], totalPackets: 0, errorPackets: 0, avgLatency: 0 })));
  }, []);

  // Health matrix → node status
  useEffect(() => {
    if (!healthMatrix.length) return;
    setNodes(prev => prev.map(node => {
      const match = healthMatrix.find(h => {
        const name = (h.name || '').toLowerCase();
        const id = node.id.toLowerCase();
        return name.includes(id) || id.includes(name) ||
          (id === 'gemini' && name.includes('gemini')) ||
          (id === 'browser' && name.includes('browser')) ||
          (id === 'connectors' && (name.includes('facebook') || name.includes('connector'))) ||
          (id === 'render' && name.includes('playwright')) ||
          (id === 'frontend' && name.includes('frontend'));
      });
      if (!match) return node;
      const newStatus = match.status === 'online' ? 'online' : match.status === 'degraded' ? 'degraded' : 'offline';
      if (node.status === 'offline' && newStatus === 'online') {
        return { ...node, status: 'online' as const, failureReason: undefined, recoveredAt: Date.now(), latency: match.latency };
      }
      return { ...node, status: newStatus as FlowNode['status'], latency: match.latency };
    }));
  }, [healthMatrix]);

  // ── REAL TRAFFIC HANDLER ────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleTraffic = (data: any) => {
      const { from_service, to_service, duration_ms, status, method, path, error } = data;
      
      if (!from_service || !to_service) return;

      setEdges(prev => prev.map(edge => {
        if (edge.from === from_service && edge.to === to_service) {
          const isError = (status && status >= 400) || !!error;
          const newTotal = edge.totalPackets + 1;
          const newErrors = edge.errorPackets + (isError ? 1 : 0);
          const newAvgLatency = Math.round(
            (edge.avgLatency * edge.totalPackets + (duration_ms || 0)) / newTotal
          );

          return {
            ...edge,
            packets: [...edge.packets.slice(-12), {
              id: data.id || `pkt_${packetIdRef.current++}`,
              progress: 0,
              opacity: 1,
              isError,
              latency: duration_ms,
              method,
              path,
            }],
            totalPackets: newTotal,
            errorPackets: newErrors,
            avgLatency: newAvgLatency,
          };
        }
        return edge;
      }));

      setTotalEvents(p => p + 1);
      if (isError) setFailureEvents(p => p + 1);
    };

    // Real traffic from middleware
    socket.on('traffic_packet', handleTraffic);

    // Legacy events as fallback
    const legacySpawn = (from: string, to: string, isError = false) => {
      setEdges(prev => prev.map(edge =>
        edge.from === from && edge.to === to ? {
          ...edge,
          packets: [...edge.packets.slice(-12), {
            id: `pkt_${packetIdRef.current++}`,
            progress: 0, opacity: 1, isError,
          }],
          totalPackets: edge.totalPackets + 1,
        } : edge
      ));
      setTotalEvents(p => p + 1);
      if (isError) setFailureEvents(p => p + 1);
    };

    socket.on('new_message', () => legacySpawn('connectors', 'socketio'));
    socket.on('post_published', () => legacySpawn('scheduler', 'connectors'));
    socket.on('worker_error', () => legacySpawn('render', 'connectors', true));
    socket.on('provider_failed', () => legacySpawn('connectors', 'socketio', true));

    // Packet animation
    const packetInterval = setInterval(() => {
      setEdges(prev => prev.map(edge => ({
        ...edge,
        packets: edge.packets
          .map(p => ({ ...p, progress: p.progress + 0.025, opacity: p.opacity - 0.01 }))
          .filter(p => p.progress < 1 && p.opacity > 0),
      })));
    }, 30);

    // Throughput calculation
    let lastTotal = totalEvents;
    const epsInterval = setInterval(() => {
      setEventsPerSec(prev => {
        const diff = totalEvents - lastTotal;
        lastTotal = totalEvents;
        return Math.max(0, diff);
      });
    }, 1000);

    return () => {
      socket.off('traffic_packet', handleTraffic);
      socket.off('new_message');
      socket.off('post_published');
      socket.off('worker_error');
      socket.off('provider_failed');
      clearInterval(packetInterval);
      clearInterval(epsInterval);
    };
  }, [socket, totalEvents]);

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) { setHighlightedNode(null); return; }
    const found = nodes.find(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()));
    setHighlightedNode(found?.id || null);
  }, [searchQuery, nodes]);

  const getNodeStatus = (node: FlowNode): string => {
    if (node.status === 'offline' || node.status === 'degraded' || node.status === 'thinking') return node.status;
    if (node.id === 'frontend' && totalEvents > 0) return 'active';
    if (node.id === 'connectors' && totalEvents > 0) return 'active';
    if (node.id === 'socketio' && eventsPerSec > 0) return 'active';
    return node.status;
  };

  const offlineCount = nodes.filter(n => getNodeStatus(n) === 'offline').length;
  const totalTraffic = edges.reduce((s, e) => s + e.totalPackets, 0);
  const systemHealthy = offlineCount === 0;

  // Scroll to zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.min(2.5, Math.max(0.4, prev - e.deltaY * 0.001)));
  }, []);

  const resetView = () => setScale(1);

  return (
    <div className={cn(
      "flex flex-col gap-3",
      isFullscreen ? "fixed inset-0 z-50 bg-brand-bg/95 backdrop-blur-sm p-4" : "w-full"
    )}>
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
            <Network className="w-4 h-4 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Live Traffic Topology</h1>
            <p className="text-[9px] text-brand-text-muted font-mono uppercase tracking-wider">
              {systemHealthy ? 'All Systems Operational' : `${offlineCount} Down`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-surface border border-brand-border/50 text-[10px] font-mono">
            <span className={cn('w-1.5 h-1.5 rounded-full', systemHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
            <span className="text-brand-text-muted">{eventsPerSec}/s</span>
            <span className="text-brand-primary font-bold">{totalTraffic.toLocaleString()}</span>
          </div>
          <button onClick={() => setShowLabels(!showLabels)} className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors">
            {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={resetView} className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2 shrink-0">
        {[
          { label: 'Throughput', value: `${eventsPerSec}/s`, icon: Activity, color: 'text-emerald-400' },
          { label: 'Total Traffic', value: totalTraffic.toLocaleString(), icon: Zap, color: 'text-brand-primary' },
          { label: 'Errors', value: failureEvents, icon: AlertTriangle, color: failureEvents > 0 ? 'text-red-400' : 'text-emerald-400' },
          { label: 'Edges Active', value: edges.filter(e => e.totalPackets > 0).length, icon: Network, color: 'text-sky-400' },
        ].map(card => (
          <div key={card.label} className="bg-brand-surface/50 border border-brand-border/50 rounded-xl p-2.5 hover:border-brand-border transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-brand-text-muted uppercase font-mono tracking-wider">{card.label}</span>
              <card.icon className={cn("w-3 h-3", card.color)} />
            </div>
            <div className={cn("text-base font-mono font-bold", card.color)}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Topology canvas */}
      <div ref={containerRef} onWheel={handleWheel}
        className="relative flex-1 bg-brand-surface/30 border border-brand-border/50 rounded-2xl overflow-hidden min-h-[400px]"
        style={{ cursor: scale > 1 ? 'grab' : 'default' }}>

        {/* Dot grid */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.04 }} />

        {/* Search */}
        <div className="absolute top-3 right-3 z-30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-text-muted" />
            <input type="text" placeholder="Find service..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-40 bg-brand-surface/90 backdrop-blur-sm border border-brand-border/50 rounded-lg pl-7 pr-7 py-1.5 text-[10px] text-brand-text font-mono focus:outline-none focus:border-brand-primary/50 transition-all" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-brand-text-muted hover:text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Failure glow */}
        {!systemHealthy && (
          <motion.div className="absolute inset-0 pointer-events-none"
            animate={{ boxShadow: ['inset 0 0 0px rgba(239,68,68,0)', 'inset 0 0 40px rgba(239,68,68,0.06)', 'inset 0 0 0px rgba(239,68,68,0)'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
        )}

        {/* Wrapper — SVG + Nodes scaled together */}
        <div className="absolute inset-0" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
          
          {/* SVG Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id="trafficGlow">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {edges.map(edge => {
              const fn = nodes.find(n => n.id === edge.from);
              const tn = nodes.find(n => n.id === edge.to);
              if (!fn || !tn) return null;

              const hasTraffic = edge.totalPackets > 0;
              const errorRate = edge.totalPackets > 0 ? edge.errorPackets / edge.totalPackets : 0;
              const strokeColor = errorRate > 0.3 ? '#ef4444' : hasTraffic ? '#818cf8' : '#27272a';
              const strokeW = hasTraffic ? Math.min(4, 1 + edge.totalPackets / 50) : 1;
              const opacity = hasTraffic ? Math.min(1, 0.3 + edge.totalPackets / 100) : 0.3;

              return (
                <g key={`${edge.from}-${edge.to}`}>
                  {/* Edge line */}
                  <line x1={fn.x} y1={fn.y} x2={tn.x} y2={tn.y}
                    stroke={strokeColor} strokeWidth={strokeW} opacity={opacity} strokeLinecap="round" />

                  {/* Traffic packets */}
                  {edge.packets.map(p => (
                    <motion.circle key={p.id}
                      r={p.isError ? 3 : 2}
                      fill={p.isError ? '#ef4444' : '#818cf8'}
                      opacity={p.opacity}
                      filter={p.isError ? 'url(#trafficGlow)' : undefined}
                      cx={fn.x + (tn.x - fn.x) * p.progress}
                      cy={fn.y + (tn.y - fn.y) * p.progress}
                    />
                  ))}

                  {/* Traffic volume label */}
                  {hasTraffic && (
                    <g transform={`translate(${(fn.x + tn.x) / 2}, ${(fn.y + tn.y) / 2 - 2})`}>
                      <rect x={-22} y={-8} width={44} height={14} rx={7} fill="#18181b" stroke="#27272a" strokeWidth="0.5" />
                      <text x="0" y="1.5" textAnchor="middle" fill="#a1a1aa" fontSize="6" fontFamily="monospace">
                        {edge.totalPackets} · {edge.avgLatency}ms
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* HTML Nodes */}
          {nodes.map(node => {
            const Icon = node.icon;
            const status = getNodeStatus(node);
            const color = STATUS_COLORS[status];
            const isHovered = hoveredNode === node.id;
            const isHighlighted = highlightedNode === node.id;
            const nodeEdges = edges.filter(e => e.from === node.id || e.to === node.id);
            const nodeTraffic = nodeEdges.reduce((s, e) => s + e.totalPackets, 0);

            return (
              <motion.div key={node.id}
                className="absolute flex flex-col items-center gap-0.5 pointer-events-auto z-20"
                style={{
                  left: `${node.x}%`, top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: highlightedNode && !isHighlighted ? 0.3 : 1,
                  transition: 'opacity 0.3s',
                }}
                animate={{
                  scale: status === 'active' || status === 'thinking' ? [1, 1.05, 1] : status === 'offline' ? [1, 0.97, 1] : 1,
                }}
                transition={{ duration: status === 'thinking' ? 0.6 : 1.5, repeat: Infinity, ease: 'easeInOut' }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => { setSearchQuery(node.label); setHighlightedNode(node.id); }}>

                {/* Status ripple */}
                {status === 'offline' && (
                  <motion.div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${color}` }}
                    animate={{ scale: [1, 1.5], opacity: [0.8, 0] }} transition={{ duration: 2.5, repeat: Infinity }} />
                )}

                {/* Highlight ring — only on searched node */}
                {isHighlighted && (
                  <motion.div className="absolute -inset-2 rounded-full" style={{ border: '2px solid #f59e0b' }}
                    animate={{ scale: [1, 1.15, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                )}

                {/* Icon */}
                <motion.div
                  className="p-2.5 rounded-xl cursor-pointer transition-all relative"
                  style={{
                    backgroundColor: `${color}15`,
                    border: `1.5px solid ${color}40`,
                    boxShadow: status === 'offline' ? `0 0 14px ${color}30` : undefined,
                  }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.95 }}
                  title={`${node.label}: ${STATUS_LABELS[status]}`}>
                  <Icon className="w-4 h-4" style={{ color }} />
                  {nodeTraffic > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-brand-surface border border-brand-border/50 text-[7px] font-mono font-bold text-brand-primary">
                      {nodeTraffic}
                    </div>
                  )}
                </motion.div>

                {/* Label */}
                {showLabels && (
                  <span className="text-[8px] font-mono font-bold uppercase text-brand-text-muted text-center leading-tight max-w-[65px]">
                    {node.label}
                  </span>
                )}

                {/* Status dot */}
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}60` }} />

                {/* Hover tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      className="absolute bottom-full mb-2 bg-brand-surface/95 backdrop-blur-xl border border-brand-border/60 rounded-xl px-3 py-2.5 shadow-2xl whitespace-nowrap z-50 pointer-events-none">
                      <p className="text-xs font-bold text-white">{node.label}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        <p className="text-[10px] font-mono" style={{ color }}>{STATUS_LABELS[status]}</p>
                      </div>
                      {node.latency !== undefined && (
                        <p className="text-[10px] text-brand-text-muted mt-1 font-mono">Latency: <span className="text-brand-primary font-bold">{node.latency}ms</span></p>
                      )}
                      {nodeTraffic > 0 && (
                        <p className="text-[10px] text-brand-text-muted font-mono">Traffic: <span className="text-emerald-400 font-bold">{nodeTraffic} req</span></p>
                      )}
                      {node.failureReason && (
                        <p className="text-[9px] text-red-400 mt-1 max-w-[180px] whitespace-normal leading-relaxed">{node.failureReason}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Stats bar */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-brand-surface/95 backdrop-blur-xl border border-brand-border/50 rounded-xl px-3.5 py-2 text-[10px] font-mono z-30">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-brand-primary" /><span className="text-brand-text-muted">Throughput:</span><span className="text-brand-primary font-bold">{eventsPerSec}/s</span></span>
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-emerald-400" /><span className="text-brand-text-muted">Total:</span><span className="text-emerald-400 font-bold">{totalTraffic.toLocaleString()}</span></span>
            {failureEvents > 0 && (
              <span className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-red-400" /><span className="text-red-400 font-bold">{failureEvents}</span></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: systemHealthy ? '#22c55e' : '#ef4444' }} />
            <span className="text-brand-text-muted uppercase text-[9px]">{systemHealthy ? 'Operational' : `${offlineCount} down`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
