import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  Activity, Zap, FileText, Box, BrainCircuit, Layers,
  ArrowUpRight, ArrowDownRight, Sparkles, Wifi, WifiOff
} from 'lucide-react';
import { cn } from '../lib/utils';
import DataFlowVisualizer from '../components/DataFlowVisualizer';

const PulseDot = ({ color }: { color: string }) => (
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-full w-full" style={{ backgroundColor: color }} />
  </span>
);

const AnimatedNumber = ({ value, duration = 600 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{display.toLocaleString()}</span>;
};

export default function Dashboard() {
  const { stats, messages, healthMatrix, payloads, socketConnected } = useStore();

  const onlineServices = healthMatrix.filter(h => h.status === 'online').length;
  const totalServices = healthMatrix.length || 7;
  const systemHealth = totalServices > 0 ? Math.round((onlineServices / totalServices) * 100) : 100;

  const kpiCards = useMemo(() => [
    { 
      label: 'AI Requests', value: stats.apiCalls || 0, 
      icon: BrainCircuit, color: '#818cf8', bg: 'bg-violet-500/10', border: 'border-violet-500/20',
      trend: '+14%', trendUp: true,
    },
    { 
      label: 'Posts Today', value: stats.postsPublished || 0, 
      icon: FileText, color: '#34d399', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
      trend: 'Active', trendUp: true,
    },
    { 
      label: 'Messages', value: stats.messagesToday || 0, 
      icon: Sparkles, color: '#fbbf24', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
      trend: 'Live', trendUp: true,
    },
    { 
      label: 'System Health', value: systemHealth, 
      icon: Activity, color: systemHealth > 90 ? '#34d399' : '#fbbf24', 
      bg: systemHealth > 90 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
      border: systemHealth > 90 ? 'border-emerald-500/20' : 'border-amber-500/20',
      trend: `${onlineServices}/${totalServices} online`, trendUp: systemHealth > 90,
      suffix: '%'
    },
  ], [stats, systemHealth, onlineServices, totalServices]);

  // Live activity feed
  const activityFeed = useMemo(() => {
    const items: any[] = [];
    messages.slice(0, 5).forEach(m => items.push({
      type: 'message', text: m.message, time: m.time, icon: MessageSquare, color: '#818cf8'
    }));
    payloads.slice(0, 5).forEach(p => items.push({
      type: 'api', text: `${p.method} ${p.endpoint}`, time: p.time, status: p.status, icon: Zap, color: '#34d399'
    }));
    return items.sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 8);
  }, [messages, payloads]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-20 md:pb-0 h-full flex flex-col">
      
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Command Center</h1>
          <p className="text-[10px] text-brand-text-muted font-mono uppercase mt-0.5">
            {socketConnected ? (
              <span className="flex items-center gap-1.5"><Wifi className="w-3 h-3 text-emerald-400" /> All Systems Connected</span>
            ) : (
              <span className="flex items-center gap-1.5"><WifiOff className="w-3 h-3 text-red-400" /> Disconnected</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <PulseDot color="#34d399" />
            <span className="text-emerald-400 font-bold uppercase">Live</span>
          </div>
        </div>
      </div>

      {/* ═══ KPI CARDS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-4 flex flex-col justify-between gap-3",
              card.bg, card.border
            )}
          >
            {/* Glow orb */}
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20 blur-xl" style={{ backgroundColor: card.color }} />
            
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/60">{card.label}</span>
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
            </div>
            
            <div className="relative z-10">
              <div className="text-2xl font-mono font-bold text-white">
                <AnimatedNumber value={card.value} />
                {card.suffix || ''}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {card.trendUp ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-400" />
                )}
                <span className="text-[10px] font-mono text-white/50">{card.trend}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ DATA FLOW VISUALIZER — CENTERPIECE ═══ */}
      <div className="flex-1 min-h-[400px]">
        <DataFlowVisualizer />
      </div>

      {/* ═══ LIVE ACTIVITY TICKER ═══ */}
      <div className="shrink-0 bg-brand-surface border border-brand-border rounded-2xl p-3 overflow-hidden">
        <div className="flex items-center gap-3 overflow-x-auto">
          <span className="text-[9px] font-mono font-bold uppercase text-brand-text-muted tracking-widest shrink-0">Live Feed</span>
          {activityFeed.length === 0 ? (
            <span className="text-[10px] text-brand-text-muted font-mono">Waiting for events...</span>
          ) : (
            activityFeed.map((item, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-white/70">
                <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate max-w-[200px]">{item.text}</span>
                {item.status && (
                  <span className={cn("text-[9px] px-1 rounded", item.status < 400 ? "text-emerald-400" : "text-red-400")}>
                    {item.status}
                  </span>
                )}
                <span className="text-white/30 text-[9px]">{new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
