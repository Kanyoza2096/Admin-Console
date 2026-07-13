import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Zap, WifiOff, Wifi, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { formatDistanceToNow } from 'date-fns';

type BackendStatus = 'checking' | 'online' | 'waking' | 'offline' | 'error';

interface PingResult {
  status: BackendStatus;
  httpCode: number | null;
  latencyMs: number | null;
  checkedAt: Date;
  errorHint: string | null;
}

const BACKEND_URL = 'https://kanyoza-systems-bot.onrender.com';
const POLL_INTERVAL_MS = 120_000; // 2 min — /status should not trigger AI calls but keep interval sane
const WAKE_TIMEOUT_MS  = 70_000;
const PING_TIMEOUT_MS  = 12_000;

function deriveStatus(httpCode: number | null, latencyMs: number | null): { status: BackendStatus; hint: string | null } {
  if (httpCode === null) {
    return { status: 'offline', hint: 'No response — backend may be crashed or sleeping on Render.' };
  }
  if (httpCode === 502 || httpCode === 503) {
    return {
      status: 'error',
      hint: httpCode === 502
        ? '502 Bad Gateway — app process crashed. Check Render logs for asyncio/eventlet errors.'
        : '503 Service Unavailable — Render is cold-starting. Click Wake to accelerate.',
    };
  }
  if (httpCode >= 200 && httpCode < 300) {
    return { status: 'online', hint: null };
  }
  return { status: 'error', hint: `HTTP ${httpCode} — unexpected response from backend.` };
}

