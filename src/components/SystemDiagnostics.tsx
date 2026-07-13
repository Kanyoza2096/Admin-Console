import React, { useState } from 'react';
import { useStore, type HttpLog } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, CheckCircle, RefreshCw, XCircle, ChevronDown, 
  ChevronUp, Database, ShieldAlert, Activity, Key, Wifi, Settings as SettingsIcon, Trash2, HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function SystemDiagnostics() {
  const navigate = useNavigate();
  const { httpLogs, clearHttpLogs, fetchInitialData, restEndpoint, masterToken } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  const failedLogs = httpLogs.filter(log => log.error || (log.status && log.status >= 400));
  const has401 = failedLogs.some(log => log.status === 401);
  const hasConnectionError = failedLogs.some(log => !log.status || log.error?.toLowerCase().includes('fetch'));

  const lastError = failedLogs[0];

  if (httpLogs.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* ── DIAGNOSTIC WARNING BANNER ── */}
      <AnimatePresence>
        {failedLogs.length > 0 && !isBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-brand-danger/10 border-b border-brand-danger/20 text-brand-danger px-6 py-2.5 flex items-center justify-between gap-4 text-xs font-mono relative overflow-hidden"
          >
            <div className="flex items-center gap-2 relative z-10 flex-1 min-w-0">
              <AlertTriangle className="w-4 h-4 text-brand-danger animate-pulse flex-shrink-0" />
              <div className="truncate">
                <span className="font-bold">API Failure Detected:</span>{' '}
                {has401 ? (
                  <span>
                    401 Unauthorized on {lastError?.method} <code className="bg-brand-danger/20 px-1 rounded">{new URL(lastError?.url || '').pathname}</code>. Check your Master Token in settings.
                  </span>
                ) : (
                  <span>
                    Failed to reach backend at <code className="bg-brand-danger/20 px-1 rounded">{restEndpoint}</code> ({lastError?.error || 'unreachable'}).
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 relative z-10 flex-shrink-0">
              <button
                onClick={() => setIsOpen(true)}
                className="px-2.5 py-1 rounded bg-brand-danger/20 text-brand-danger hover:bg-brand-danger/30 font-bold uppercase tracking-wider text-[10px] transition-colors"
              >
                Inspect Logs ({failedLogs.length})
              </button>
              <button
                onClick={() => setIsBannerDismissed(true)}
                className="text-brand-danger/60 hover:text-brand-danger p-0.5"
                title="Dismiss warning bar"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Background glowing orb */}
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-brand-danger/10 blur-xl rounded-full pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Access Floating Trigger when logs have issues and banner is dismissed */}
      {failedLogs.length > 0 && isBannerDismissed && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 left-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-danger/20 border border-brand-danger/30 text-brand-danger text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-brand-danger/30 transition-all shadow-lg backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-danger opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-danger" />
          </span>
          API Warnings ({failedLogs.length})
        </button>
      )}

      {/* ── DIAGNOSTICS CONTROL DRAWER / MODAL ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-xs"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-brand-surface border-l border-brand-border z-[101] shadow-2xl flex flex-col font-mono"
            >
              {/* Header */}
              <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-elevated/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">System Diagnostic Logs</h2>
                    <p className="text-[10px] text-brand-text-muted mt-0.5">Real-time API Traffic & Connection Monitor</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted hover:text-white transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Status Overview cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-6 border-b border-brand-border bg-brand-bg/50">
                {/* Connection Status */}
                <div className="bg-brand-surface border border-brand-border rounded-xl p-4 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold text-brand-text-muted">Network Link</span>
                    {hasConnectionError ? (
                      <Wifi className="w-4 h-4 text-brand-danger animate-pulse" />
                    ) : (
                      <Wifi className="w-4 h-4 text-brand-success" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-bold leading-none",
                    hasConnectionError ? "text-brand-danger" : "text-brand-success"
                  )}>
                    {hasConnectionError ? "Link Failed" : "Link Active"}
                  </span>
                  <span className="text-[9px] text-brand-text-muted leading-tight truncate">{restEndpoint}</span>
                </div>

                {/* Token Validation Status */}
                <div className="bg-brand-surface border border-brand-border rounded-xl p-4 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold text-brand-text-muted">Auth Token</span>
                    <Key className="w-4 h-4 text-brand-accent" />
                  </div>
                  <span className={cn(
                    "text-xs font-bold leading-none",
                    has401 ? "text-brand-danger animate-pulse" : !masterToken ? "text-brand-warning" : "text-brand-success"
                  )}>
                    {has401 ? "401 Unauthorized" : !masterToken ? "Missing Token" : "Token Loaded"}
                  </span>
                  <span className="text-[9px] text-brand-text-muted leading-tight truncate">
                    {masterToken ? `${masterToken.substring(0, 12)}...` : 'No Token in LocalStorage'}
                  </span>
                </div>

                {/* Page Errors */}
                <div className="bg-brand-surface border border-brand-border rounded-xl p-4 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold text-brand-text-muted">Error Count</span>
                    <ShieldAlert className="w-4 h-4 text-brand-danger" />
                  </div>
                  <span className={cn(
                    "text-xs font-bold leading-none",
                    failedLogs.length > 0 ? "text-brand-danger animate-bounce" : "text-brand-success"
                  )}>
                    {failedLogs.length} Page Errors
                  </span>
                  <span className="text-[9px] text-brand-text-muted leading-tight">
                    Across {new Set(failedLogs.map(l => l.page)).size} active views
                  </span>
                </div>
              </div>

              {/* Troubleshooting Tips */}
              {failedLogs.length > 0 && (
                <div className="px-6 py-4 border-b border-brand-border/50 bg-brand-danger/5 text-[11px] text-brand-text-muted leading-relaxed space-y-1.5">
                  <p className="font-bold text-brand-danger uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" /> Troubleshooting Guide:
                  </p>
                  {has401 && (
                    <p>
                      • <span className="text-white font-semibold">Fixing 401:</span> A 401 Unauthorized error means your master token or REST endpoint is invalid. Please navigate to the <button onClick={() => { setIsOpen(false); navigate('/settings'); }} className="text-brand-primary font-bold underline hover:text-white">Settings</button> page and configure a valid, active API master token.
                    </p>
                  )}
                  {hasConnectionError && (
                    <p>
                      • <span className="text-white font-semibold">Fixing Connection Issues:</span> The app cannot reach the server at <code className="bg-brand-elevated/80 px-1 rounded">{restEndpoint}</code>. Make sure the server is currently online. If it's hosted on Render, it may be cold-starting (this takes 1–2 minutes).
                    </p>
                  )}
                </div>
              )}

              {/* Toolbar */}
              <div className="px-6 py-3 border-b border-brand-border flex items-center justify-between bg-brand-elevated/10">
                <span className="text-[10px] text-brand-text-muted uppercase tracking-wider font-bold">
                  Intercepted Requests ({httpLogs.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await fetchInitialData();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-elevated border border-brand-border hover:border-brand-primary/30 text-brand-text-muted hover:text-white text-[10px] uppercase font-bold tracking-wider transition-all"
                  >
                    <RefreshCw className="w-3 h-3" /> Test & Retry Link
                  </button>
                  <button
                    onClick={clearHttpLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-elevated border border-brand-border hover:border-brand-danger/30 text-brand-text-muted hover:text-brand-danger text-[10px] uppercase font-bold tracking-wider transition-all"
                    title="Clear Request History"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Logs
                  </button>
                </div>
              </div>

              {/* Logs List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {httpLogs.map((log) => {
                  const isFailed = log.error || (log.status && log.status >= 400);
                  const isPending = log.status === undefined;
                  const cleanUrl = log.url.startsWith('http') ? new URL(log.url).pathname : log.url;

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col gap-2 transition-all",
                        isFailed 
                          ? "bg-brand-danger/5 border-brand-danger/20 hover:border-brand-danger/40" 
                          : isPending
                            ? "bg-brand-warning/5 border-brand-warning/20"
                            : "bg-brand-surface border-brand-border hover:border-brand-primary/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          {/* Method badge */}
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider",
                            log.method === 'GET' ? 'bg-brand-primary/20 text-brand-primary' :
                            log.method === 'POST' ? 'bg-brand-success/20 text-brand-success' :
                            log.method === 'PUT' ? 'bg-brand-warning/20 text-brand-warning' :
                            'bg-brand-danger/20 text-brand-danger'
                          )}>
                            {log.method}
                          </span>

                          {/* Status Badge */}
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold font-mono flex items-center gap-1",
                            isFailed ? "bg-brand-danger/25 text-brand-danger" : 
                            isPending ? "bg-brand-warning/25 text-brand-warning" : "bg-brand-success/25 text-brand-success"
                          )}>
                            {isFailed ? <XCircle className="w-2.5 h-2.5" /> : 
                             isPending ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : 
                             <CheckCircle className="w-2.5 h-2.5" />}
                            {log.status ?? 'PENDING'}
                          </span>

                          {/* Time */}
                          <span className="text-[9px] text-brand-text-muted">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {/* Page Origin */}
                        <div className="text-[10px] text-brand-text-muted flex items-center gap-1">
                          <span>Route:</span>
                          <span className="text-white bg-brand-elevated px-1.5 py-0.5 rounded font-bold">
                            {log.page === '/' ? '/dashboard' : log.page}
                          </span>
                        </div>
                      </div>

                      {/* Path */}
                      <div className="text-xs break-all font-mono text-white/90">
                        {cleanUrl}
                      </div>

                      {/* Error details */}
                      {log.error && (
                        <div className="mt-1 p-2 rounded-lg bg-black/40 text-brand-danger text-[10px] font-mono leading-normal border border-brand-danger/15 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-brand-danger" />
                          <span className="break-all">{log.error}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-4 bg-brand-elevated/40 border-t border-brand-border text-center text-[10px] text-brand-text-muted">
                Kanyoza Command System Diagnostic Console — Click "Test & Retry Link" to verify fixes.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
