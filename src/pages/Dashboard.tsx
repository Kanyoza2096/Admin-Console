import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  Activity, Cpu, Database, Zap, Server, MessageSquare, 
  ShieldCheck, Globe, Box, Workflow, 
  FileText, ShieldAlert, LayoutDashboard,
  Network, DollarSign, BarChart3, Sparkles,
  Hexagon, ArrowUpRight, ArrowDownRight, Layers,
  BrainCircuit
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { cn } from '../lib/utils';
import SystemArchitectureVisualizer from '../components/SystemArchitectureVisualizer';

const AnimatedNumber = ({ value, duration = 800, isCurrency = false }: { value: number; duration?: number, isCurrency?: boolean }) => {
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
  return <span>{isCurrency ? `$${display.toLocaleString()}` : display.toLocaleString()}</span>;
};

const PulseDot = ({ color, size = 'md' }: { color: string; size?: 'sm' | 'md' }) => (
  <span className={cn("relative flex", size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5')}>
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-full w-full" style={{ backgroundColor: color }} />
  </span>
);

const SpinningGlobe = () => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
    className="absolute -top-12 -right-12 opacity-[0.03] pointer-events-none"
  >
    <Hexagon className="w-64 h-64 text-brand-primary" />
  </motion.div>
);

const HealthRadial = ({ value, size = 52, strokeWidth = 4, color }: { value: number; size?: number; strokeWidth?: number; color: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-brand-elevated/50" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold font-mono" style={{ color }}>{Math.round(value)}%</span>
      </div>
    </div>
  );
};

const EnterpriseMetricCard = ({ 
  icon: Icon, label, value, trend, trendDir, status, sparklineData, color, delay = 0, isCurrency = false 
}: any) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const colorMap: Record<string, string> = {
    primary: '#4F46E5',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#06B6D4'
  };
  const hexColor = colorMap[color] || '#4F46E5';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: 'easeOut', duration: 0.5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-brand-surface border border-brand-border p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden group cursor-pointer"
    >
      {/* Background glow on hover */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 0.05 : 0 }}
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ backgroundColor: hexColor }}
      />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
            className="p-1.5 rounded-lg bg-brand-elevated/50"
            style={{ color: hexColor }}
          >
            <Icon className="w-4 h-4" />
          </motion.div>
          <span className="text-[10px] uppercase font-bold text-brand-text-muted tracking-widest">{label}</span>
        </div>
        {status && (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-brand-elevated/80 border border-brand-border" style={{ color: hexColor }}>
            {status}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between relative z-10 mt-1">
        <div>
          <div className="text-2xl font-mono font-bold tracking-tight text-white mb-1">
            <AnimatedNumber value={value} isCurrency={isCurrency} />
          </div>
          <div className={cn(
            "text-[10px] font-bold flex items-center gap-0.5",
            trendDir === 'up' ? "text-brand-success" : trendDir === 'down' ? "text-brand-danger" : "text-brand-text-muted"
          )}>
            {trendDir === 'up' && <ArrowUpRight className="w-3 h-3" />}
            {trendDir === 'down' && <ArrowDownRight className="w-3 h-3" />}
            {trendDir === 'neutral' && <span className="w-3 text-center">-</span>}
            {trend}
          </div>
        </div>
        
        {/* Mini sparkline visualization */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-16 h-8 opacity-70 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={hexColor} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={hexColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={hexColor} strokeWidth={1.5} fill={`url(#spark-${label})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Hover expansion content */}
      <AnimatePresence>
        {isHovered && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[9px] font-mono text-brand-text-muted pt-3 mt-1 border-t border-brand-border/50 overflow-hidden relative z-10"
          >
            <div className="flex justify-between items-center">
              <span>View detailed analytics</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, messages, healthMatrix, payloads, recentPosts, socketConnected } = useStore();

  const onlineServices = healthMatrix.filter(h => h.status === 'online').length;
  const totalServices = healthMatrix.length || 7;
  const systemHealth = totalServices > 0 ? Math.round((onlineServices / totalServices) * 100) : 100;

  // Real data parsing for sparklines
  const recentPayloadsCount = useMemo(() => {
    // Generate a mini sparkline based on the last 10 payloads' sizes or latencies
    if (payloads.length === 0) return Array.from({length: 10}, () => ({ value: 0 }));
    return payloads.slice(0, 10).map((p, i) => ({ value: parseInt(p.latency) || 10 + i }));
  }, [payloads]);

  const recentMessagesSparkline = useMemo(() => {
    if (messages.length === 0) return Array.from({length: 10}, () => ({ value: 0 }));
    return messages.slice(0, 10).map((m, i) => ({ value: m.message.length }));
  }, [messages]);

  const topCards = useMemo(() => [
    { 
      label: 'Active Workspaces', value: 3, trend: '+1 this week', trendDir: 'up', 
      icon: Layers, color: 'primary', status: 'Healthy', sparklineData: []
    },
    { 
      label: 'AI Requests Today', value: stats.apiCalls || 0, trend: '+14% vs yesterday', trendDir: 'up', 
      icon: BrainCircuit, color: 'accent', status: 'Scaling', sparklineData: recentPayloadsCount
    },
    { 
      label: 'Posts Published', value: stats.postsPublished || 0, trend: '-2% vs last week', trendDir: 'down', 
      icon: FileText, color: 'success', sparklineData: recentMessagesSparkline
    },
    { 
      label: 'System Health', value: systemHealth, trend: 'All nominal', trendDir: 'neutral', 
      icon: Activity, color: systemHealth > 90 ? 'success' : 'warning', status: 'Optimal'
    },
    { 
      label: 'Connected Plugins', value: 8, trend: 'Stable', trendDir: 'neutral', 
      icon: Box, color: 'warning', status: 'Active'
    },
  ], [stats, systemHealth, recentPayloadsCount, recentMessagesSparkline]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-24 md:pb-0 h-full flex flex-col">
      
      {/* ═══ TOP KPI CARDS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 shrink-0">
        {topCards.map((card, i) => (
          <EnterpriseMetricCard key={i} {...card} delay={i * 0.05} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-h-[600px]">
        {/* ═══ CENTRAL AREA: SYSTEM ARCHITECTURE ═══ */}
        <div className="xl:col-span-3 flex flex-col h-full">
          <SystemArchitectureVisualizer />
        </div>

        {/* ═══ RIGHT PANEL: LIVE AI ACTIVITY FEED ═══ */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl flex flex-col h-full overflow-hidden">
          <div className="border-b border-brand-border p-4 bg-brand-elevated/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <PulseDot color="#10B981" size="sm" />
              <h2 className="text-xs uppercase font-bold text-white tracking-widest">
                Live Activity Feed
              </h2>
            </div>
            <span className="text-[9px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded">
              REAL-TIME
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
            {messages.length === 0 && payloads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-brand-text-muted gap-2">
                <Activity className="w-6 h-6 opacity-20" />
                <span className="text-xs uppercase tracking-widest">Awaiting telemetry...</span>
              </div>
            ) : (
              <>
                {/* Interleaved feed of messages and payloads */}
                {[...messages, ...payloads]
                  .sort((a: any, b: any) => {
                    const timeA = a.time ? (typeof a.time === 'number' ? a.time : new Date(a.time).getTime()) : 0;
                    const timeB = b.time ? (typeof b.time === 'number' ? b.time : new Date(b.time).getTime()) : 0;
                    return timeB - timeA;
                  })
                  .slice(0, 30)
                  .map((item: any, i) => {
                    const isMsg = 'message' in item;
                    const timestamp = item.time ? (typeof item.time === 'number' ? item.time : new Date(item.time).getTime()) : Date.now();
                    
                    return (
                      <div key={item.id || i} className="relative overflow-hidden rounded-xl bg-brand-primary/10">
                        {/* Background action hint */}
                        <div className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-end pr-4 text-[10px] font-bold text-brand-primary tracking-widest uppercase opacity-80">
                          Share
                        </div>
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          drag="x"
                          dragConstraints={{ left: -80, right: 0 }}
                          dragElastic={0.1}
                          onDragEnd={(e, info) => {
                            if (info.offset.x < -50) {
                              import('../lib/utils').then(({ vibrate, nativeShare }) => {
                                vibrate(30);
                                nativeShare('Kanyoza Telemetry', isMsg ? item.message : `API Call: ${item.method} ${item.endpoint}`, window.location.href);
                              });
                            }
                          }}
                          className="bg-brand-elevated/90 border border-brand-border/60 rounded-xl p-3 hover:bg-brand-elevated transition-colors group relative cursor-grab active:cursor-grabbing w-full"
                        >
                          {/* Status accent line */}
                          <div className={cn(
                            "absolute left-0 top-0 bottom-0 w-0.5 pointer-events-none",
                            isMsg ? "bg-brand-primary" : "bg-brand-accent"
                          )} />

                          <div className="flex justify-between items-start mb-1.5 ml-1 pointer-events-none">
                            <span className={cn(
                              "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                              isMsg ? "bg-brand-primary/20 text-brand-primary" : "bg-brand-accent/20 text-brand-accent"
                            )}>
                              {isMsg ? 'AI Orchestration' : 'Network Payload'}
                            </span>
                            <span className="text-[9px] text-brand-text-muted">
                              {new Date(timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          
                          <div className="text-[11px] text-white/90 leading-relaxed ml-1 break-words pointer-events-none">
                            {isMsg ? item.message : `API Call: ${item.method} ${item.endpoint}`}
                          </div>

                          {!isMsg && item.latency && (
                            <div className="mt-2 ml-1 flex items-center gap-2 text-[9px] text-brand-text-muted pointer-events-none">
                              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {item.latency}ms</span>
                              <span className={cn("px-1 rounded", item.status < 400 ? "text-brand-success bg-brand-success/10" : "text-brand-danger bg-brand-danger/10")}>
                                Status: {item.status}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
