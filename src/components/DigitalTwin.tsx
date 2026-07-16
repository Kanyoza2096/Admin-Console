import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { Activity, Clock, AlertTriangle, Zap, ArrowDown, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface TraceData {
  id: string;
  timestamp: string;
  correlation_id: string;
  step: string;
  duration_ms: number;
  metadata?: Record<string, any>;
  error?: string;
  status?: number;
}

export default function DigitalTwin() {
  const { restEndpoint, masterToken, socket } = useStore();
  const [traces, setTraces] = useState<TraceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [newTraceIds, setNewTraceIds] = useState<Set<string>>(new Set());
  const [pulseId, setPulseId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevTraceCount = useRef(0);
  
  const base = restEndpoint?.replace(/\/+$/, '') || '';
  const headers: Record<string, string> = masterToken 
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } 
    : {};
  
  const fetchTraces = async () => {
    try {
      const res = await fetch(`${base}/traces/recent?limit=40`, { headers });
      if (res.ok) {
        const data = await res.json();
        const newTraces = data.traces || [];
        
        // Detect new traces
        if (newTraces.length > prevTraceCount.current) {
          const freshIds = new Set<string>();
          newTraces.slice(0, newTraces.length - prevTraceCount.current).forEach((t: TraceData) => {
            freshIds.add(t.id);
          });
          setNewTraceIds(freshIds);
          
          // Pulse the latest trace
          if (newTraces.length > 0) {
            setPulseId(newTraces[0].id);
            setTimeout(() => setPulseId(null), 1500);
          }
          
          // Clear new trace highlights after animation
          setTimeout(() => setNewTraceIds(new Set()), 2000);
        }
        
        prevTraceCount.current = newTraces.length;
        setTraces(newTraces);
      }
    } catch (err) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 3000);
    return () => clearInterval(interval);
  }, [restEndpoint]);
  
  // Auto-scroll to top when new traces arrive
  useEffect(() => {
    if (listRef.current && newTraceIds.size > 0) {
      listRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [newTraceIds.size]);
  
  // Listen for real-time socket events to force immediate refresh
  useEffect(() => {
    if (!socket) return;
    const refreshEvents = ['new_message', 'post_published', 'api_payload', 'worker_error'];
    refreshEvents.forEach(event => {
      socket.on(event, () => fetchTraces());
    });
    return () => {
      refreshEvents.forEach(event => socket.off(event));
    };
  }, [socket]);
  
  const maxDuration = Math.max(...traces.map(t => t.duration_ms), 1);
  
  // Group traces by correlation_id
  const groupedTraces = traces.reduce((acc: Record<string, TraceData[]>, trace) => {
    const key = trace.correlation_id || trace.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(trace);
    return acc;
  }, {});
  
  // Calculate health metrics
  const totalRequests = traces.length;
  const avgDuration = totalRequests > 0 
    ? Math.round(traces.reduce((sum, t) => sum + t.duration_ms, 0) / totalRequests) 
    : 0;
  const errorCount = traces.filter(t => t.error || (t.status && t.status >= 400)).length;
  
  const getTraceColor = (duration_ms: number) => {
    if (duration_ms > 500) return { bar: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/20' };
    if (duration_ms > 200) return { bar: 'bg-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' };
    return { bar: 'bg-brand-primary', text: 'text-green-400', glow: 'shadow-brand-primary/20' };
  };
  
  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 h-full flex flex-col relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl rounded-full pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: loading ? 360 : 0 }}
            transition={{ repeat: loading ? Infinity : 0, duration: 2, ease: 'linear' }}
          >
            <Activity className="w-4 h-4 text-brand-primary" />
          </motion.div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Digital Twin</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini metrics */}
          <div className="hidden md:flex items-center gap-3 text-[9px] font-mono">
            <span className="text-brand-text-muted">
              <span className="text-white font-bold">{totalRequests}</span> req
            </span>
            <span className={cn(
              avgDuration > 200 ? 'text-yellow-400' : 'text-green-400'
            )}>
              <span className="font-bold">{avgDuration}ms</span> avg
            </span>
            {errorCount > 0 && (
              <span className="text-red-400">
                <span className="font-bold">{errorCount}</span> err
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <motion.span 
              className="w-1.5 h-1.5 rounded-full bg-green-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[9px] font-mono text-brand-text-muted uppercase">Live</span>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 relative z-10">
        {loading && traces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-brand-text-muted gap-3">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-8 h-8 text-brand-primary/40" />
            </motion.div>
            <span className="text-xs font-mono uppercase tracking-widest">Awaiting requests...</span>
          </div>
        ) : Object.entries(groupedTraces).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-brand-text-muted gap-3">
            <ArrowDown className="w-8 h-8 text-brand-primary/20" />
            <span className="text-xs font-mono uppercase tracking-widest">Waiting for API calls</span>
            <span className="text-[10px] font-mono">Traces appear when endpoints are hit</span>
          </div>
        ) : (
          Object.entries(groupedTraces).map(([groupId, groupTraces], groupIndex) => {
            const totalDuration = groupTraces.reduce((sum, t) => sum + t.duration_ms, 0);
            const isExpanded = selectedTrace === groupId;
            const hasError = groupTraces.some(t => t.error || (t.status && t.status >= 400));
            const firstTrace = groupTraces[0];
            const isNew = newTraceIds.has(firstTrace?.id);
            const isPulsing = pulseId === firstTrace?.id;
            const color = getTraceColor(totalDuration);
            
            // Extract a readable endpoint name
            const endpointName = firstTrace?.step?.replace('GET ', '').replace('POST ', '').replace('PUT ', '').replace('DELETE ', '') || 'Request';
            const method = firstTrace?.step?.split(' ')[0] || '';
            
            return (
              <motion.div
                key={groupId}
                layout
                initial={isNew ? { opacity: 0, x: 40, scale: 0.95 } : false}
                animate={isNew ? { opacity: 1, x: 0, scale: 1 } : isPulsing ? { 
                  boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 20px rgba(99,102,241,0.3)', '0 0 0px rgba(99,102,241,0)'] 
                } : {}}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={cn(
                  "bg-brand-elevated/30 border border-brand-border/50 rounded-xl overflow-hidden transition-all",
                  isExpanded && "border-brand-primary/30 bg-brand-elevated/50",
                  isNew && "border-brand-primary/40",
                  hasError && "border-red-500/30"
                )}
              >
                <button
                  onClick={() => setSelectedTrace(isExpanded ? null : groupId)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-brand-elevated/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Method badge */}
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0",
                      method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                      method === 'POST' ? 'bg-green-500/20 text-green-400' :
                      method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {method || 'REQ'}
                    </span>
                    
                    {/* Status indicator */}
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      hasError ? 'bg-red-400 animate-pulse' : totalDuration > 500 ? 'bg-yellow-400' : 'bg-green-400'
                    )} />
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white truncate">
                          {endpointName}
                        </span>
                        {isNew && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-[8px] font-bold px-1 py-0.5 rounded bg-brand-primary/20 text-brand-primary uppercase"
                          >
                            New
                          </motion.span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-brand-text-muted mt-0.5">
                        <span>{groupTraces.length} step{groupTraces.length > 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{new Date(firstTrace?.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Duration badge */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold",
                      totalDuration > 500 ? 'bg-red-500/10 text-red-400' : 
                      totalDuration > 200 ? 'bg-yellow-500/10 text-yellow-400' : 
                      'bg-green-500/10 text-green-400'
                    )}>
                      {totalDuration}ms
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowDown className="w-3 h-3 text-brand-text-muted" />
                    </motion.div>
                  </div>
                </button>
                
                {/* Expanded waterfall */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="border-t border-brand-border/30"
                    >
                      {groupTraces.map((trace, i) => {
                        const traceColor = getTraceColor(trace.duration_ms);
                        const widthPercent = Math.max((trace.duration_ms / maxDuration) * 100, 3);
                        
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="px-3 py-2.5 flex items-center gap-3 border-b border-brand-border/20 last:border-0 hover:bg-brand-elevated/30 transition-colors"
                          >
                            <span className="text-[9px] font-mono text-brand-text-muted w-24 truncate shrink-0">
                              {trace.step?.replace('GET ', '').replace('POST ', '').replace('PUT ', '').replace('DELETE ', '')}
                            </span>
                            <div className="flex-1 h-2 bg-brand-elevated rounded-full overflow-hidden relative">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${widthPercent}%` }}
                                transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                                className={cn(
                                  "h-full rounded-full relative",
                                  traceColor.bar
                                )}
                              >
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                              </motion.div>
                            </div>
                            <span className={cn(
                              "text-[9px] font-mono font-bold w-14 text-right shrink-0",
                              traceColor.text
                            )}>
                              {trace.duration_ms}ms
                            </span>
                            {(trace.error || (trace.status && trace.status >= 400)) && (
                              <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                            )}
                          </motion.div>
                        );
                      })}
                      
                      {/* Total bar */}
                      <div className="px-3 py-2.5 flex items-center gap-3 bg-brand-primary/5">
                        <span className="text-[9px] font-mono font-bold text-white uppercase w-24 shrink-0">Total</span>
                        <div className="flex-1 h-2.5 bg-brand-elevated rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((totalDuration / maxDuration) * 100, 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full bg-white/40"
                          />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-white w-14 text-right shrink-0">
                          {totalDuration}ms
                        </span>
                      </div>
                      
                      {/* Bottleneck callout */}
                      {groupTraces.length > 1 && (() => {
                        const slowest = groupTraces.reduce((a, b) => a.duration_ms > b.duration_ms ? a : b);
                        const percent = Math.round((slowest.duration_ms / totalDuration) * 100);
                        if (percent > 40) {
                          return (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="px-3 py-2 bg-red-500/5 border-t border-red-500/10 text-[9px] font-mono text-red-400 flex items-center gap-2"
                            >
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>
                                Bottleneck: <span className="text-white font-bold">{slowest.step?.replace('GET ', '').replace('POST ', '')}</span> takes {percent}% of time
                              </span>
                            </motion.div>
                          );
                        }
                        return null;
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
      
      {/* Footer stats */}
      <div className="mt-3 pt-3 border-t border-brand-border/50 flex items-center justify-between text-[9px] font-mono text-brand-text-muted shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <span>Traces: <span className="text-white font-bold">{totalRequests}</span></span>
          <span>Avg: <span className={cn("font-bold", avgDuration > 200 ? 'text-yellow-400' : 'text-green-400')}>{avgDuration}ms</span></span>
        </div>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Auto-refresh 3s
        </span>
      </div>
    </div>
  );
}
