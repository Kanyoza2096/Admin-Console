import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { useStore, SystemHealth, GuardianAlert } from '../store/useStore';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Activity, CheckCircle2, ServerCrash, MessageSquare, Plus, Clock, Globe, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: number;
  trendUp?: boolean;
  sparklineData?: any[];
  colorClass?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, sparklineData, colorClass }: StatCardProps) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className="h-full relative z-0">
      <div className="bg-brand-surface rounded-2xl p-5 border border-brand-border relative overflow-hidden group h-full flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className={cn('p-2 rounded-lg bg-brand-elevated border border-brand-border', colorClass)}>
            <Icon className="w-5 h-5" />
          </div>
          {trend > 0 && (
            <div className={cn('text-xs font-bold font-mono px-2 py-1 rounded-full', trendUp ? 'text-brand-success bg-brand-success/10' : 'text-brand-danger bg-brand-danger/10')}>
              {trendUp ? '↑' : '↓'} {trend}%
            </div>
          )}
        </div>

        <div className="relative z-10 mt-auto">
          <h3 className="text-[11px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">{title}</h3>
          <AnimatedNumber value={value} />
        </div>

        <div className="absolute bottom-0 left-0 w-full h-16 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Area type="monotone" dataKey="value" stroke={trendUp ? '#10B981' : '#4F46E5'} fill={trendUp ? '#10B981' : '#4F46E5'} fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const spring  = useSpring(0, { mass: 1, stiffness: 50, damping: 20 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.div className="text-4xl font-extrabold font-mono tracking-tight">{display}</motion.div>;
}

