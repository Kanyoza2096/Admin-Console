import React, { useState } from 'react';
import { useStore, type HttpLog } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, CheckCircle, RefreshCw, XCircle, ChevronDown, 
  ChevronUp, Database, ShieldAlert, Activity, Key, Wifi, 
  Settings as SettingsIcon, Trash2, HelpCircle, ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

function safePathname(url: string | undefined): string {
  if (!url) return '';
  try { return url.startsWith('http') ? new URL(url).pathname : url; }
  catch { return url; }
}

export default function SystemDiagnostics() {
  const navigate = useNavigate();
  const { httpLogs, clearHttpLogs, fetchInitialData, restEndpoint, masterToken } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  const failedLogs = httpLogs.filter(log => log.error || (log.status && log.status >= 400));
  const has401 = failedLogs.some(log => log.status === 401);
  const hasConnectionError = failedLogs.some(log => !log.status || log.error?.toLowerCase().includes('fetch'));
  const lastError = failedLogs[0];

  const handleRetry = async () => {
    toast.info('Testing connection…');
    await fetchInitialData();
    toast.success('Connection test complete');
  };

  if (httpLogs.length === 0) return null;

  return (
    <div className="w-full">
      {/* ── Warning Banner ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {failedLogs.length > 0 && !isBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-500/5 border-b border-red-500/20 text-red-400 px-5 py-2.5 flex items-center justify-between gap-3 text-xs font-mono relative overflow-hidden">
            
            <div className="absolute right-0 top-0 bottom-0 w-40 bg-red-500/5 blur-2xl rounded-full pointer-events-none" />

            <div className="flex items-center gap-2.5 relative z-10 flex-1 min-w-0">
              <AlertTriangle className="w-4 h-4 animate-pulse flex-shrink-0" />
              <div className="truncate text-[10px]">
                <span className="font-bold uppercase">API Failure: </span>
                {has401 ? (
                  <span>401 on <code className="bg-red-500/10 px-1 rounded">{safePathname(lastError?.url)}</code> — check your Master Token.</span>
                ) : (
                  <span>Cannot reach <code className="bg-red-500/10 px-1 rounded">{restEndpoint}</code> — {lastError?.error || 'unreachable'}.</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10 flex-shrink-0">
              <button onClick={() => setIsOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 font-bold uppercase tracking-wider text-[9px] transition-all">
                Inspect ({failedLogs.length})
              </button>
              <button onClick={() => setIsBannerDismissed(true)}
                className="text-red-400/50 hover:text-red-400 p-0.5 transition-colors">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating trigger (banner dismissed) ─────────────────────────── */}
      {failedLogs.length > 0 && isBannerDismissed && (
        <button onClick={() => setIsOpen(true)}
          className="fixed bottom-20 left-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-red-500/20 transition-all shadow-lg backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          {failedLogs.length} Warning{failedLogs.length > 1 ? 's' : ''}
        </button>
      )}

      {/* ── Slide-out Panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />

            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-brand-surface border-l border-brand-border/50 z-[101] shadow-2xl flex flex-col font-mono">

              {/* Header */}
              <div className="p-5 border-b border-brand-border/30 flex items-center justify-between bg-brand-elevated/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
                    <Activity className="w-4 h-4 text-brand-primary" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Diagnostics</h2>
                    <p className="text-[9px] text-brand-text-muted mt-0.5">{httpLogs.length} requests logged</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted hover:text-white transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-3 gap-2 p-4 border-b border-brand-border/30 bg-brand-bg/30 shrink-0">
                <div className="bg-brand-surface/50 border border-brand-border/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] font-bold uppercase text-brand-text-muted">Network</span>
                    <Wifi className={cn('w-3.5 h-3.5', hasConnectionError ? 'text-red-400' : 'text-emerald-400')} />
                  </div>
                  <p className={cn('text-[10px] font-bold', hasConnectionError ? 'text-red-400' : 'text-emerald-400')}>
                    {hasConnectionError ? 'Failed' : 'Active'}
                  </p>
                </div>
                <div className="bg-brand-surface/50 border border-brand-border/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] font-bold uppercase text-brand-text-muted">Token</span>
                    <Key className={cn('w-3.5 h-3.5', has401 ? 'text-red-400' : masterToken ? 'text-emerald-400' : 'text-amber-400')} />
                  </div>
                  <p className={cn('text-[10px] font-bold', has401 ? 'text-red-400' : masterToken ? 'text-emerald-400' : 'text-amber-400')}>
                    {has401 ? 'Invalid' : masterToken ? 'Loaded' : 'Missing'}
                  </p>
                </div>
                <div className="bg-brand-surface/50 border border-brand-border/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] font-bold uppercase text-brand-text-muted">Errors</span>
                    <AlertTriangle className={cn('w-3.5 h-3.5', failedLogs.length > 0 ? 'text-red-400' : 'text-emerald-400')} />
                  </div>
                  <p className={cn('text-[10px] font-bold', failedLogs.length > 0 ? 'text-red-400' : 'text-emerald-400')}>
                    {failedLogs.length}
                  </p>
                </div>
              </div>

              {/* Troubleshooting */}
              {failedLogs.length > 0 && (
                <div className="px-4 py-3 border-b border-brand-border/30 bg-red-500/3 text-[10px] text-brand-text-muted leading-relaxed space-y-1.5 shrink-0">
                  <p className="font-bold text-red-400 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                    <HelpCircle className="w-3 h-3" /> Troubleshooting
                  </p>
                  {has401 && (
                    <p>• <span className="text-white font-semibold">401:</span> Verify your Master Token in <button onClick={() => { setIsOpen(false); navigate('/settings'); }} className="text-brand-primary font-bold hover:underline">Settings</button>.</p>
                  )}
                  {hasConnectionError && (
                    <p>• <span className="text-white font-semibold">Connection:</span> Server at <code className="bg-brand-elevated/50 px-1 rounded">{restEndpoint}</code> may be offline or cold-starting.</p>
                  )}
                </div>
              )}

              {/* Toolbar */}
              <div className="px-4 py-2.5 border-b border-brand-border/30 flex items-center justify-between bg-brand-elevated/5 shrink-0">
                <span className="text-[9px] text-brand-text-muted uppercase font-bold">{httpLogs.length} requests</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={handleRetry}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border/50 hover:border-brand-primary/30 text-brand-text-muted hover:text-white text-[9px] font-bold uppercase tracking-wider transition-all">
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                  <button onClick={clearHttpLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border/50 hover:border-red-500/30 text-brand-text-muted hover:text-red-400 text-[9px] font-bold uppercase tracking-wider transition-all">
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
              </div>

              {/* Log List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {httpLogs.map(log => {
                  const isFailed = log.error || (log.status && log.status >= 400);
                  const isPending = log.status === undefined;

                  return (
                    <div key={log.id} className={cn(
                      'p-3 rounded-xl border text-[10px] transition-all',
                      isFailed ? 'bg-red-500/5 border-red-500/20' : isPending ? 'bg-amber-500/5 border-amber-500/20' : 'bg-brand-surface/30 border-brand-border/30')}>
                      
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase',
                            log.method === 'GET' ? 'bg-sky-500/15 text-sky-400' :
                            log.method === 'POST' ? 'bg-emerald-500/15 text-emerald-400' :
                            'bg-zinc-500/15 text-zinc-400')}>{log.method}</span>
                          <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold font-mono',
                            isFailed ? 'bg-red-500/15 text-red-400' : isPending ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400')}>
                            {log.status ?? '...'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[8px] text-brand-text-muted">
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="bg-brand-elevated/50 px-1.5 py-0.5 rounded">{log.page === '/' ? '/dashboard' : log.page}</span>
                        </div>
                      </div>

                      <p className="text-white/80 font-mono truncate">{safePathname(log.url)}</p>

                      {log.error && (
                        <div className="mt-1.5 p-2 rounded-lg bg-black/30 text-red-400 text-[9px] font-mono leading-normal border border-red-500/10 flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span className="break-all">{log.error}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
