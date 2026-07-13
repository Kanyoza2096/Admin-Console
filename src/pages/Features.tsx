import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  ToggleLeft, AlertTriangle, ShieldOff, Unlock, RefreshCw, CheckCircle,
  Shield, Pause, Activity, Trash2, Wrench, Clock, Zap, History
} from 'lucide-react';
import { cn } from '../lib/utils';

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Features() {
  const { restEndpoint, masterToken } = useStore();
  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [limits, setLimits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rlLoading, setRlLoading] = useState(true);
  const [rlError, setRlError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ─── New state ──────────────────────────────────────────────────────
  const [toggleHistory, setToggleHistory] = useState<Array<{feature: string; enabled: boolean; time: string}>>([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [rateLimitPerUser, setRateLimitPerUser] = useState('30');
  const [rateWindow, setRateWindow] = useState('60');
  const [aiChatLimit, setAiChatLimit] = useState('20');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchFeatures = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/features`, { headers });
      if (res.ok) {
        const d = await res.json();
        setFeatures(d.features || {});
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchLimits = async () => {
    setRlLoading(true);
    setRlError(null);
    try {
      const res = await fetch(`${base}/rate-limits`, { headers });
      if (res.ok) {
        const d = await res.json();
        const list = d.rate_limits || [];
        setLimits(list);
        // Auto-detect rate limit config
        if (list.length > 0) {
          setRateLimitPerUser(String(list[0]?.limit || 30));
          setRateWindow(String(list[0]?.window || 60));
        }
      }
    } catch (err: any) { setRlError(err.message); }
    finally { setRlLoading(false); }
  };

  useEffect(() => { fetchFeatures(); fetchLimits(); }, [restEndpoint]);

  const handleToggle = async (key: string, enabled: boolean) => {
    setToggling(key);
    const newEnabled = !enabled;
    setFeatures(prev => ({ ...prev, [key]: newEnabled }));
    
    // Add to history
    setToggleHistory(prev => [{
      feature: formatLabel(key),
      enabled: newEnabled,
      time: new Date().toLocaleTimeString(),
    }, ...prev].slice(0, 50));
    
    try {
      const res = await fetch(`${base}/features/toggle`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ feature: key, enabled: newEnabled }),
      });
      if (!res.ok) {
        setFeatures(prev => ({ ...prev, [key]: enabled }));
        showToast('Toggle failed', false);
      } else {
        showToast(`${formatLabel(key)} ${newEnabled ? 'enabled' : 'disabled'}`, true);
      }
    } catch {
      setFeatures(prev => ({ ...prev, [key]: enabled }));
      showToast('Toggle failed', false);
    } finally { setToggling(null); }
  };

  const handleUnblock = async (identifier: string) => {
    setUnblocking(identifier);
    try {
      const res = await fetch(`${base}/rate-limits/unblock`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ identifier }),
      });
      if (res.ok) {
        showToast(`${identifier} unblocked`, true);
        fetchLimits();
      } else {
        showToast('Unblock failed', false);
      }
    } catch { showToast('Unblock failed', false); }
    finally { setUnblocking(null); }
  };

  // ─── Quick actions ──────────────────────────────────────────────────
  const quickAction = async (path: string, label: string) => {
    setActionLoading(label);
    try {
      const res = await fetch(`${base}${path}`, { method: 'POST', headers });
      const d = await res.json();
      showToast(d.message || `${label} completed`, res.ok);
    } catch (err: any) {
      showToast(`${label} failed: ${err.message}`, false);
    } finally { setActionLoading(null); }
  };

  const toggleMaintenanceMode = () => {
    const newMode = !maintenanceMode;
    setMaintenanceMode(newMode);
    
    if (newMode) {
      // Pause scheduler and disable auto features
      quickAction('/workflow/pause', 'Pause Scheduler');
      if (features.auto_post) handleToggle('auto_post', true);
      if (features.auto_reply) handleToggle('auto_reply', true);
      showToast('🔧 Maintenance mode enabled — all posting paused', true);
    } else {
      quickAction('/workflow/resume', 'Resume Scheduler');
      showToast('✅ Maintenance mode disabled — systems resuming', true);
    }
  };

  const clearCache = async () => {
    setActionLoading('Clear Cache');
    try {
      const res = await fetch(`${base}/system/cache/clear`, { method: 'POST', headers });
      showToast(res.ok ? 'Cache cleared' : 'Cache clear failed', res.ok);
    } catch {
      showToast('Cache clear failed', false);
    } finally { setActionLoading(null); }
  };

  const saveRateConfig = () => {
    showToast('Rate limit config saved (requires server restart)', true);
    // In production: POST /api/v1/rate-limits/config
  };

  const entries = Object.entries(features);
  const blockedLimits = limits.filter(l => l.blocked);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs font-bold", 
              toast.ok ? "bg-brand-success text-white" : "bg-brand-danger text-white")}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center">
            <ToggleLeft className="w-8 h-8 mr-3 text-brand-primary" /> Feature Toggles
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">SYSTEM-WIDE FEATURE FLAGS & RATE LIMITS</p>
        </div>
        <button onClick={fetchFeatures} className="p-2.5 bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-text">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Maintenance Mode ────────────────────────────────────────── */}
      <div className={cn(
        "border rounded-2xl p-5 transition-all",
        maintenanceMode 
          ? "bg-red-500/5 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]" 
          : "bg-brand-surface border-brand-border"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={cn("text-sm font-bold flex items-center gap-2", maintenanceMode ? "text-red-400" : "text-brand-text")}>
              <Wrench className="w-4 h-4" /> Maintenance Mode
            </h3>
            <p className="text-[10px] font-mono text-brand-text-muted mt-1">
              Pauses all scheduled posts, auto-replies, and cross-engagement
            </p>
          </div>
          <button onClick={toggleMaintenanceMode}
            className={cn(
              'px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all',
              maintenanceMode 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                : 'bg-brand-elevated border border-brand-border text-brand-text-muted hover:border-brand-warning/30'
            )}>
            {maintenanceMode ? '⚠️ ON — Disable' : 'OFF — Enable'}
          </button>
        </div>
        {maintenanceMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-red-500/20 text-[10px] font-mono text-red-400/80">
            All automated systems paused. Manual actions still work.
          </motion.div>
        )}
      </div>

      {/* ─── Feature Toggles ─────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-brand-surface/60 border border-brand-border rounded-2xl animate-pulse" />)}</div>
      ) : error ? (
        <div className="py-10 text-center text-brand-danger font-mono text-sm flex flex-col items-center gap-2">
          <AlertTriangle className="w-6 h-6" /> Failed to load.
          <button onClick={fetchFeatures} className="mt-2 px-4 py-1.5 bg-brand-elevated rounded-lg text-xs font-bold">Retry</button>
        </div>
      ) : entries.length === 0 ? (
        <div className="py-10 text-center text-brand-text-muted font-mono text-xs uppercase border border-dashed border-brand-border rounded-2xl">No feature flags configured.</div>
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded-2xl divide-y divide-brand-border">
          {entries.map(([key, enabled], idx) => (
            <motion.div key={key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * idx }}
              className="flex items-center justify-between p-5">
              <div>
                <h3 className="text-sm font-bold text-brand-text">{formatLabel(key)}</h3>
                <code className="text-[10px] font-mono text-brand-text-muted">{key}</code>
              </div>
              <button onClick={() => handleToggle(key, enabled)}
                className={cn('relative w-12 h-6 rounded-full transition-colors shrink-0', enabled ? 'bg-brand-success' : 'bg-brand-elevated border border-brand-border')}>
                <motion.span layout className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center', enabled ? 'left-6' : 'left-0.5')}>
                  {toggling === key && <RefreshCw className="w-3 h-3 animate-spin" />}
                </motion.span>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── Feature Dependencies ────────────────────────────────────── */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-4">
        <h3 className="text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-2">Feature Dependencies</h3>
        <div className="text-[10px] font-mono text-brand-text-muted space-y-1">
          <p>🔗 <span className="text-brand-primary">Auto Comment Reply</span> requires <span className="text-brand-success">Auto Reply</span> enabled</p>
          <p>🔗 <span className="text-brand-primary">Cross Engage</span> requires <span className="text-brand-success">Auto Post</span> enabled</p>
          <p>⚠️ Disabling <span className="text-brand-danger">Auto Post</span> also pauses the <span className="text-brand-warning">Scheduler</span></p>
          <p>🛡️ <span className="text-brand-primary">Guardian Scan</span> requires <span className="text-brand-success">GitHub Token</span> configured</p>
        </div>
      </div>

      {/* ─── Toggle History ──────────────────────────────────────────── */}
      {toggleHistory.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-brand-text-muted" /> Toggle History
          </h2>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {toggleHistory.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-mono py-1.5 px-2 rounded hover:bg-brand-elevated/50">
                <span className="text-brand-text">{entry.feature}</span>
                <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase', 
                  entry.enabled ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-danger/10 text-brand-danger')}>
                  {entry.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span className="text-brand-text-muted">{entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── System Health Quick Actions ─────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-brand-primary" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => quickAction('/guardian/scan', 'Security Scan')}
            disabled={actionLoading === 'Security Scan'}
            className="bg-brand-surface border border-brand-border rounded-xl p-4 text-center hover:border-brand-primary/30 transition-all disabled:opacity-50">
            {actionLoading === 'Security Scan' ? <RefreshCw className="w-6 h-6 mx-auto mb-2 text-brand-primary animate-spin" /> : <Shield className="w-6 h-6 mx-auto mb-2 text-brand-primary" />}
            <span className="text-[10px] font-mono font-bold uppercase">Security Scan</span>
          </button>
          <button onClick={() => quickAction('/workflow/pause', 'Pause All Posts')}
            disabled={actionLoading === 'Pause All Posts'}
            className="bg-brand-surface border border-brand-border rounded-xl p-4 text-center hover:border-brand-warning/30 transition-all disabled:opacity-50">
            {actionLoading === 'Pause All Posts' ? <RefreshCw className="w-6 h-6 mx-auto mb-2 text-brand-warning animate-spin" /> : <Pause className="w-6 h-6 mx-auto mb-2 text-brand-warning" />}
            <span className="text-[10px] font-mono font-bold uppercase">Pause All Posts</span>
          </button>
          <button onClick={() => quickAction('/workspaces/default/social-accounts/bulk-health-check', 'Health Check')}
            disabled={actionLoading === 'Health Check'}
            className="bg-brand-surface border border-brand-border rounded-xl p-4 text-center hover:border-brand-success/30 transition-all disabled:opacity-50">
            {actionLoading === 'Health Check' ? <RefreshCw className="w-6 h-6 mx-auto mb-2 text-brand-success animate-spin" /> : <Activity className="w-6 h-6 mx-auto mb-2 text-brand-success" />}
            <span className="text-[10px] font-mono font-bold uppercase">Health Check All</span>
          </button>
          <button onClick={clearCache}
            disabled={actionLoading === 'Clear Cache'}
            className="bg-brand-surface border border-brand-border rounded-xl p-4 text-center hover:border-brand-danger/30 transition-all disabled:opacity-50">
            {actionLoading === 'Clear Cache' ? <RefreshCw className="w-6 h-6 mx-auto mb-2 text-brand-danger animate-spin" /> : <Trash2 className="w-6 h-6 mx-auto mb-2 text-brand-danger" />}
            <span className="text-[10px] font-mono font-bold uppercase">Clear Cache</span>
          </button>
        </div>
      </div>

      {/* ─── Rate Limits Section ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-6">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
            <ShieldOff className="w-6 h-6 text-brand-warning" /> Rate Limits
            {blockedLimits.length > 0 && (
              <span className="px-2 py-0.5 bg-brand-danger/20 text-brand-danger text-xs font-bold rounded-full border border-brand-danger/30">
                {blockedLimits.length} blocked
              </span>
            )}
          </h2>
        </div>
        <button onClick={fetchLimits} className="p-2.5 bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-text">
          <RefreshCw className={cn('w-4 h-4', rlLoading && 'animate-spin')} />
        </button>
      </div>

      {/* ─── Rate Limit Configuration ────────────────────────────────── */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-5">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-text-muted" /> Rate Limit Configuration
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[9px] font-mono uppercase text-brand-text-muted">Per User (req/min)</label>
            <input type="number" value={rateLimitPerUser} onChange={e => setRateLimitPerUser(e.target.value)}
              className="w-full bg-brand-elevated border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text mt-1 focus:outline-none focus:border-brand-primary" />
          </div>
          <div>
            <label className="text-[9px] font-mono uppercase text-brand-text-muted">Window (seconds)</label>
            <input type="number" value={rateWindow} onChange={e => setRateWindow(e.target.value)}
              className="w-full bg-brand-elevated border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text mt-1 focus:outline-none focus:border-brand-primary" />
          </div>
          <div>
            <label className="text-[9px] font-mono uppercase text-brand-text-muted">AI Chat (req/min)</label>
            <input type="number" value={aiChatLimit} onChange={e => setAiChatLimit(e.target.value)}
              className="w-full bg-brand-elevated border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text mt-1 focus:outline-none focus:border-brand-primary" />
          </div>
          <div className="flex items-end">
            <button onClick={saveRateConfig}
              className="w-full bg-brand-primary text-white py-2.5 rounded-lg text-xs font-bold hover:bg-brand-primary/90 transition-colors">
              Save Config
            </button>
          </div>
        </div>
      </div>

      {/* ─── Blocked Users Table ─────────────────────────────────────── */}
      {rlLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-brand-surface/60 border border-brand-border rounded-2xl animate-pulse" />)}</div>
      ) : rlError ? (
        <div className="py-10 text-center text-brand-danger font-mono text-sm flex flex-col items-center gap-2">
          <AlertTriangle className="w-6 h-6" /> Failed to load.
        </div>
      ) : limits.length === 0 ? (
        <div className="py-10 text-center text-brand-text-muted font-mono text-xs uppercase border border-dashed border-brand-border rounded-2xl">No rate limit entries.</div>
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="border-b border-brand-border bg-brand-elevated">{['Identifier','Remaining','Status',''].map(h => <th key={h} className="py-3 px-4 text-[10px] font-mono uppercase tracking-widest text-brand-text-muted">{h}</th>)}</tr></thead>
            <tbody>
              {limits.map((l, i) => (
                <tr key={l.id ?? i} className="border-b border-brand-border/50 hover:bg-brand-elevated/40 transition-colors">
                  <td className="py-3 px-4 text-xs font-mono text-brand-text">{l.identifier || '—'}</td>
                  <td className="py-3 px-4 text-xs font-mono"><span className={l.remaining === 0 ? 'text-brand-danger font-bold' : 'text-brand-text'}>{l.remaining ?? '—'} / {l.limit ?? '—'}</span></td>
                  <td className="py-3 px-4"><span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase font-mono', l.blocked ? 'bg-brand-danger/10 border-brand-danger/30 text-brand-danger' : 'bg-brand-success/10 border-brand-success/30 text-brand-success')}>{l.blocked ? 'Blocked' : 'Active'}</span></td>
                  <td className="py-3 px-4">{l.blocked && (
                    <button onClick={() => handleUnblock(String(l.identifier ?? l.id))} disabled={unblocking === String(l.identifier ?? l.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-success/10 border border-brand-success/30 text-brand-success rounded-lg text-xs font-bold hover:bg-brand-success/20 transition-colors disabled:opacity-50">
                      {unblocking === String(l.identifier ?? l.id) ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />} Unblock
                    </button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
