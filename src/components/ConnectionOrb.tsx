import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { cn } from '../lib/utils';

export type OrbState = 'live' | 'partial' | 'offline' | 'connecting';

interface OrbConfig {
  color: string;
  glowColor: string;
  label: string;
  sublabel: string;
  r1Duration: number; // outer ring clockwise
  r2Duration: number; // mid ring counter (negative = CCW)
  r3Duration: number; // inner ring clockwise
  pulseDuration: number;
}

const CFG: Record<OrbState, OrbConfig> = {
  live: {
    color: '#22C55E',
    glowColor: 'rgba(34,197,94,0.65)',
    label: 'ENGINE LIVE',
    sublabel: 'All systems nominal',
    r1Duration: 7, r2Duration: -10, r3Duration: 5, pulseDuration: 2.2,
  },
  partial: {
    color: '#F59E0B',
    glowColor: 'rgba(245,158,11,0.6)',
    label: 'UPLINK PARTIAL',
    sublabel: 'REST active · socket pending',
    r1Duration: 11, r2Duration: -15, r3Duration: 8, pulseDuration: 1.8,
  },
  offline: {
    color: '#EF4444',
    glowColor: 'rgba(239,68,68,0.55)',
    label: 'ENGINE OFFLINE',
    sublabel: 'Check backend config',
    r1Duration: 0, r2Duration: 0, r3Duration: 0, pulseDuration: 2.8,
  },
  connecting: {
    color: '#818CF8',
    glowColor: 'rgba(129,140,248,0.75)',
    label: 'CONNECTING...',
    sublabel: 'Establishing uplink',
    r1Duration: 3.5, r2Duration: -5, r3Duration: 2.5, pulseDuration: 1.4,
  },
};

export function deriveState(
  socketConnected: boolean,
  isUsingLiveBackendData: boolean,
  booting: boolean,
): OrbState {
  if (booting) return 'connecting';
  if (socketConnected && isUsingLiveBackendData) return 'live';
  if (socketConnected || isUsingLiveBackendData) return 'partial';
  return 'offline';
}

/* ─── Sparkline ────────────────────────────────────────────────── */