export function LiveStream() {
  const { messages, isStreamPaused, setStreamPaused } = useStore();

  return (
    <div className="bg-brand-surface rounded-2xl border border-brand-border flex flex-col h-[400px] transform-gpu">
      <div className="p-4 border-b border-brand-border flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center">
          <MessageSquare className="w-4 h-4 mr-2 text-brand-primary" />
          Live Intelligence Stream
        </h2>
        <button
          onClick={() => setStreamPaused(!isStreamPaused)}
          className="text-xs font-mono px-3 py-1 rounded-full bg-brand-elevated text-brand-text-muted hover:text-brand-text transition-colors"
        >
          {isStreamPaused ? '▶ RESUME' : '⏸ PAUSE'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-brand-text-muted space-y-2">
            <MessageSquare className="w-8 h-8 opacity-20" />
            <p className="font-mono text-xs uppercase tracking-widest opacity-50">Waiting for transmissions…</p>
          </div>
        ) : messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative z-0"
          >
            <div className={cn(
              'flex items-start space-x-3 p-3 rounded-xl border border-transparent transition-colors',
              i === 0 && !isStreamPaused
                ? 'bg-brand-primary/5 border-brand-primary/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]'
                : 'hover:bg-brand-elevated/50'
            )}>
              <img src={msg.avatar} alt="" className="w-8 h-8 rounded-full border border-brand-border" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-bold truncate">{msg.user}</span>
                  <span className="text-[10px] text-brand-text-muted font-mono">{formatDistanceToNow(msg.time)} ago</span>
                </div>
                <p className="text-xs text-brand-text-secondary truncate">{msg.message}</p>
              </div>
              <div className="text-lg">{msg.sentiment === 'positive' ? '🟢' : msg.sentiment === 'negative' ? '🔴' : '⚪'}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function HealthMatrix() {
  const { healthMatrix } = useStore();
  const overallScore = Math.round(
    healthMatrix.reduce((acc, curr) => acc + curr.uptime, 0) / Math.max(healthMatrix.length, 1)
  );

  return (
    <div className="bg-brand-surface rounded-2xl border border-brand-border p-5 flex flex-col h-full min-h-[400px]">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center mb-1">
            <Activity className="w-4 h-4 mr-2 text-brand-accent" />
            System Matrix
          </h2>
          <p className="text-xs font-mono text-brand-text-muted">GLOBAL INFRASTRUCTURE STATUS</p>
        </div>
        <div className="text-right">
          <div className={cn(
            "text-3xl font-extrabold font-mono",
            overallScore >= 99 ? "text-brand-success" : overallScore >= 95 ? "text-brand-warning" : "text-brand-danger"
          )}>{overallScore}%</div>
          <div className="text-[10px] uppercase tracking-widest text-brand-text-muted">Overall Health</div>
        </div>
      </div>

      {healthMatrix.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-brand-text-muted space-y-2">
          <Activity className="w-8 h-8 opacity-20" />
          <p className="font-mono text-xs uppercase tracking-widest opacity-50">No services monitored</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 flex-1">
          {healthMatrix.map(service => (
            <motion.div key={service.id} whileHover={{ scale: 1.03 }} className="h-full z-0 relative transform-gpu">
              <div className={cn(
                'p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-colors h-full',
                service.status === 'online'   ? 'bg-brand-success/5 border-brand-success/20 hover:border-brand-success/40' :
                service.status === 'degraded' ? 'bg-brand-warning/5 border-brand-warning/20 hover:border-brand-warning/40' :
                                                'bg-brand-danger/5 border-brand-danger/20 hover:border-brand-danger/40'
              )}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-xs truncate mr-2">{service.name}</span>
                  {service.status === 'online'   ? <CheckCircle2  className="w-4 h-4 text-brand-success" /> :
                   service.status === 'degraded' ? <AlertTriangle  className="w-4 h-4 text-brand-warning animate-pulse" /> :
                                                   <ServerCrash    className="w-4 h-4 text-brand-danger animate-bounce" />}
                </div>
                <div className="flex justify-between items-end mt-auto">
                  <span className="text-[10px] font-mono text-brand-text-muted">{service.uptime}% UP</span>
                  <span className="text-[10px] font-mono font-bold">{service.latency}ms</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RevenueTicker() {
  const { stats } = useStore();
  return (
    <div className="bg-brand-surface rounded-2xl border border-brand-border p-5 flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-success/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      <div>
        <h3 className="text-[11px] font-bold text-brand-text-muted uppercase tracking-widest mb-1">Monthly Revenue</h3>
        <div className="flex items-baseline space-x-1">
          <span className="text-xl text-brand-success font-bold">$</span>
          <AnimatedNumber value={stats.revenueMonthly} />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-brand-border">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-brand-text-muted">API Usage (Today)</span>
          <span className="font-bold text-brand-accent">{stats.apiCalls.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export function RecentPostsWidget() {
  const { recentPosts } = useStore();
  const navigate = useNavigate();

  return (
    <div className="bg-brand-surface rounded-2xl border border-brand-border p-5 flex flex-col col-span-1 lg:col-span-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center">
          <Globe className="w-4 h-4 mr-2 text-brand-primary" />
          Recent Broadcasts
        </h2>
        <button
          onClick={() => navigate('/posts')}
          className="text-xs bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-lg font-bold uppercase hover:bg-brand-primary/20 transition-colors flex items-center"
        >
          <Plus className="w-3 h-3 mr-1" /> Create
        </button>
      </div>

      {recentPosts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-brand-text-muted py-8 space-y-2">
          <Globe className="w-8 h-8 opacity-20" />
          <p className="font-mono text-xs uppercase tracking-widest opacity-50">No broadcasts yet</p>
          <button
            onClick={() => navigate('/posts')}
            className="mt-2 text-xs text-brand-primary hover:underline font-mono"
          >
            Publish your first broadcast →
          </button>
        </div>
      ) : (
        <div className="flex space-x-4 overflow-x-auto pb-2 custom-scrollbar">
          {recentPosts.map(post => (
            <motion.div key={post.id} whileHover={{ y: -2 }} className="flex-shrink-0 w-64 z-0 relative">
              <div
                onClick={() => navigate('/posts')}
                className="bg-brand-bg rounded-xl border border-brand-border overflow-hidden cursor-pointer group h-full"
              >
                <div className="h-24 overflow-hidden relative">
                  <img src={post.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-bg to-transparent" />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-brand-surface/90 text-[9px] font-bold uppercase rounded text-brand-text shadow-sm">
                    {post.platform}
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-bold text-xs truncate mb-2">{post.title}</h4>
                  <div className="flex justify-between items-center text-[10px] text-brand-text-muted font-mono">
                    <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {formatDistanceToNow(post.time)}</span>
                    <span className="flex items-center"><Activity className="w-3 h-3 mr-1" /> {post.engagement}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GuardianAlertsWidget() {
  const { guardianAlerts } = useStore();
  const navigate = useNavigate();
  const hasCritical = guardianAlerts.some(a => a.severity === 'CRITICAL');

  return (
    <div className={cn(
      'bg-brand-surface rounded-2xl border p-5 flex flex-col relative overflow-hidden transition-colors duration-1000',
      hasCritical ? 'border-brand-danger/50 shadow-[inset_0_0_50px_rgba(239,68,68,0.1)]' : 'border-brand-border'
    )}>
      {hasCritical && <div className="absolute top-0 left-0 w-full h-1 bg-brand-danger animate-pulse" />}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center">
          <ShieldAlert className={cn('w-4 h-4 mr-2', hasCritical ? 'text-brand-danger animate-bounce' : 'text-brand-text-muted')} />
          Guardian Logs
        </h2>
        {guardianAlerts.length > 0 && (
          <button
            onClick={() => navigate('/guardian')}
            className="text-[10px] font-mono text-brand-primary hover:text-brand-text transition-colors uppercase"
          >
            View all →
          </button>
        )}
      </div>

      {guardianAlerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-brand-text-muted space-y-2 py-4">
          <CheckCircle2 className="w-8 h-8 text-brand-success opacity-40" />
          <p className="font-mono text-xs uppercase tracking-widest opacity-60">All Clear</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {guardianAlerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => navigate('/guardian')}
              className="p-3 bg-brand-bg rounded-xl border border-brand-border flex items-start space-x-3 cursor-pointer hover:border-brand-border/80 hover:bg-brand-elevated/30 transition-colors"
            >
              <div className={cn(
                'w-2 h-2 rounded-full mt-1.5 flex-shrink-0 shadow-lg',
                alert.severity === 'CRITICAL' ? 'bg-brand-danger shadow-brand-danger' :
                alert.severity === 'HIGH'     ? 'bg-brand-warning shadow-brand-warning' : 'bg-brand-accent shadow-brand-accent'
              )} />
              <div>
                <p className="text-xs font-bold leading-tight mb-1">{alert.title}</p>
                <p className="text-[10px] font-mono text-brand-text-muted">{formatDistanceToNow(alert.time)} ago</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