async function pingBackend(signal: AbortSignal): Promise<{ httpCode: number | null; latencyMs: number }> {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/status`, {
      method: 'GET',
      signal,
      cache: 'no-store',
    });
    return { httpCode: res.status, latencyMs: Math.round(performance.now() - t0) };
  } catch {
    return { httpCode: null, latencyMs: Math.round(performance.now() - t0) };
  }
}

export default function BackendStatusCard() {
  const { masterToken } = useStore();
  const [result, setResult]     = useState<PingResult | null>(null);
  const [waking,  setWaking]    = useState(false);
  const [wakeProgress, setWakeProgress] = useState(0);
  const abortRef   = useRef<AbortController | null>(null);
  const wakeTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runPing = useCallback(async () => {
    const ac = new AbortController();
    abortRef.current = ac;
    const timeout = setTimeout(() => ac.abort(), PING_TIMEOUT_MS);
    const { httpCode, latencyMs } = await pingBackend(ac.signal);
    clearTimeout(timeout);
    const { status, hint } = deriveStatus(httpCode, latencyMs);
    setResult({ status, httpCode, latencyMs, checkedAt: new Date(), errorHint: hint });
    return status;
  }, []);

  // Poll every 2 min, skip when tab is hidden
  useEffect(() => {
    runPing();
    const schedule = () => {
      pollTimer.current = setTimeout(async () => {
        if (document.visibilityState === 'visible') await runPing();
        schedule();
      }, POLL_INTERVAL_MS);
    };
    schedule();
    return () => {
      abortRef.current?.abort();
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [runPing]);

  const handleWake = useCallback(async () => {
    if (waking) return;
    setWaking(true);
    setWakeProgress(0);
    if (pollTimer.current) clearTimeout(pollTimer.current);

    // Progress bar animation over WAKE_TIMEOUT_MS
    const startedAt = Date.now();
    wakeTimer.current = setInterval(() => {
      const pct = Math.min(((Date.now() - startedAt) / WAKE_TIMEOUT_MS) * 100, 97);
      setWakeProgress(pct);
    }, 500);

    // Kick off a real request to wake the dyno
    const ac = new AbortController();
    abortRef.current = ac;
    const timeout = setTimeout(() => ac.abort(), WAKE_TIMEOUT_MS);
    try {
      await fetch(`${BACKEND_URL}/api/v1/status`, {
        method: 'GET',
        signal: ac.signal,
        cache: 'no-store',
        headers: { Authorization: `Bearer ${masterToken}` },
      });
    } catch { /* timeout or error — still check below */ }
    clearTimeout(timeout);

    if (wakeTimer.current) clearInterval(wakeTimer.current);
    setWakeProgress(100);

    // Final status check
    await runPing();
    setTimeout(() => {
      setWaking(false);
      setWakeProgress(0);
      // Resume polling
      pollTimer.current = setTimeout(async () => { await runPing(); }, POLL_INTERVAL_MS);
    }, 600);
  }, [waking, masterToken, runPing]);

  const statusConfig: Record<BackendStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; pulse: boolean }> = {
    checking: { label: 'Checking…',  color: 'text-brand-text-muted',  bg: 'bg-brand-elevated',        border: 'border-brand-border',        icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,                   pulse: false },
    online:   { label: 'Online',     color: 'text-brand-success',     bg: 'bg-brand-success/10',      border: 'border-brand-success/30',    icon: <Wifi className="w-3.5 h-3.5" />,                                     pulse: false },
    waking:   { label: 'Waking…',   color: 'text-brand-warning',     bg: 'bg-brand-warning/10',      border: 'border-brand-warning/30',    icon: <Zap className="w-3.5 h-3.5" />,                                      pulse: true  },
    offline:  { label: 'Offline',    color: 'text-brand-text-muted',  bg: 'bg-brand-elevated',        border: 'border-brand-border',        icon: <WifiOff className="w-3.5 h-3.5" />,                                  pulse: false },
    error:    { label: 'Error',      color: 'text-brand-danger',      bg: 'bg-brand-danger/10',       border: 'border-brand-danger/30',     icon: <AlertTriangle className="w-3.5 h-3.5" />,                            pulse: true  },
  };

  const current = result?.status ?? 'checking';
  const cfg = statusConfig[current];

  return (
    <div className="bg-brand-surface rounded-2xl border border-brand-border p-5 relative overflow-hidden">
      {/* Top accent when online */}
      {current === 'online' && (
        <motion.div
          className="absolute top-0 left-0 w-full h-[2px] bg-brand-success"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6 }}
        />
      )}
      {current === 'error' && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-danger animate-pulse" />
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-primary" />
            Backend Engine
          </h2>
          <p className="text-[10px] font-mono text-brand-text-muted mt-0.5 truncate max-w-[200px]">
            {BACKEND_URL.replace('https://', '')}
          </p>
        </div>

        {/* Status badge */}
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold font-mono uppercase border',
          cfg.bg, cfg.border, cfg.color
        )}>
          <span className={cn(cfg.pulse && 'animate-pulse')}>{cfg.icon}</span>
          {cfg.label}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-brand-bg rounded-xl p-3 text-center">
          <p className="text-[9px] font-mono text-brand-text-muted uppercase tracking-wider mb-1">Latency</p>
          <p className={cn(
            'text-lg font-extrabold font-mono tabular-nums',
            result?.latencyMs == null ? 'text-brand-text-muted' :
            result.latencyMs < 500 ? 'text-brand-success' :
            result.latencyMs < 2000 ? 'text-brand-warning' : 'text-brand-danger'
          )}>
            {result?.latencyMs != null ? `${result.latencyMs}` : '—'}
            <span className="text-[10px] font-normal text-brand-text-muted ml-0.5">ms</span>
          </p>
        </div>
        <div className="bg-brand-bg rounded-xl p-3 text-center">
          <p className="text-[9px] font-mono text-brand-text-muted uppercase tracking-wider mb-1">HTTP</p>
          <p className={cn(
            'text-lg font-extrabold font-mono',
            result?.httpCode == null ? 'text-brand-text-muted' :
            result.httpCode < 300 ? 'text-brand-success' :
            result.httpCode < 500 ? 'text-brand-warning' : 'text-brand-danger'
          )}>
            {result?.httpCode ?? '—'}
          </p>
        </div>
        <div className="bg-brand-bg rounded-xl p-3 text-center">
          <p className="text-[9px] font-mono text-brand-text-muted uppercase tracking-wider mb-1">Checked</p>
          <p className="text-[11px] font-mono text-brand-text truncate">
            {result?.checkedAt
              ? formatDistanceToNow(result.checkedAt, { addSuffix: false }) + ' ago'
              : '—'
            }
          </p>
        </div>
      </div>

      {/* Error hint */}
      <AnimatePresence>
        {result?.errorHint && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 px-3 py-2 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-[10px] font-mono text-brand-danger leading-relaxed"
          >
            <AlertTriangle className="w-3 h-3 inline mr-1.5" />
            {result.errorHint}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wake progress bar */}
      <AnimatePresence>
        {waking && (
          <motion.div
            key="wake-bar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="flex justify-between text-[9px] font-mono text-brand-text-muted mb-1.5">
              <span>Sending wake signal to Render…</span>
              <span>{Math.round(wakeProgress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-brand-elevated rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-brand-warning rounded-full"
                style={{ width: `${wakeProgress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleWake}
          disabled={waking || current === 'checking'}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors',
            waking
              ? 'bg-brand-warning/20 text-brand-warning border border-brand-warning/30 cursor-not-allowed'
              : current === 'online'
              ? 'bg-brand-success/10 text-brand-success border border-brand-success/30 hover:bg-brand-success/20'
              : 'bg-brand-primary text-white hover:bg-brand-primary/90'
          )}
          style={!waking && current !== 'online' ? { boxShadow: '0 0 16px rgba(79,70,229,0.3)' } : {}}
        >
          {waking ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-3.5 h-3.5 border-2 border-brand-warning/40 border-t-brand-warning rounded-full"
            />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          {waking ? 'Waking Backend…' : current === 'online' ? 'Backend Online' : 'Wake Backend'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => !waking && runPing()}
          disabled={waking}
          className="px-3 py-2.5 rounded-xl bg-brand-elevated border border-brand-border text-brand-text-muted hover:text-white hover:border-brand-text-muted transition-colors"
          title="Re-check now"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', current === 'checking' && 'animate-spin')} />
        </motion.button>

        <a
          href="https://dashboard.render.com"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-2.5 rounded-xl bg-brand-elevated border border-brand-border text-brand-text-muted hover:text-white hover:border-brand-text-muted transition-colors flex items-center"
          title="Open Render dashboard"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Poll indicator */}
      <div className="flex items-center gap-1.5 mt-3">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-brand-primary"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        />
        <span className="text-[9px] font-mono text-brand-text-muted">Auto-checks every 2 min</span>
      </div>
    </div>
  );
}
