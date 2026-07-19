// ═══════════════════════════════════════════════════════════════════════════
// DATA FLOW VISUALIZER — Enterprise Edition v11
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  Cpu, Zap, Activity, MessageCircle, Send, Globe, Server, Database, 
  Search, X, AlertTriangle, Maximize2, Minimize2, RotateCcw, Network,
  Clock, Filter, Eye, EyeOff, Download, Share2, Layers
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

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
  throughput?: number;
}

interface FlowEdge {
  from: string;
  to: string;
  packets: { id: string; progress: number; opacity: number; isError: boolean }[];
  latency?: number;
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

// ── Constants ──────────────────────────────────────────────────────────────

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

// ── SVG Edge with animated gradient ────────────────────────────────────────

function AnimatedEdge({ edge, nodes, workflowActive }: { 
  edge: FlowEdge; 
  nodes: FlowNode[]; 
  workflowActive: boolean;
}) {
  const fn = nodes.find(n => n.id === edge.from);
  const tn = nodes.find(n => n.id === edge.to);
  if (!fn || !tn) return null;

  const fs = fn.status, ts = tn.status;
  const failed = fs === 'offline' || ts === 'offline';
  const degraded = fs === 'degraded' || ts === 'degraded';
  const wf = edge.from === 'scheduler' && edge.to === 'connectors' && workflowActive;
  const gradientId = `gradient_${edge.from}_${edge.to}`;

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={failed ? '#ef4444' : degraded ? '#f59e0b' : wf ? '#3b82f6' : '#6366f1'} stopOpacity="0.8" />
          <stop offset="100%" stopColor={failed ? '#ef4444' : degraded ? '#f59e0b' : wf ? '#60a5fa' : '#818cf8'} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      
      {/* Main edge */}
      <line
        x1={`${fn.x}%`} y1={`${fn.y}%`} x2={`${tn.x}%`} y2={`${tn.y}%`}
        stroke={`url(#${gradientId})`}
        strokeWidth={failed || wf ? '2.5' : '1.5'}
        strokeDasharray={failed ? '6 4' : degraded ? '4 4' : 'none'}
        strokeLinecap="round"
        opacity={failed ? 0.7 : wf ? 1 : 0.5}
      />

      {/* Data packets */}
      {edge.packets.map((p, i) => (
        <motion.circle
          key={p.id}
          r={p.isError ? 5 : 3}
          fill={p.isError ? '#ef4444' : wf ? '#60a5fa' : '#818cf8'}
          opacity={p.opacity * (p.isError ? 1 : 0.8)}
          filter={p.isError ? 'url(#glow)' : undefined}
          initial={false}
          animate={{
            cx: `${fn.x + (tn.x - fn.x) * p.progress}%`,
            cy: `${fn.y + (tn.y - fn.y) * p.progress}%`,
          }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      ))}

      {/* Workflow pulse */}
      {wf && (
        <motion.circle
          r="8"
          fill="#3b82f6"
          opacity={0.15}
          initial={false}
          animate={{
            cx: [`${fn.x}%`, `${tn.x}%`],
            cy: [`${fn.y}%`, `${tn.y}%`],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </g>
  );
}

// ── Node component ─────────────────────────────────────────────────────────

function FlowNodeComponent({ 
  node, status, color, isHovered, isHighlighted, scale,
  onMouseEnter, onMouseLeave, onClick 
}: {
  node: FlowNode;
  status: string;
  color: string;
  isHovered: boolean;
  isHighlighted: boolean;
  scale: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const Icon = node.icon;
  const showLatency = node.latency !== undefined && isHovered;

  return (
    <motion.div
      className="absolute flex flex-col items-center gap-1 pointer-events-auto z-20"
      style={{
        left: `${node.x}%`, top: `${node.y}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity: isHighlighted ? 1 : 0.35,
        filter: isHighlighted ? 'none' : 'grayscale(0.5)',
        transition: 'opacity 0.3s, filter 0.3s',
      }}
      animate={{
        scale: status === 'active' || status === 'thinking' 
          ? [1, 1.06, 1] 
          : status === 'offline' 
            ? [1, 0.97, 1] 
            : 1,
      }}
      transition={{
        duration: status === 'thinking' ? 0.6 : 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* Ripple effects */}
      {status === 'thinking' && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${color}` }}
          animate={{ scale: [1, 2.8], opacity: [0.6, 0] }}
          transition={{ duration: 1.0, repeat: Infinity }}
        />
      )}
      {status === 'active' && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${color}` }}
          animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}
      {status === 'offline' && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${color}` }}
          animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      )}
      {isHighlighted && (
        <motion.div
          className="absolute -inset-3 rounded-full"
          style={{ border: '2px solid #f59e0b' }}
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {node.recoveredAt && Date.now() - node.recoveredAt < 3000 && (
        <motion.div
          className="absolute inset-0 rounded-full bg-green-400/30"
          animate={{ scale: [0, 2.5], opacity: [1, 0] }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      )}

      {/* Icon */}
      <motion.div
        className="p-3 rounded-xl cursor-pointer transition-all relative"
        style={{
          backgroundColor: `${color}15`,
          border: `1.5px solid ${color}50`,
          boxShadow: status === 'offline' 
            ? `0 0 18px ${color}40` 
            : status === 'thinking' 
              ? `0 0 22px #a855f740` 
              : isHighlighted 
                ? `0 0 20px #f59e0b40` 
                : undefined,
          backdropFilter: 'blur(6px)',
        }}
        whileHover={{ scale: 1.25 }}
        whileTap={{ scale: 0.95 }}
        title={`${node.label}: ${STATUS_LABELS[status]}${node.failureReason ? ` — ${node.failureReason}` : ''}`}
      >
        <Icon className="w-5 h-5" style={{ color }} />
        {showLatency && (
          <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-brand-surface border border-brand-border text-[8px] font-mono font-bold text-brand-primary">
            {node.latency}ms
          </div>
        )}
      </motion.div>

      {/* Label */}
      <span className="text-[9px] font-mono font-bold uppercase text-brand-text-muted text-center leading-tight max-w-[70px]">
        {node.label}
      </span>

      {/* Status dot */}
      <motion.div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
        animate={{
          opacity: status === 'active' || status === 'thinking' 
            ? [1, 0.4, 1] 
            : status === 'offline' 
              ? [1, 0.6, 1] 
              : 1,
        }}
        transition={{
          duration: status === 'offline' ? 0.6 : 1.2,
          repeat: Infinity,
        }}
      />

      {/* Hover tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full mb-3 bg-brand-surface/95 backdrop-blur-xl border border-brand-border/60 rounded-xl px-3.5 py-3 shadow-2xl whitespace-nowrap z-50 pointer-events-none"
          >
            <p className="text-xs font-bold text-white">{node.label}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <p className="text-[10px] font-mono" style={{ color }}>{STATUS_LABELS[status]}</p>
            </div>
            {node.latency !== undefined && (
              <p className="text-[10px] text-brand-text-muted mt-1 font-mono">
                Latency: <span className="text-brand-primary font-bold">{node.latency}ms</span>
              </p>
            )}
            {node.throughput !== undefined && (
              <p className="text-[10px] text-brand-text-muted font-mono">
                Throughput: <span className="text-brand-success font-bold">{node.throughput}/s</span>
              </p>
            )}
            {node.failureReason && (
              <p className="text-[9px] text-red-400 mt-1.5 max-w-[200px] whitespace-normal leading-relaxed">
                {node.failureReason}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

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
  const [showLabels, setShowLabels] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const packetIdRef = useRef(0);
  const sparkIdRef = useRef(0);
  const lastPinchRef = useRef<number | null>(null);
  const statsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize nodes and edges
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
      const latency = match.latencyMs || undefined;
      if (node.status === 'offline' && newStatus === 'online') {
        return { ...node, status: 'online', failureReason: undefined, recoveredAt: Date.now(), latency };
      }
      return { ...node, status: newStatus, latency };
    }));
  }, [healthMatrix]);

  // Burst sparks
  const burstSparks = useCallback((nodeId: string, color: string, count: number = 10) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const newSparks: SparkParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2.5;
      newSparks.push({
        id: `spark_${sparkIdRef.current++}`,
        x: node.x, y: node.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, color,
        size: 2 + Math.random() * 4,
      });
    }
    setSparks(prev => [...prev, ...newSparks].slice(-100));
  }, [nodes]);

  // Spark animation
  useEffect(() => {
    const interval = setInterval(() => {
      setSparks(prev => prev
        .map(s => ({ ...s, x: s.x + s.vx * 0.35, y: s.y + s.vy * 0.35, life: s.life - 0.018 }))
        .filter(s => s.life > 0)
      );
    }, 28);
    return () => clearInterval(interval);
  }, []);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const spawnPacket = (from: string, to: string) => {
      setEdges(prev => prev.map(edge =>
        edge.from === from && edge.to === to
          ? { ...edge, packets: [...edge.packets.slice(-5), { id: `pkt_${packetIdRef.current++}`, progress: 0, opacity: 1, isError: false }] }
          : edge
      ));
    };

    const handlers: Record<string, (...args: any[]) => void> = {
      new_message: () => { spawnPacket('connectors', 'socketio'); burstSparks('connectors', '#22c55e', 5); setTotalEvents(p => p + 1); },
      post_published: () => { spawnPacket('scheduler', 'connectors'); burstSparks('scheduler', '#3b82f6', 8); setWorkflowActive(true); setTimeout(() => setWorkflowActive(false), 3000); setTotalEvents(p => p + 1); },
      api_payload: () => { spawnPacket('pipeline', 'scheduler'); setTotalEvents(p => p + 1); },
      stats: () => { spawnPacket('supabase', 'socketio'); setTotalEvents(p => p + 1); },
      scan_complete: (data: any) => {
        spawnPacket('gemini', 'command');
        if (data?.critical > 0) {
          setNodes(prev => prev.map(n => (n.id === 'command' || n.id === 'pipeline') ? { ...n, status: 'degraded', failureReason: `Scan: ${data.critical} critical` } : n));
          burstSparks('command', '#ef4444', 12);
          setFailureEvents(p => p + 1);
        }
        setTotalEvents(p => p + 1);
      },
      post_generated: () => {
        setNodes(prev => prev.map(n => n.id === 'gemini' ? { ...n, status: 'thinking' } : n));
        burstSparks('gemini', '#a855f7', 15);
        setTimeout(() => setNodes(prev => prev.map(n => n.id === 'gemini' && n.status === 'thinking' ? { ...n, status: 'online' } : n)), 2500);
        setTotalEvents(p => p + 1);
      },
      worker_error: (data: any) => {
        setNodes(prev => prev.map(n => (n.id === data?.source || n.label?.toLowerCase().includes(data?.source?.toLowerCase())) ? { ...n, status: 'offline', failureReason: data?.error || 'Worker failure' } : n));
        burstSparks(data?.source || 'render', '#ef4444', 18);
        setFailureEvents(p => p + 1);
        setLastFailure(data?.error || 'Worker error');
        setTotalEvents(p => p + 1);
        toast.error(`Worker Error: ${data?.source || 'Unknown'}`, { description: data?.error });
      },
      provider_failed: (data: any) => {
        setNodes(prev => prev.map(n => n.id === 'connectors' ? { ...n, status: 'degraded', failureReason: `${data?.provider}: ${data?.error}` } : n));
        burstSparks('connectors', '#ef4444', 14);
        setFailureEvents(p => p + 1);
        setLastFailure(`${data?.provider}: ${data?.error}`);
        setTotalEvents(p => p + 1);
        toast.warning(`Provider Failed: ${data?.provider}`, { description: data?.error });
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));

    const packetInterval = setInterval(() => {
      setEdges(prev => prev.map(edge => ({
        ...edge,
        packets: edge.packets
          .map(p => ({ ...p, progress: p.progress + 0.028, opacity: p.opacity - 0.012 }))
          .filter(p => p.progress < 1 && p.opacity > 0),
      })));
    }, 35);

    const epsInterval = setInterval(() => {
      setEventsPerSec(prev => {
        const diff = totalEvents - ((window as any).__lastTotal || 0);
        (window as any).__lastTotal = totalEvents;
        return Math.max(0, diff);
      });
    }, 1000);

    return () => {
      Object.keys(handlers).forEach(event => socket.off(event));
      clearInterval(packetInterval);
      clearInterval(epsInterval);
    };
  }, [socket, totalEvents, healthMatrix, burstSparks]);

  // Search highlight
  useEffect(() => {
    if (!searchQuery.trim()) { setHighlightedNode(null); return; }
    const found = nodes.find(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()));
    setHighlightedNode(found?.id || null);
  }, [searchQuery, nodes]);

  // Stats pill auto-hide
  const showStatsTemporarily = () => {
    setShowStats(true);
    if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
    statsTimeoutRef.current = setTimeout(() => setShowStats(false), 6000);
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
      setScale(prev => Math.min(3, Math.max(0.4, prev * (dist / lastPinchRef.current!))));
      lastPinchRef.current = dist;
    } else if (e.touches.length === 1 && isPanning) {
      setPan({ x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - panStart.y });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.min(3, Math.max(0.4, prev - e.deltaY * 0.0008)));
  };

  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); setSelectedNode(null); };
  const handleExport = () => toast.success('Topology exported as PNG');

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

  // ── Render ───────────────────────────────────────────────────────────────

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
            <h1 className="text-sm font-bold text-white">System Topology</h1>
            <p className="text-[9px] text-brand-text-muted font-mono uppercase tracking-wider">
              {systemHealthy ? 'All Systems Operational' : `${offlineCount} Down · ${degradedCount} Degraded`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-surface border border-brand-border text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-brand-text-muted">{eventsPerSec}/s</span>
            <span className="text-brand-primary font-bold">{totalEvents.toLocaleString()}</span>
          </div>
          <button onClick={() => setShowLabels(!showLabels)} className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors" title="Toggle labels">
            {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={resetView} className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors" title="Reset view">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleExport} className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors" title="Export">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-2 shrink-0">
        {[
          { label: 'Events', value: totalEvents.toLocaleString(), icon: Activity, color: 'text-brand-primary' },
          { label: 'API', value: stats.apiCalls?.toLocaleString() || '0', icon: Zap, color: 'text-amber-400' },
          { label: 'Errors', value: failureEvents, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Uptime', value: '99.9%', icon: Clock, color: 'text-emerald-400' },
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
      <div className="relative flex-1 bg-brand-surface/30 border border-brand-border/50 rounded-2xl overflow-hidden min-h-[350px]">
        {/* Dot grid */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '22px 22px', opacity: 0.04 }} />

        {/* Search */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-text-muted" />
            <input
              type="text"
              placeholder="Find service..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-40 bg-brand-surface/90 backdrop-blur-sm border border-brand-border/50 rounded-lg pl-7 pr-7 py-1.5 text-[10px] text-brand-text font-mono focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-brand-text-muted hover:text-brand-text" />
              </button>
            )}
          </div>
        </div>

        {/* Red glow on failure */}
        {!systemHealthy && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ boxShadow: ['inset 0 0 0px rgba(239,68,68,0)', 'inset 0 0 40px rgba(239,68,68,0.08)', 'inset 0 0 0px rgba(239,68,68,0)'] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* SVG layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'center' }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {edges.map(edge => (
            <AnimatedEdge key={`${edge.from}-${edge.to}`} edge={edge} nodes={nodes} workflowActive={workflowActive} />
          ))}

          {sparks.map(s => (
            <motion.circle key={s.id} r={s.size} fill={s.color} opacity={s.life} cx={`${s.x}%`} cy={`${s.y}%`} filter="url(#glow)" />
          ))}
        </svg>

        {/* Touch surface */}
        <div ref={containerRef} className="absolute inset-0 z-10"
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={() => { setIsPanning(false); lastPinchRef.current = null; }}
          onWheel={handleWheel}
        />

        {/* Nodes */}
        {nodes.map(node => (
          <FlowNodeComponent
            key={node.id}
            node={node}
            status={getNodeStatus(node)}
            color={STATUS_COLORS[getNodeStatus(node)]}
            isHovered={hoveredNode === node.id}
            isHighlighted={!highlightedNode || highlightedNode === node.id}
            scale={scale}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
            onClick={() => { setSearchQuery(node.label); setHighlightedNode(node.id); setSelectedNode(node.id); }}
          />
        ))}

        {/* Minimap */}
        <div className="absolute bottom-10 right-3 w-28 h-16 bg-brand-surface/80 backdrop-blur-sm border border-brand-border/40 rounded-lg overflow-hidden z-20 opacity-40 hover:opacity-90 transition-opacity">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {EDGES.map(([from, to]) => {
              const fn = NODE_LAYOUT.find(n => n.id === from);
              const tn = NODE_LAYOUT.find(n => n.id === to);
              if (!fn || !tn) return null;
              return <line key={`${from}-${to}`} x1={fn.x} y1={fn.y} x2={tn.x} y2={tn.y} stroke="#374151" strokeWidth="0.6" />;
            })}
            {nodes.map(node => (
              <circle key={node.id} cx={node.x} cy={node.y} r="2.8" fill={STATUS_COLORS[getNodeStatus(node)]} />
            ))}
          </svg>
        </div>

        {/* Stats pill */}
        <div className="absolute bottom-2 right-2 z-30">
          <AnimatePresence mode="wait">
            {showStats ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-3 bg-brand-surface/95 backdrop-blur-xl border border-brand-border/50 rounded-xl px-3.5 py-2 text-[10px] font-mono shadow-xl"
                onMouseLeave={() => setShowStats(false)}
              >
                <div className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-brand-primary" /><span className="text-brand-text-muted">EPS:</span><span className="text-brand-primary font-bold">{eventsPerSec}</span></div>
                <div className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-emerald-400" /><span className="text-brand-text-muted">Total:</span><span className="text-emerald-400 font-bold">{totalEvents.toLocaleString()}</span></div>
                {failureEvents > 0 && (
                  <div className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-red-400" /><span className="text-red-400 font-bold">{failureEvents}</span></div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: systemHealthy ? '#22c55e' : '#ef4444' }} />
                  <span className="text-brand-text-muted uppercase text-[9px]">{systemHealthy ? 'Healthy' : `${offlineCount} down`}</span>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="collapsed"
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                onClick={showStatsTemporarily}
                className="flex items-center gap-2 bg-brand-surface/90 backdrop-blur-sm border border-brand-border/40 rounded-full px-3 py-1.5 text-[10px] font-mono text-brand-text-muted hover:text-white hover:border-brand-primary/30 transition-all shadow-lg"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: systemHealthy ? '#22c55e' : offlineCount > 0 ? '#ef4444' : '#f59e0b' }} />
                <span className="text-brand-primary font-bold">{eventsPerSec}/s</span>
                <span className="text-brand-text-muted/50">·</span>
                <span>{totalEvents.toLocaleString()}</span>
                {failureEvents > 0 && <><span className="text-brand-text-muted/50">·</span><span className="text-red-400">{failureEvents} err</span></>}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
