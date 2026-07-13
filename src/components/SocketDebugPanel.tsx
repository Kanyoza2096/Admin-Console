import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { Terminal, Play, Square, Trash2, Radio, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Copy, Check, Code2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

type LogLevel = 'info' | 'success' | 'error' | 'event';

interface LogLine {
  id: string;
  time: string;
  level: LogLevel;
  text: string;
}

const LEVEL_STYLE: Record<LogLevel, string> = {
  info:    'text-brand-text-muted',
  success: 'text-brand-success',
  error:   'text-brand-danger',
  event:   'text-brand-accent',
};

function toHttp(url: string): string {
  return url.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://').replace(/\/+$/, '');
}

export default function SocketDebugPanel() {
  const { wsEndpoint, masterToken } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [endpoint, setEndpoint] = useState(toHttp(wsEndpoint));
  const [namespace, setNamespace] = useState('/dashboard');
  const [path, setPath] = useState('/socket.io');
  const [token, setToken] = useState(masterToken);
  const [usePolling, setUsePolling] = useState(true);
  const [useWebsocket, setUseWebsocket] = useState(true);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [copiedKind, setCopiedKind] = useState<'js' | 'curl' | null>(null);
  const [lastWorkingTransport, setLastWorkingTransport] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushLog = useCallback((level: LogLevel, text: string) => {
    setLogs(prev => [
      ...prev.slice(-199),
      { id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, time: new Date().toLocaleTimeString(), level, text },
    ]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const disconnect = useCallback((silent = false) => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      if (!silent) pushLog('info', 'Manually disconnected.');
    }
    setStatus('idle');
  }, [pushLog]);

  const connect = useCallback(() => {
    if (socketRef.current) disconnect(true);

    const transports: string[] = [];
    if (usePolling) transports.push('polling');
    if (useWebsocket) transports.push('websocket');
    if (transports.length === 0) {
      pushLog('error', 'Select at least one transport.');
      return;
    }

    const base = toHttp(endpoint);
    const ns = namespace.startsWith('/') ? namespace : `/${namespace}`;
    const target = `${base}${ns}`;

    pushLog('info', `Connecting to ${target} (path=${path}, transports=[${transports.join(', ')}])…`);
    setStatus('connecting');

    const socket = io(target, {
      path,
      transports,
      query: { token },
      auth: { token },
      reconnection: false,
      timeout: 15000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      const t = socket.io.engine?.transport?.name ?? 'unknown';
      setLastWorkingTransport(t);
      pushLog('success', `Connected. Transport: ${t}. Socket ID: ${socket.id}`);
    });

    socket.io.engine?.on?.('upgrade', (t: any) => {
      setLastWorkingTransport(t?.name ?? null);
      pushLog('info', `Transport upgraded to: ${t?.name}`);
    });

    socket.on('connect_error', (err: any) => {
      setStatus('error');
      pushLog('error', err?.message || String(err) || 'Unknown connect_error');
    });

    socket.on('disconnect', (reason: string) => {
      setStatus('idle');
      pushLog('info', `Disconnected: ${reason}`);
    });

    socket.on('error', (err: any) => {
      pushLog('error', typeof err === 'string' ? err : JSON.stringify(err));
    });

    socket.on('stats', (data: any) => {
      pushLog('event', `stats: ${JSON.stringify(data)}`);
    });

    socket.onAny((eventName: string, ...args: any[]) => {
      if (['connect', 'connect_error', 'disconnect', 'error', 'stats'].includes(eventName)) return;
      pushLog('event', `${eventName}: ${JSON.stringify(args)}`);
    });
  }, [endpoint, namespace, path, token, usePolling, useWebsocket, pushLog, disconnect]);

  useEffect(() => {
    return () => { disconnect(true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusMeta = {
    idle:       { label: 'Idle',       color: 'text-brand-text-muted',  icon: <Radio className="w-3.5 h-3.5" /> },
    connecting: { label: 'Connecting', color: 'text-brand-warning',     icon: <Radio className="w-3.5 h-3.5 animate-pulse" /> },
    connected:  { label: 'Connected',  color: 'text-brand-success',     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    error:      { label: 'Error',      color: 'text-brand-danger',      icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  }[status];

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-5"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand-accent" />
          <h2 className="text-sm font-bold uppercase tracking-widest">Raw Socket.IO Debug Console</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider font-mono', statusMeta.color)}>
            {statusMeta.icon}
            {statusMeta.label}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-brand-text-muted" /> : <ChevronDown className="w-4 h-4 text-brand-text-muted" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4">
              <p className="text-[11px] text-brand-text-muted font-mono leading-relaxed">
                Run raw connection tests against any endpoint/token/namespace combo, independent of the
                main dashboard connection. Useful for isolating auth vs. transport vs. namespace issues.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1.5">
                    Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    disabled={status === 'connected' || status === 'connecting'}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-3 py-2.5 text-brand-text placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all font-mono text-xs disabled:opacity-50"
                    placeholder="https://kanyoza-systems-bot.onrender.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1.5">
                    Namespace
                  </label>
                  <input
                    type="text"
                    value={namespace}
                    onChange={(e) => setNamespace(e.target.value)}
                    disabled={status === 'connected' || status === 'connecting'}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-3 py-2.5 text-brand-text placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all font-mono text-xs disabled:opacity-50"
                    placeholder="/dashboard"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1.5">
                    Socket.IO Path
                  </label>
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    disabled={status === 'connected' || status === 'connecting'}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-3 py-2.5 text-brand-text placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all font-mono text-xs disabled:opacity-50"
                    placeholder="/socket.io"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1.5">
                    Master Token (sent as ?token=)
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={status === 'connected' || status === 'connecting'}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-3 py-2.5 text-brand-text placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all font-mono text-xs disabled:opacity-50"
                    placeholder="MASTER_API_TOKEN"
                  />
                </div>
              </div>

              <div className="flex items-center gap-5">
                <label className="flex items-center gap-2 text-xs font-mono text-brand-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePolling}
                    onChange={(e) => setUsePolling(e.target.checked)}
                    disabled={status === 'connected' || status === 'connecting'}
                    className="accent-brand-primary"
                  />
                  polling
                </label>
                <label className="flex items-center gap-2 text-xs font-mono text-brand-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useWebsocket}
                    onChange={(e) => setUseWebsocket(e.target.checked)}
                    disabled={status === 'connected' || status === 'connecting'}
                    className="accent-brand-primary"
                  />
                  websocket
                </label>
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={connect}
                  disabled={status === 'connected' || status === 'connecting'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  Connect
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => disconnect()}
                  disabled={status === 'idle'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-brand-elevated border border-brand-border text-brand-text hover:border-brand-danger hover:text-brand-danger disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Square className="w-3.5 h-3.5" />
                  Disconnect
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setLogs([])}
                  className="px-3 py-2.5 rounded-xl bg-brand-elevated border border-brand-border text-brand-text-muted hover:text-white hover:border-brand-text-muted transition-colors"
                  title="Clear log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </div>

              <div className="bg-brand-bg rounded-xl border border-brand-border p-3 h-64 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed">
                {logs.length === 0 ? (
                  <p className="text-brand-text-muted/50 italic">No output yet — click Connect to run a test.</p>
                ) : (
                  logs.map(line => (
                    <div key={line.id} className="flex gap-2">
                      <span className="text-brand-text-muted/50 flex-shrink-0">[{line.time}]</span>
                      <span className={cn('break-all', LEVEL_STYLE[line.level])}>{line.text}</span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
