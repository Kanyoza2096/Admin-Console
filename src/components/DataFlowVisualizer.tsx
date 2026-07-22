// ═══════════════════════════════════════════════════════════════════════════
// DATA FLOW VISUALIZER — v12
// Canvas-accelerated packets · bezier edges · pan+zoom · rAF animation loop
// ═══════════════════════════════════════════════════════════════════════════

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import {
  Cpu, Zap, Activity, MessageCircle, Send, Globe, Server, Database,
  Search, X, AlertTriangle, Maximize2, Minimize2, RotateCcw, Network,
  Eye, EyeOff,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

export interface FlowNode {
  id: string;
  label: string;
  icon: React.ElementType;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  status: 'online' | 'degraded' | 'offline' | 'active' | 'thinking';
  failureReason?: string;
  recoveredAt?: number;
  latency?: number;
}

interface TrafficPacket {
  id: string;
  progress: number; // 0 → 1
  opacity: number;
  isError: boolean;
  latency?: number;
  method?: string;
  path?: string;
}

interface FlowEdge {
  from: string;
  to: string;
  totalPackets: number;
  errorPackets: number;
  avgLatency: number;
}

type PacketMap = Map<string, TrafficPacket[]>;

interface ControlPoints {
  cx1: number; cy1: number;
  cx2: number; cy2: number;
}

// ── Default layouts ────────────────────────────────────────────────────────

export const DEFAULT_NODE_LAYOUT: Omit<FlowNode, 'status'>[] = [
  { id: 'frontend',   label: 'Frontend',         icon: Globe,         x: 50,  y: 4  },
  { id: 'gemini',     label: 'Gemini AI',        icon: Cpu,           x: 50,  y: 16 },
  { id: 'pipeline',   label: 'Pipeline',         icon: Zap,           x: 50,  y: 28 },
  { id: 'render',     label: 'Card Renderer',    icon: Activity,      x: 82,  y: 28 },
  { id: 'command',    label: 'Command Executor', icon: MessageCircle, x: 15,  y: 42 },
  { id: 'scheduler',  label: 'Scheduler',        icon: Send,          x: 50,  y: 42 },
  { id: 'connectors', label: 'Connectors',       icon: Server,        x: 50,  y: 56 },
  { id: 'supabase',   label: 'Supabase',         icon: Database,      x: 30,  y: 70 },
  { id: 'redis',      label: 'Redis',            icon: Database,      x: 70,  y: 70 },
  { id: 'socketio',   label: 'Socket.IO',        icon: Activity,      x: 50,  y: 82 },
  { id: 'facebook',   label: 'Facebook',         icon: Globe,         x: 15,  y: 56 },
];

export const DEFAULT_EDGES: [string, string][] = [
  ['frontend', 'gemini'],
  ['frontend', 'scheduler'],
  ['frontend', 'supabase'],
  ['frontend', 'connectors'],
  ['frontend', 'command'],
  ['frontend', 'socketio'],
  ['gemini', 'pipeline'],
  ['pipeline', 'render'],
  ['pipeline', 'scheduler'],
  ['render', 'connectors'],
  ['command', 'connectors'],
  ['scheduler', 'connectors'],
  ['facebook', 'connectors'],
  ['connectors', 'supabase'],
  ['connectors', 'redis'],
  ['connectors', 'socketio'],
  ['supabase', 'socketio'],
  ['redis', 'socketio'],
];

// ── Status maps ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  online:   '#22c55e',
  degraded: '#f59e0b',
  offline:  '#ef4444',
  active:   '#3b82f6',
  thinking: '#a855f7',
};

const STATUS_LABELS: Record<string, string> = {
  online:   'Healthy',
  degraded: 'Degraded',
  offline:  'Down',
  active:   'Active',
  thinking: 'Generating',
};

// ── Bezier helpers ─────────────────────────────────────────────────────────

function computeControlPoints(x1: number, y1: number, x2: number, y2: number): ControlPoints {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const curve = Math.min(len * 0.38, 8);
  const nx = -dy / len, ny = dx / len;
  return {
    cx1: x1 + dx * 0.35 + nx * curve * 0.5,
    cy1: y1 + dy * 0.35 + ny * curve * 0.5,
    cx2: x2 - dx * 0.35 + nx * curve * 0.5,
    cy2: y2 - dy * 0.35 + ny * curve * 0.5,
  };
}

