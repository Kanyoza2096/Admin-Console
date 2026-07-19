import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  Activity, Zap, FileText, Box, BrainCircuit, Layers, MessageSquare,
  ArrowUpRight, ArrowDownRight, Sparkles, Wifi, WifiOff, TrendingUp,
  Clock, Eye, MousePointer, Cpu, HardDrive, Globe, ChevronRight,
  RefreshCw, MoreHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';
import DataFlowVisualizer from './DataFlowVisualizer';
import DigitalTwin from '../components/DigitalTwin';
import { StatCard, LiveStream, HealthMatrix, GuardianAlertsWidget } from '../components/SystemDiagnostics';

// ── Pulse dot with glow ────────────────────────────────────────────────────

const PulseDot = ({ color, size = 'sm' }: { color: string; size?: 'sm' | 'lg' }) => (
  <span className={cn('relative flex', size === 'lg' ? 'h-3 w-3' : 'h-2 w-2')}>
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-full w-full" style={{ backgroundColor: color }} />
  </span>
);

// ── Animated counter with spring physics ───────────────────────────────────

const AnimatedNumber = ({ value, duration = 800 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = React.useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const diff = value - start;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
      else prevValue.current = value;
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
};

// ── Mini sparkline (simple bar chart) ──────────────────────────────────────

const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => (
  <div className="flex items-end gap-[2px] h-8">
    {data.map((val, i) => (
      <motion.div
        key={i}
        initial={{ height: 0 }}
        animate={{ height: `${Math.max(4, (val / Math.max(...data, 1)) * 100)}%` }}
        transition={{ delay: i * 0.05, duration: 0.4, ease: 'easeOut' }}
        className="w-1 rounded-t-sm"
        style={{ backgroundColor: color, opacity: 0.6 + (val / Math.max(...data, 1)) * 0.4 }}
      />
    ))}
  </div>
);

// ── Skeleton loader for cards ──────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="rounded-2xl border border-brand-border bg-brand-surface p-4 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-3 w-20 bg-brand-elevated rounded" />
      <div className="h-4 w-4 bg-brand-elevated rounded" />
    </div>
    <div className="h-8 w-24 bg-brand-elevated rounded mb-2" />
    <div className="h-3 w-16 bg-brand-elevated rounded" />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const { stats, messages, healthMatrix, payloads, socketConnected, latencyHistory } = useStore();
  const [activeTab, setActiveTab] = useState<'topology' | 'traces'>('topology');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Auto-refresh timestamp
  useEffect(() => {
    const id = setInterval(() => setLastUpdated(new Date()), 5000);
    return () => clearInterval(id);
  }, []);

  const onlineServices = healthMatrix.filter(h => h.status === 'online').length;
  const totalServices = healthMatrix.length || 7;
  const systemHealth = totalServices > 0 ? Math.round((onlineServices / totalServices) * 100) : 100;

  // Mock sparkline data — replace with real data from your store
  const requestSparkline = useMemo(() => 
    Array.from({ length: 12 }, () => Math.floor(Math.random() * 100) + 20),
    [stats.apiCalls]
  );

  // ── KPI Cards ────────────────────────────────────────────────────────────

  const kpiCards = useMemo(() => [
    { 
      label: 'AI Requests', value: stats.apiCalls || 0, 
      icon: BrainCircuit, color: '#818cf8', gradient: 'from-violet-500/20 to-transparent',
      trend: '+14%', trendUp: true, sparkline: requestSparkline,
      detail: 'Last 12 hours',
    },
    { 
      label: 'Posts Today', value: stats.postsPublished || 0, 
      icon: FileText, color: '#34d399', gradient: 'from-emerald-500/20 to-transparent',
      trend: 'On schedule', trendUp: true,
      detail: `${stats.postsPublished || 0} published`,
    },
    { 
      label: 'Messages', value: stats.messagesToday || 0, 
      icon: Sparkles, color: '#fbbf24', gradient: 'from-amber-500/20 to-transparent',
      trend: 'Live', trendUp: true,
      detail: 'Across all platforms',
    },
    { 
      label: 'System Health', value: systemHealth, suffix: '%',
      icon: Activity, color: systemHealth > 90 ? '#34d399' : '#fbbf24',
      gradient: systemHealth > 90 ? 'from-emerald-500/20 to-transparent' : 'from-amber-500/20 to-transparent',
      trend: `${onlineServices}/${totalServices} online`, trendUp: systemHealth > 90,
      detail: `${totalServices - onlineServices} degraded`,
    },
  ], [stats, systemHealth, onlineServices, totalServices, requestSparkline]);

  // ── Activity feed ────────────────────────────────────────────────────────

  const activityFeed = useMemo(() => {
    const items: any[] = [];
    messages.slice(0, 5).forEach(m => items.push({
      type: 'message', text: m.message, time: m.time, icon: MessageSquare, color: '#818cf8'
    }));
    payloads.slice(0, 5).forEach(p => items.push({
      type: 'api', text: `${p.method} ${p.endpoint}`, time: p.time, status: p.status, icon: Zap, color: '#34d399'
    }));
    return items.sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 10);
  }, [messages, payloads]);

  // ── Quick actions ────────────────────────────────────────────────────────

  const quickActions = [
    { label: 'New Post', to: '/posts', icon: FileText, color: '#34d399' },
    { label: 'AI Chat', to: '/ai-chat', icon: BrainCircuit, color: '#818cf8' },
    { label: 'View Analytics', to: '/analytics', icon: TrendingUp, color: '#fbbf24' },
    { label: 'System Health', to: '/monitoring', icon: Activity, color: '#f472b6' },
  ];

  const navigate = useNavigate();

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-20 md:pb-0 h-full flex flex-col">
      
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">Command Center</h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20">
              <PulseDot color="#818cf8" size="sm" />
              <span className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-wider">Live</span>
            </div>
          </div>
          <p className="text-[11px] text-brand-text-muted font-mono mt-1 flex items-center gap-2">
            {socketConnected ? (
              <span className="flex items-center gap-1.5"><Wifi className="w-3 h-3 text-emerald-400" /> Connected</span>
            ) : (
              <span className="flex items-center gap-1.5"><WifiOff className="w-3 h-3 text-red-400" /> Offline</span>
            )}
            <span className="text-brand-border">·</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/analytics')}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-primary/30 text-sm font-medium text-brand-text-muted hover:text-brand-text transition-all group"
        >
          <Eye className="w-4 h-4 group-hover:text-brand-primary transition-colors" />
          Full Analytics
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="flex gap-2 overflow-x-auto shrink-0 pb-1">
        {quickActions.map(action => (
          <button
            key={action.label}
            onClick={() => navigate(action.to)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-primary/20 text-xs font-medium text-brand-text-muted hover:text-brand-text transition-all shrink-0 group"
          >
            <action.icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" style={{ color: action.color }} />
            {action.label}
          </button>
        ))}
      </div>

      {/* ═══ KPI CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative overflow-hidden rounded-2xl border border-brand-border bg-brand-surface/50 hover:bg-brand-surface/80 hover:border-brand-primary/20 transition-all duration-200 p-4 flex flex-col gap-3 group cursor-pointer"
            onClick={() => i === 0 && navigate('/api')}
          >
            {/* Gradient glow */}
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none', card.gradient)} />
            
            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-text-muted group-hover:text-brand-text transition-colors">
                {card.label}
              </span>
              <card.icon className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: card.color }} />
            </div>

            {/* Value */}
            <div className="relative z-10">
              <div className="text-2xl font-mono font-bold text-white tracking-tight">
                <AnimatedNumber value={card.value} />
                {card.suffix || ''}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                {card.trendUp ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-400 flex-shrink-0" />
                )}
                <span className="text-[10px] font-mono text-brand-text-muted truncate">{card.trend}</span>
              </div>
            </div>

            {/* Sparkline */}
            {card.sparkline && (
              <div className="relative z-10 mt-1">
                <MiniSparkline data={card.sparkline} color={card.color} />
              </div>
            )}

            {/* Detail */}
            <p className="text-[10px] text-brand-text-muted/60 relative z-10">{card.detail}</p>
          </motion.div>
        ))}
      </div>

      {/* ═══ TOPOLOGY + DIGITAL TWIN ═══ */}
      <div className="flex-1 min-h-[300px] flex flex-col">
        {/* Mobile tabs */}
        <div className="flex gap-1 mb-2 xl:hidden shrink-0">
          {['topology', 'traces'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'topology' | 'traces')}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg transition-all",
                activeTab === tab 
                  ? 'bg-brand-primary text-white shadow-glow-primary' 
                  : 'bg-brand-surface border border-brand-border text-brand-text-muted hover:text-brand-text'
              )}
            >
              {tab === 'topology' ? 'Topology' : 'Live Traces'}
            </button>
          ))}
        </div>
        
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 min-h-0">
          <div className={cn(
            "xl:col-span-2 rounded-2xl border border-brand-border bg-brand-surface/30 overflow-hidden",
            activeTab !== 'topology' ? 'hidden xl:block' : ''
          )}>
            <DataFlowVisualizer />
          </div>
          <div className={cn(
            "xl:col-span-1 rounded-2xl border border-brand-border bg-brand-surface/30 overflow-hidden",
            activeTab !== 'traces' ? 'hidden xl:block' : ''
          )}>
            <DigitalTwin />
          </div>
        </div>
      </div>

      {/* ═══ LIVE ACTIVITY TICKER ═══ */}
      <div className="shrink-0 bg-brand-surface/50 backdrop-blur-sm border border-brand-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-brand-border/50">
          <PulseDot color="#34d399" size="sm" />
          <span className="text-[10px] font-mono font-bold uppercase text-brand-text-muted tracking-widest">Live Feed</span>
          <span className="text-[10px] text-brand-text-muted/50 ml-auto font-mono">{activityFeed.length} events</span>
        </div>
        <div className="px-4 py-2.5 overflow-x-auto">
          {activityFeed.length === 0 ? (
            <div className="flex items-center gap-2 py-1">
              <RefreshCw className="w-3 h-3 text-brand-text-muted animate-spin" />
              <span className="text-[10px] text-brand-text-muted font-mono">Waiting for events...</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {activityFeed.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2 shrink-0 text-[10px] font-mono"
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-brand-text truncate max-w-[180px]">{item.text}</span>
                  {item.status && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-bold",
                      item.status < 400 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-red-500/10 text-red-400"
                    )}>
                      {item.status}
                    </span>
                  )}
                  <span className="text-brand-text-muted/50 text-[9px] tabular-nums">
                    {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

    </motion.div>
  );
}