function Sparkline({ history, color }: { history: number[]; color: string }) {
  const W = 88, H = 20, PAD = 2;
  const data = history.slice(-30);
  if (data.length < 2) return null;

  const max = Math.max(...data, 50);
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v / max) * (H - PAD * 2));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Filled area path
  const firstX = PAD;
  const lastX  = PAD + (W - PAD * 2);
  const areaD  = `M${firstX},${H - PAD} L${pts.split(' ').join(' L')} L${lastX},${H - PAD} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaD}
        fill="url(#spark-fill)"
        initial={false}
        animate={{ d: areaD }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <motion.polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ points: pts, stroke: color }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      {/* Latest dot */}
      {data.length > 0 && (() => {
        const parts = pts.split(' ');
        const lastPart = parts[parts.length - 1];
        if (!lastPart) return null;
        const lastCoords = lastPart.split(',');
        const lx = parseFloat(lastCoords[0]) || 0;
        const ly = parseFloat(lastCoords[1]) || 0;
        return (
          <motion.circle cx={lx} cy={ly} r="2.5" fill={color}
            animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.8, 1, 0.8] }}
            style={{ transformOrigin: `${lx}px ${ly}px` }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          />
        );
      })()}
    </svg>
  );
}

/* ─── Ring helper (uses <g> wrapper for reliable SVG rotation) ─── */

function Ring({
  cx, cy, r, strokeW, dashFrac, gapFrac, color, duration, opacity = 1,
}: {
  cx: number; cy: number; r: number; strokeW: number;
  dashFrac: number; gapFrac: number; color: string;
  duration: number; opacity?: number;
}) {
  const C    = 2 * Math.PI * r;
  const dash = (C * dashFrac).toFixed(2);
  const gap  = (C * gapFrac).toFixed(2);

  // duration === 0 → stopped ring
  const spinning = duration !== 0;
  const dir      = duration > 0 ? 360 : -360;
  const absDur   = Math.abs(duration);

  return (
    <motion.g
      style={{ transformOrigin: `${cx}px ${cy}px` }}
      animate={spinning ? { rotate: dir } : { rotate: 0 }}
      transition={
        spinning
          ? { repeat: Infinity, duration: absDur, ease: 'linear' }
          : { duration: 0.5 }
      }
    >
      <motion.circle
        cx={cx} cy={cy} r={r}
        fill="none"
        strokeWidth={strokeW}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        animate={{ stroke: color, opacity }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />
    </motion.g>
  );
}

/* ─── Full ConnectionOrb ──────────────────────────────────────── */

interface ConnectionOrbProps {
  socketConnected: boolean;
  isUsingLiveBackendData: boolean;
  latencyHistory?: number[];
  compact?: boolean;
  className?: string;
  socketError?: string | null;
  socketReconnectAttempts?: number;
}

export function ConnectionOrb({
  socketConnected,
  isUsingLiveBackendData,
  latencyHistory = [],
  compact = false,
  className,
  socketError = null,
  socketReconnectAttempts = 0,
}: ConnectionOrbProps) {
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 2500);
    return () => clearTimeout(t);
  }, []);

  const state = deriveState(socketConnected, isUsingLiveBackendData, booting);
  const cfg   = CFG[state];

  if (compact) {
    // tiny 28 px orb for badges
    const cx = 14, cy = 14;
    return (
      <svg width="28" height="28" viewBox="0 0 28 28"
        style={{ filter: `drop-shadow(0 0 5px ${cfg.glowColor}) drop-shadow(0 0 2px ${cfg.glowColor})`, transition: 'filter 0.8s' }}>
        {/* Outer glow halo */}
        <motion.circle cx={cx} cy={cy} r="13"
          fill="none" strokeWidth="0.5"
          animate={{ stroke: cfg.color, opacity: [0.15, 0.3, 0.15], scale: [0.92, 1.08, 0.92] }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          transition={{
            opacity: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' },
            stroke: { duration: 0.8 },
            scale: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
          }}
        />
        <Ring cx={cx} cy={cy} r={11} strokeW={1.5} dashFrac={0.72} gapFrac={0.28}
          color={cfg.color} duration={cfg.r1Duration} />
        <Ring cx={cx} cy={cy} r={7.5} strokeW={1.5} dashFrac={0.6} gapFrac={0.4}
          color={cfg.color} duration={cfg.r2Duration} opacity={0.7} />
        <Ring cx={cx} cy={cy} r={4} strokeW={1.5} dashFrac={0.85} gapFrac={0.15}
          color={cfg.color} duration={cfg.r3Duration} opacity={0.5} />
        {/* Soft core */}
        <motion.circle cx={cx} cy={cy} r="5"
          animate={{ fill: cfg.color, opacity: [0.12, 0.2, 0.12] }}
          transition={{
            opacity: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
            fill: { duration: 0.8 },
          }}
        />
        {/* centre */}
        <motion.circle cx={cx} cy={cy} r="2.5"
          animate={{ fill: cfg.color, scale: [1, 1.35, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ scale: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' },
                        opacity: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' },
                        fill: { duration: 0.8 } }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
        {/* Orbiting dot for live state */}
        {state === 'live' && (
          <motion.g style={{ transformOrigin: `${cx}px ${cy}px` }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}>
            <motion.circle cx={cx + 9} cy={cy} r="1.5" fill={cfg.color} animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut' }} />
          </motion.g>
        )}
      </svg>
    );
  }

  // Full 88 px orb
  const cx = 44, cy = 44;

  const latestMs = latencyHistory.length > 0
    ? latencyHistory[latencyHistory.length - 1]
    : null;

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Orb */}
      <div className="relative">
        <svg width="88" height="88" viewBox="0 0 88 88"
          style={{
            filter: `drop-shadow(0 0 10px ${cfg.glowColor}) drop-shadow(0 0 3px ${cfg.glowColor})`,
            transition: 'filter 0.9s ease',
          }}>
          {/* Outer glow halo 1 */}
          <motion.circle cx={cx} cy={cy} r="42"
            fill="none" strokeWidth="1"
            animate={{ stroke: cfg.color, opacity: [0.12, 0.25, 0.12], scale: [0.95, 1.05, 0.95] }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            transition={{
              opacity: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
              stroke: { duration: 0.8 },
              scale: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
            }}
          />
          {/* Outer glow halo 2 */}
          <motion.circle cx={cx} cy={cy} r="38"
            fill="none" strokeWidth="0.5"
            animate={{ stroke: cfg.color, opacity: [0.08, 0.15, 0.08] }}
            transition={{
              opacity: { repeat: Infinity, duration: 2, ease: 'easeInOut', delay: 0.5 },
              stroke: { duration: 0.8 },
            }}
          />

          <Ring cx={cx} cy={cy} r={36} strokeW={2}     dashFrac={0.72} gapFrac={0.28}
            color={cfg.color} duration={cfg.r1Duration} />
          <Ring cx={cx} cy={cy} r={26} strokeW={2.5}   dashFrac={0.60} gapFrac={0.40}
            color={cfg.color} duration={cfg.r2Duration} opacity={0.72} />
          <Ring cx={cx} cy={cy} r={16} strokeW={2}     dashFrac={0.85} gapFrac={0.15}
            color={cfg.color} duration={cfg.r3Duration} opacity={0.5} />

          {/* Soft fill core 1 */}
          <motion.circle cx={cx} cy={cy} r="10"
            animate={{ fill: cfg.color, opacity: [0.08, 0.18, 0.08] }}
            transition={{
              opacity: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' },
              fill: { duration: 0.8 },
            }}
          />
          {/* Soft fill core 2 */}
          <motion.circle cx={cx} cy={cy} r="14"
            animate={{ fill: cfg.color, opacity: [0.04, 0.09, 0.04] }}
            transition={{
              opacity: { repeat: Infinity, duration: 3.2, ease: 'easeInOut', delay: 0.3 },
              fill: { duration: 0.8 },
            }}
          />
          {/* Solid centre dot */}
          <motion.circle cx={cx} cy={cy} r="5"
            animate={{ fill: cfg.color, scale: [1, 1.4, 1], opacity: [0.85, 1, 0.85] }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            transition={{
              scale:   { repeat: Infinity, duration: cfg.pulseDuration, ease: 'easeInOut' },
              opacity: { repeat: Infinity, duration: cfg.pulseDuration, ease: 'easeInOut' },
              fill:    { duration: 0.8 },
            }}
          />
          {/* Small rotating orbit dot */}
          {state === 'live' && (
            <motion.g style={{ transformOrigin: `${cx}px ${cy}px` }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}>
              <motion.circle cx={cx + 30} cy={cy} r="2.5" fill={cfg.color} animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }} />
            </motion.g>
          )}
          {state === 'connecting' && (
            <>
              <motion.g style={{ transformOrigin: `${cx}px ${cy}px` }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}>
                <motion.circle cx={cx + 30} cy={cy} r="2.5" fill={cfg.color} animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }} />
              </motion.g>
              <motion.g style={{ transformOrigin: `${cx}px ${cy}px` }} animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}>
                <motion.circle cx={cx - 25} cy={cy} r="2" fill={cfg.color} animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut', delay: 0.2 }} />
              </motion.g>
            </>
          )}
        </svg>

        {/* Ping badge top-right */}
        {latestMs !== null && state === 'live' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-1 -right-1 bg-brand-surface border border-brand-success/40 rounded-full px-1.5 py-0.5 text-[9px] font-mono font-bold text-brand-success leading-none"
          >
            {latestMs}ms
          </motion.div>
        )}
      </div>

      {/* Label block */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex flex-col items-center gap-0.5"
        >
          <motion.p
            className="text-[10px] font-bold uppercase tracking-[0.15em] font-mono"
            animate={{ color: cfg.color }}
            transition={{ duration: 0.8 }}
          >
            {cfg.label}
          </motion.p>
          <p className="text-[9px] text-brand-text-muted font-mono tracking-wider">
            {!socketConnected && socketReconnectAttempts > 0
              ? `Retrying… attempt ${socketReconnectAttempts}`
              : cfg.sublabel}
          </p>
          {socketError && (
            <p className="text-[8px] text-brand-danger font-mono tracking-wide text-center max-w-[160px] leading-snug mt-1 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
              {socketError}
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Sparkline */}
      <AnimatePresence>
        {latencyHistory.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col items-center gap-1"
          >
            <Sparkline history={latencyHistory} color={cfg.color} />
            <p className="text-[8px] text-brand-text-muted/50 font-mono uppercase tracking-widest">
              Latency — last {Math.min(latencyHistory.length, 30)} pings
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Compact pill badge for top bar ─────────────────────────── */

const PILL_COLOR: Record<OrbState, string> = {
  live:       'bg-brand-success/10 text-brand-success border-brand-success/30',
  partial:    'bg-brand-warning/10 text-brand-warning border-brand-warning/30',
  offline:    'bg-brand-danger/10  text-brand-danger  border-brand-danger/30',
  connecting: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30',
};

export function ConnectionBadge({
  socketConnected,
  isUsingLiveBackendData,
  socketError = null,
  socketReconnectAttempts = 0,
  socketTransport = null,
}: {
  socketConnected: boolean;
  isUsingLiveBackendData: boolean;
  socketError?: string | null;
  socketReconnectAttempts?: number;
  socketTransport?: 'polling' | 'websocket' | null;
}) {
  const [booting, setBooting] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const state = deriveState(socketConnected, isUsingLiveBackendData, booting);
  const isRetrying = !socketConnected && !booting && socketReconnectAttempts > 0;
  const hasIssue = !!socketError || isRetrying;

  return (
    <div className="relative" ref={wrapperRef}>
      <motion.button
        layout
        onClick={() => hasIssue && setIsOpen(v => !v)}
        className={cn(
          'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center border gap-2 transition-shadow',
          PILL_COLOR[state],
          hasIssue && 'cursor-pointer hover:brightness-125',
        )}
        transition={{ duration: 0.35 }}
      >
        <ConnectionOrb
          socketConnected={socketConnected}
          isUsingLiveBackendData={isUsingLiveBackendData}
          compact
        />
        <AnimatePresence mode="wait">
          <motion.span
            key={state}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.25 }}
            className="whitespace-nowrap"
          >
            {isRetrying ? `RECONNECTING (${socketReconnectAttempts})` : CFG[state].label}
          </motion.span>
        </AnimatePresence>
        {hasIssue && (
          <motion.span
            animate={{ rotate: isRetrying ? 360 : 0 }}
            transition={isRetrying ? { repeat: Infinity, duration: 1.4, ease: 'linear' } : { duration: 0.2 }}
          >
            {isRetrying ? <RotateCw className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && hasIssue && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 mt-2 w-80 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl p-4 z-50 font-mono"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-brand-danger" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text">
                WebSocket Connection Issue
              </h3>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-brand-text-muted uppercase tracking-wider">Status</span>
                <span className="text-brand-danger font-bold">{socketConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brand-text-muted uppercase tracking-wider">Transport</span>
                <span className="text-brand-text">{socketTransport ?? '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brand-text-muted uppercase tracking-wider">Reconnect attempts</span>
                <span className="text-brand-text tabular-nums">{socketReconnectAttempts}</span>
              </div>
            </div>

            {socketError && (
              <div className="mt-3 px-3 py-2 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-[10px] text-brand-danger leading-relaxed break-words">
                {socketError}
              </div>
            )}

            <p className="mt-3 text-[9px] text-brand-text-muted leading-relaxed">
              Check the backend's WS endpoint and master token in Settings. If this persists,
              the backend's real-time server may be down or misconfigured.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