function bezierPath(x1: number, y1: number, x2: number, y2: number, cp: ControlPoints): string {
  return `M${x1},${y1} C${cp.cx1},${cp.cy1} ${cp.cx2},${cp.cy2} ${x2},${y2}`;
}

function bezierAt(x1: number, y1: number, x2: number, y2: number, cp: ControlPoints, t: number): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * x1 + 3 * mt * mt * t * cp.cx1 + 3 * mt * t * t * cp.cx2 + t * t * t * x2,
    y: mt * mt * mt * y1 + 3 * mt * mt * t * cp.cy1 + 3 * mt * t * t * cp.cy2 + t * t * t * y2,
  };
}

// ═══════════════════════════════════════════════════════════════════════════

export interface DataFlowVisualizerProps {
  /** Override node layout (defaults to the standard Kanyoza topology) */
  nodeLayout?: Omit<FlowNode, 'status'>[];
  /** Override edge list */
  edgeList?: [string, string][];
}

export default function DataFlowVisualizer({
  nodeLayout = DEFAULT_NODE_LAYOUT,
  edgeList = DEFAULT_EDGES,
}: DataFlowVisualizerProps) {
  const { socket, healthMatrix } = useStore();

  // ── React state (only what drives DOM re-renders) ────────────────────
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [eventsPerSec, setEventsPerSec] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [failureEvents, setFailureEvents] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // ── Refs (no re-renders) ─────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const packetIdRef  = useRef(0);
  const totalEventsRef = useRef(0);
  // Packet data lives here — never in React state — so rAF can run without renders
  const packetsByEdgeRef = useRef<PacketMap>(new Map());
  // Mirror of `nodes` state for the animation loop (avoids stale closure)
  const nodesRef     = useRef<FlowNode[]>([]);
  // Pre-computed bezier control points per edge key
  const cpMapRef     = useRef<Map<string, ControlPoints>>(new Map());
  // Pan drag state
  const panRef       = useRef({ isDragging: false, startX: 0, startY: 0, basePanX: 0, basePanY: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });

  // Keep refs in sync with state
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);

  // ── Init ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const initNodes = nodeLayout.map(n => ({ ...n, status: 'online' as const }));
    setNodes(initNodes);
    nodesRef.current = initNodes;
    setEdges(edgeList.map(([from, to]) => ({
      from, to, totalPackets: 0, errorPackets: 0, avgLatency: 0,
    })));
  }, [nodeLayout, edgeList]);

  // Pre-compute bezier control points when nodes are ready
  useEffect(() => {
    if (!nodes.length) return;
    const cpMap = new Map<string, ControlPoints>();
    edgeList.forEach(([fromId, toId]) => {
      const fn = nodes.find(n => n.id === fromId);
      const tn = nodes.find(n => n.id === toId);
      if (fn && tn) cpMap.set(`${fromId}-${toId}`, computeControlPoints(fn.x, fn.y, tn.x, tn.y));
    });
    cpMapRef.current = cpMap;
  }, [nodes, edgeList]);

  // ── Health matrix → node status ───────────────────────────────────────

  useEffect(() => {
    if (!healthMatrix.length) return;
    setNodes(prev => prev.map(node => {
      const match = healthMatrix.find(h => {
        const name = (h.name || '').toLowerCase();
        const id   = node.id.toLowerCase();
        return (
          name.includes(id) || id.includes(name) ||
          (id === 'gemini'     && name.includes('gemini'))  ||
          (id === 'render'     && (name.includes('card') || name.includes('render'))) ||
          (id === 'connectors' && (name.includes('facebook') || name.includes('connector'))) ||
          (id === 'frontend'   && name.includes('frontend'))
        );
      });
      if (!match) return node;
      const newStatus =
        match.status === 'online'   ? 'online'   :
        match.status === 'degraded' ? 'degraded' : 'offline';
      if (node.status === 'offline' && newStatus === 'online') {
        return { ...node, status: 'online' as const, failureReason: undefined, recoveredAt: Date.now(), latency: match.latency };
      }
      return { ...node, status: newStatus as FlowNode['status'], latency: match.latency };
    }));
  }, [healthMatrix]);

  // ── rAF canvas animation ──────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId: number;
    let lastTime = 0;
    const dpr = window.devicePixelRatio || 1;

    const drawFrame = (time: number) => {
      rafId = requestAnimationFrame(drawFrame);

      const dt  = Math.min(time - lastTime, 50); // cap at 50ms (tab hidden, etc.)
      lastTime  = time;

      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (!W || !H) return;

      // Resize backing store to match display size
      const targetW = Math.round(W * dpr);
      const targetH = Math.round(H * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width  = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const toDelete: string[] = [];
      const speed = 0.025 * (dt / 30); // normalize to 30ms baseline

      packetsByEdgeRef.current.forEach((packets, edgeKey) => {
        const sep   = edgeKey.indexOf('-');
        const fromId = edgeKey.slice(0, sep);
        const toId   = edgeKey.slice(sep + 1);
        const fn     = nodesRef.current.find(n => n.id === fromId);
        const tn     = nodesRef.current.find(n => n.id === toId);
        if (!fn || !tn) return;

        const cp = cpMapRef.current.get(edgeKey);

        // Advance all packets in-place
        for (const p of packets) {
          p.progress = Math.min(1, p.progress + speed);
          p.opacity  = Math.max(0, 1 - p.progress * 1.3);
        }

        const alive = packets.filter(p => p.progress < 1 && p.opacity > 0.02);
        if (alive.length === 0) { toDelete.push(edgeKey); return; }
        packetsByEdgeRef.current.set(edgeKey, alive);

        for (const p of alive) {
          let px: number, py: number;
          if (cp) {
            const pt = bezierAt(fn.x, fn.y, tn.x, tn.y, cp, p.progress);
            px = (pt.x / 100) * W;
            py = (pt.y / 100) * H;
          } else {
            px = ((fn.x + (tn.x - fn.x) * p.progress) / 100) * W;
            py = ((fn.y + (tn.y - fn.y) * p.progress) / 100) * H;
          }

          const r     = p.isError ? 4 : 3;
          const color = p.isError ? '#ef4444' : '#818cf8';

          // Soft glow
          ctx.save();
          ctx.globalAlpha   = p.opacity * 0.35;
          ctx.shadowColor   = color;
          ctx.shadowBlur    = p.isError ? 14 : 9;
          ctx.beginPath();
          ctx.arc(px, py, r * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.restore();

          // Core dot
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.restore();
        }
      });

      toDelete.forEach(k => packetsByEdgeRef.current.delete(k));
      ctx.restore();
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, []); // runs once; reads from refs

  // ── Socket traffic handler ────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const spawnPacket = (fromId: string, toId: string, isError = false, meta?: Partial<TrafficPacket>) => {
      const key      = `${fromId}-${toId}`;
      const existing = packetsByEdgeRef.current.get(key) || [];
      packetsByEdgeRef.current.set(key, [
        ...existing.slice(-15),
        { id: `pkt_${packetIdRef.current++}`, progress: 0, opacity: 1, isError, ...meta },
      ]);
    };

    const handleTraffic = (data: any) => {
      const { from_service, to_service, duration_ms, status, method, path, error } = data;
      if (!from_service || !to_service) return;

      const isError = (status && status >= 400) || !!error;
      spawnPacket(from_service, to_service, isError, { latency: duration_ms, method, path });

      setEdges(prev => prev.map(edge => {
        if (edge.from !== from_service || edge.to !== to_service) return edge;
        const newTotal = edge.totalPackets + 1;
        return {
          ...edge,
          totalPackets: newTotal,
          errorPackets: edge.errorPackets + (isError ? 1 : 0),
          avgLatency:   Math.round((edge.avgLatency * edge.totalPackets + (duration_ms || 0)) / newTotal),
        };
      }));

      totalEventsRef.current += 1;
      setTotalEvents(p => p + 1);
      if (isError) setFailureEvents(p => p + 1);
    };

    socket.on('traffic_packet', handleTraffic);
    socket.on('new_message',     () => spawnPacket('connectors', 'socketio'));
    socket.on('post_published',  () => spawnPacket('scheduler',  'connectors'));
    socket.on('worker_error',    () => spawnPacket('render',     'connectors', true));
    socket.on('provider_failed', () => spawnPacket('connectors', 'socketio',   true));

    let lastTotal = 0;
    const epsInterval = setInterval(() => {
      const diff = totalEventsRef.current - lastTotal;
      lastTotal = totalEventsRef.current;
      setEventsPerSec(Math.max(0, diff));
    }, 1000);

    return () => {
      socket.off('traffic_packet', handleTraffic);
      socket.off('new_message');
      socket.off('post_published');
      socket.off('worker_error');
      socket.off('provider_failed');
      clearInterval(epsInterval);
    };
  }, [socket]);

  // ── Search ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim()) { setHighlightedNode(null); return; }
    const found = nodes.find(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()));
    setHighlightedNode(found?.id || null);
  }, [searchQuery, nodes]);

  // ── Zoom (scroll wheel) ───────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.min(2.5, Math.max(0.4, prev - e.deltaY * 0.001)));
  }, []);

  // ── Pan (mouse drag) ──────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-pan]')) return;
    panRef.current = {
      isDragging: true,
      startX:  e.clientX,
      startY:  e.clientY,
      basePanX: panOffsetRef.current.x,
      basePanY: panOffsetRef.current.y,
    };
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!panRef.current.isDragging) return;
    setPanOffset({
      x: panRef.current.basePanX + (e.clientX - panRef.current.startX),
      y: panRef.current.basePanY + (e.clientY - panRef.current.startY),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    panRef.current.isDragging = false;
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => { setScale(1); setPanOffset({ x: 0, y: 0 }); }, []);

  // ── Derived values ────────────────────────────────────────────────────

  const getNodeStatus = useCallback((node: FlowNode): string => {
    if (node.status === 'offline' || node.status === 'degraded' || node.status === 'thinking') return node.status;
    if (node.id === 'frontend'   && totalEvents > 0)    return 'active';
    if (node.id === 'connectors' && totalEvents > 0)    return 'active';
    if (node.id === 'socketio'   && eventsPerSec > 0)   return 'active';
    return node.status;
  }, [totalEvents, eventsPerSec]);

  const offlineCount  = useMemo(() => nodes.filter(n => getNodeStatus(n) === 'offline').length, [nodes, getNodeStatus]);
  const totalTraffic  = useMemo(() => edges.reduce((s, e) => s + e.totalPackets, 0), [edges]);
  const systemHealthy = offlineCount === 0;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className={cn(
      "flex flex-col gap-3",
      isFullscreen ? "fixed inset-0 z-50 bg-brand-bg/95 backdrop-blur-sm p-4" : "w-full",
    )}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
            <Network className="w-4 h-4 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Live Traffic Topology</h1>
            <p className="text-[9px] text-brand-text-muted font-mono uppercase tracking-wider">
              {systemHealthy ? 'All Systems Operational' : `${offlineCount} service${offlineCount > 1 ? 's' : ''} down`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-surface border border-brand-border/50 text-[10px] font-mono">
            <span className={cn('w-1.5 h-1.5 rounded-full', systemHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
            <span className="text-brand-text-muted">{eventsPerSec}/s</span>
            <span className="text-brand-primary font-bold">{totalTraffic.toLocaleString()}</span>
          </div>
          <button onClick={() => setShowLabels(p => !p)} title="Toggle labels"
            className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors">
            {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={resetView} title="Reset view"
            className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsFullscreen(p => !p)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 shrink-0">
        {[
          { label: 'Throughput',   value: `${eventsPerSec}/s`,                            icon: Activity,      color: 'text-emerald-400'  },
          { label: 'Total Traffic', value: totalTraffic.toLocaleString(),                  icon: Zap,           color: 'text-brand-primary' },
          { label: 'Errors',        value: failureEvents,                                  icon: AlertTriangle, color: failureEvents > 0 ? 'text-red-400' : 'text-emerald-400' },
          { label: 'Edges Active',  value: edges.filter(e => e.totalPackets > 0).length,   icon: Network,       color: 'text-sky-400'       },
        ].map(card => (
          <div key={card.label}
            className="bg-brand-surface/50 border border-brand-border/50 rounded-xl p-2.5 hover:border-brand-border transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-brand-text-muted uppercase font-mono tracking-wider">{card.label}</span>
              <card.icon className={cn('w-3 h-3', card.color)} />
            </div>
            <div className={cn('text-base font-mono font-bold', card.color)}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* ── Topology canvas ─────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative flex-1 bg-brand-surface/30 border border-brand-border/50 rounded-2xl overflow-hidden select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', minHeight: '520px' }}
      >
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.04,
        }} />

        {/* Search box */}
        <div className="absolute top-3 right-3 z-30" data-no-pan>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Find service…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onMouseDown={e => e.stopPropagation()}
              className="w-40 bg-brand-surface/90 backdrop-blur-sm border border-brand-border/50 rounded-lg pl-7 pr-7 py-1.5 text-[10px] text-brand-text font-mono focus:outline-none focus:border-brand-primary/50 transition-all"
            />
            {searchQuery && (
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Failure glow border */}
        {!systemHealthy && (
          <motion.div className="absolute inset-0 pointer-events-none rounded-2xl"
            animate={{ boxShadow: [
              'inset 0 0 0px rgba(239,68,68,0)',
              'inset 0 0 40px rgba(239,68,68,0.07)',
              'inset 0 0 0px rgba(239,68,68,0)',
            ]}}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* ── Pan + Scale wrapper ──────────────────────────────────── */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
            transformOrigin: 'center',
            paddingBottom: '36px',
            // No CSS transition while dragging — direct follow
            transition: isDragging ? 'none' : 'transform 0.12s ease-out',
          }}
        >
          {/* SVG — static edges with bezier curves + flowing dash */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="dfv-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.0" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {/* Flowing dash keyframe (active edges) */}
              <style>{`
                @keyframes dfv-flow {
                  from { stroke-dashoffset: 20; }
                  to   { stroke-dashoffset:  0; }
                }
              `}</style>
            </defs>

            {edges.map(edge => {
              const fn = nodes.find(n => n.id === edge.from);
              const tn = nodes.find(n => n.id === edge.to);
              if (!fn || !tn) return null;

              const cp = cpMapRef.current.get(`${edge.from}-${edge.to}`)
                ?? computeControlPoints(fn.x, fn.y, tn.x, tn.y);
              const d = bezierPath(fn.x, fn.y, tn.x, tn.y, cp);

              const hasTraffic  = edge.totalPackets > 0;
              const errorRate   = edge.totalPackets > 0 ? edge.errorPackets / edge.totalPackets : 0;
              const strokeColor = errorRate > 0.3 ? '#ef4444' : hasTraffic ? '#818cf8' : '#27272a';
              const strokeW     = hasTraffic ? Math.min(3.5, 1 + edge.totalPackets / 60) : 0.8;
              const opacity     = hasTraffic ? Math.min(1, 0.3 + edge.totalPackets / 100) : 0.22;

              const mx = (fn.x + tn.x) / 2;
              const my = (fn.y + tn.y) / 2 - 2.5;

              return (
                <g key={`${edge.from}-${edge.to}`}>
                  {/* Base edge */}
                  <path d={d} fill="none" stroke={strokeColor} strokeWidth={strokeW}
                    opacity={opacity} strokeLinecap="round" />

                  {/* Flowing dash overlay on active edges */}
                  {hasTraffic && (
                    <path d={d} fill="none" stroke={strokeColor}
                      strokeWidth={strokeW * 0.6} opacity={opacity * 0.55}
                      strokeLinecap="round" strokeDasharray="3 17"
                      style={{ animation: 'dfv-flow 1.4s linear infinite' }}
                    />
                  )}

                  {/* Edge label chip */}
                  {hasTraffic && (
                    <g transform={`translate(${mx},${my})`}>
                      <rect x={-21} y={-6} width={42} height={12} rx={6}
                        fill="#18181b" stroke="#27272a" strokeWidth="0.4" opacity={0.88} />
                      <text x="0" y="2.2" textAnchor="middle"
                        fill="#a1a1aa" fontSize="5.2" fontFamily="monospace">
                        {edge.totalPackets}·{edge.avgLatency}ms
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Canvas overlay — packets rendered here by rAF (zero React involvement) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          />

          {/* HTML Nodes */}
          {nodes.map(node => {
            const Icon    = node.icon;
            const status  = getNodeStatus(node);
            const color   = STATUS_COLORS[status];
            const isHov   = hoveredNode === node.id;
            const isHigh  = highlightedNode === node.id;
            const nEdges  = edges.filter(e => e.from === node.id || e.to === node.id);
            const nTraf   = nEdges.reduce((s, e) => s + e.totalPackets, 0);

            return (
              <motion.div
                key={node.id}
                data-no-pan
                className="absolute flex flex-col items-center gap-0.5 pointer-events-auto z-20"
                style={{
                  left: `${node.x}%`,
                  top:  `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: highlightedNode && !isHigh ? 0.2 : 1,
                  transition: 'opacity 0.25s',
                }}
                animate={{
                  scale: status === 'active' || status === 'thinking'
                    ? [1, 1.04, 1]
                    : status === 'offline' ? [1, 0.97, 1] : 1,
                }}
                transition={{ duration: status === 'thinking' ? 0.65 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onMouseDown={e => e.stopPropagation()}
                onClick={() => { setSearchQuery(node.label); setHighlightedNode(node.id); }}
              >
                {/* Offline expand-and-fade ring */}
                {status === 'offline' && (
                  <motion.div className="absolute inset-0 rounded-full"
                    style={{ border: `2px solid ${color}` }}
                    animate={{ scale: [1, 1.65], opacity: [0.7, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                )}

                {/* Search highlight ring */}
                {isHigh && (
                  <motion.div className="absolute -inset-2 rounded-full"
                    style={{ border: '2px solid #f59e0b' }}
                    animate={{ scale: [1, 1.14, 1], opacity: [1, 0.45, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}

                {/* Icon box */}
                <motion.div
                  className="p-2.5 rounded-xl cursor-pointer relative"
                  style={{
                    backgroundColor: `${color}15`,
                    border: `1.5px solid ${color}40`,
                    boxShadow: (status === 'offline' || status === 'active')
                      ? `0 0 18px ${color}22` : undefined,
                  }}
                  whileHover={{ scale: 1.18, boxShadow: `0 0 22px ${color}45` }}
                  whileTap={{ scale: 0.93 }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                  {nTraf > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-brand-surface border border-brand-border/50 text-[7px] font-mono font-bold text-brand-primary leading-none">
                      {nTraf}
                    </div>
                  )}
                </motion.div>

                {showLabels && (
                  <span className="text-[8px] font-mono font-bold uppercase text-brand-text-muted text-center leading-tight max-w-[65px]">
                    {node.label}
                  </span>
                )}

                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                  backgroundColor: color,
                  boxShadow: `0 0 5px ${color}55`,
                }} />

                {/* Tooltip */}
                <AnimatePresence>
                  {isHov && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.94 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full mb-2 bg-brand-surface/96 backdrop-blur-xl border border-brand-border/60 rounded-xl px-3 py-2.5 shadow-2xl whitespace-nowrap z-50 pointer-events-none"
                      style={{ left: '50%', transform: 'translateX(-50%)' }}
                    >
                      <p className="text-xs font-bold text-white">{node.label}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        <p className="text-[10px] font-mono" style={{ color }}>{STATUS_LABELS[status]}</p>
                      </div>
                      {node.latency !== undefined && (
                        <p className="text-[10px] text-brand-text-muted mt-0.5 font-mono">
                          Latency: <span className="text-brand-primary font-bold">{node.latency}ms</span>
                        </p>
                      )}
                      {nTraf > 0 && (
                        <p className="text-[10px] text-brand-text-muted font-mono">
                          Traffic: <span className="text-emerald-400 font-bold">{nTraf} req</span>
                        </p>
                      )}
                      {node.failureReason && (
                        <p className="text-[9px] text-red-400 mt-1 max-w-[190px] whitespace-normal leading-relaxed">
                          {node.failureReason}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Status bar — pinned at bottom, above the transform wrapper */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-brand-surface/96 backdrop-blur-xl border-t border-brand-border/50 px-3.5 py-2 text-[10px] font-mono z-30 pointer-events-none rounded-b-2xl">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-brand-primary" />
              <span className="text-brand-text-muted">Throughput:</span>
              <span className="text-brand-primary font-bold">{eventsPerSec}/s</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span className="text-brand-text-muted">Total:</span>
              <span className="text-emerald-400 font-bold">{totalTraffic.toLocaleString()}</span>
            </span>
            {failureEvents > 0 && (
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-red-400 font-bold">{failureEvents} err</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-brand-text-muted/40 text-[8px] uppercase tracking-wider">
              scroll to zoom · drag to pan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: systemHealthy ? '#22c55e' : '#ef4444' }} />
              <span className="text-brand-text-muted uppercase text-[9px]">
                {systemHealthy ? 'Operational' : `${offlineCount} down`}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
