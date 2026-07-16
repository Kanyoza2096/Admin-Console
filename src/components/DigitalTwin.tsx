import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { Activity, Clock, AlertTriangle, Zap } from 'lucide-react';

interface TraceData {
  id: string;
  timestamp: string;
  correlation_id: string;
  step: string;
  duration_ms: number;
  metadata?: Record<string, any>;
  error?: string;
}

export default function DigitalTwin() {
  const { restEndpoint, masterToken } = useStore();
  const [traces, setTraces] = useState<TraceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  
  const base = restEndpoint?.replace(/\/+$/, '') || '';
  const headers: Record<string, string> = masterToken 
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } 
    : {};
  
  const fetchTraces = async () => {
    try {
      const res = await fetch(`${base}/traces/recent?limit=30`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTraces(data.traces || []);
      }
    } catch (err) {
      // Silently fail — traces are non-critical
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 5000);
    return () => clearInterval(interval);
  }, [restEndpoint]);
  
  const maxDuration = Math.max(...traces.map(t => t.duration_ms), 1);
  
  // Group traces by correlation_id
  const groupedTraces = traces.reduce((acc: Record<string, TraceData[]>, trace) => {
    const key = trace.correlation_id || trace.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(trace);
    return acc;
  }, {});
  
  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-primary" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Digital Twin</h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-brand-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live Traces
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="text-center text-brand-text-muted text-xs py-8">Loading traces...</div>
        ) : Object.entries(groupedTraces).length === 0 ? (
          <div className="text-center text-brand-text-muted text-xs py-8">
            Waiting for requests...
            <br />
            <span className="text-[10px]">Traces appear when API endpoints are called</span>
          </div>
        ) : (
          Object.entries(groupedTraces).map(([groupId, groupTraces]) => {
            const totalDuration = groupTraces.reduce((sum, t) => sum + t.duration_ms, 0);
            const isExpanded = selectedTrace === groupId;
            const hasError = groupTraces.some(t => t.error);
            const firstTrace = groupTraces[0];
            
            return (
              <motion.div
                key={groupId}
                layout
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-elevated/50 border border-brand-border/50 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setSelectedTrace(isExpanded ? null : groupId)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-brand-elevated/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={hasError ? 'text-red-400' : 'text-brand-primary'}>
                      {hasError ? <AlertTriangle className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-white truncate">
                        {firstTrace?.step || 'Request'}
                      </div>
                      <div className="text-[9px] text-brand-text-muted">
                        {groupTraces.length} steps • {new Date(firstTrace?.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "text-xs font-mono font-bold",
                      totalDuration > 500 ? 'text-red-400' : totalDuration > 200 ? 'text-yellow-400' : 'text-green-400'
                    )}>
                      {totalDuration}ms
                    </span>
                    <Clock className="w-3 h-3 text-brand-text-muted" />
                  </div>
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-brand-border/30"
                    >
                      {groupTraces.map((trace, i) => {
                        const widthPercent = (trace.duration_ms / maxDuration) * 100;
                        const isSlow = trace.duration_ms > 200;
                        const isVerySlow = trace.duration_ms > 500;
                        
                        return (
                          <div key={i} className="px-3 py-2 flex items-center gap-3 border-b border-brand-border/20 last:border-0">
                            <span className="text-[9px] font-mono text-brand-text-muted w-20 truncate">
                              {trace.step}
                            </span>
                            <div className="flex-1 h-2 bg-brand-elevated rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(widthPercent, 2)}%` }}
                                className={cn(
                                  "h-full rounded-full",
                                  isVerySlow ? 'bg-red-500' : isSlow ? 'bg-yellow-500' : 'bg-brand-primary'
                                )}
                              />
                            </div>
                            <span className={cn(
                              "text-[9px] font-mono font-bold w-12 text-right",
                              isVerySlow ? 'text-red-400' : isSlow ? 'text-yellow-400' : 'text-green-400'
                            )}>
                              {trace.duration_ms}ms
                            </span>
                            {trace.error && (
                              <AlertTriangle className="w-3 h-3 text-red-400" title={trace.error} />
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Total bar */}
                      <div className="px-3 py-2 flex items-center gap-3 bg-brand-elevated/30">
                        <span className="text-[9px] font-mono font-bold text-white uppercase">Total</span>
                        <div className="flex-1 h-2 bg-brand-elevated rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((totalDuration / maxDuration) * 100, 100)}%` }}
                            className="h-full rounded-full bg-white/60"
                          />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-white w-12 text-right">
                          {totalDuration}ms
                        </span>
                      </div>
                      
                      {/* Bottleneck detection */}
                      {groupTraces.length > 0 && (() => {
                        const slowest = groupTraces.reduce((a, b) => a.duration_ms > b.duration_ms ? a : b);
                        const percent = Math.round((slowest.duration_ms / totalDuration) * 100);
                        if (percent > 50) {
                          return (
                            <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/20 text-[9px] font-mono text-red-400 flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3" />
                              Bottleneck: <span className="text-white font-bold">{slowest.step}</span> takes {percent}% of total time
                            </div>
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
    </div>
  );
}
