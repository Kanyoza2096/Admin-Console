import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { FileClock, Search, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface AuditLogEntry {
  id: string | number;
  action?: string;
  user?: string;
  resource?: string;
  status?: string;
  created_at?: string;
  timestamp?: string;
  detail?: string;
}

export default function AuditLogs() {
  const { restEndpoint, masterToken } = useStore();
  const headers = masterToken ? { Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/audit-logs?limit=100`, { headers });
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      } else throw new Error('Failed to fetch');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [restEndpoint]);

  const filteredLogs = logs.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (l.action || '').toLowerCase().includes(q) ||
           (l.user || '').toLowerCase().includes(q) ||
           (l.resource || '').toLowerCase().includes(q) ||
           (l.status || '').toLowerCase().includes(q);
  });

  const statusColors: Record<string, string> = {
    success: 'bg-brand-success/20 text-brand-success',
    failed: 'bg-brand-danger/20 text-brand-danger',
    error: 'bg-brand-danger/20 text-brand-danger',
    warning: 'bg-brand-warning/20 text-brand-warning',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 md:pb-0">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs font-bold", toast.ok ? "bg-brand-success text-white" : "bg-brand-danger text-white")}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center">
            <FileClock className="w-8 h-8 mr-3 text-brand-primary" /> Audit Logs
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">SYSTEM AUDIT & ACTIVITY LOGS</p>
        </div>
        <button onClick={fetchLogs} className="p-2.5 bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-text">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-muted" />
          <input type="text" placeholder="Search logs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-brand-elevated border border-brand-border rounded-xl text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-primary" />
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-brand-elevated animate-pulse rounded-xl" />)}</div>
        ) : error ? (
          <div className="py-10 text-center text-brand-danger font-mono text-sm flex flex-col items-center gap-2">
            <XCircle className="w-6 h-6" /> Failed to load logs.
            <button onClick={fetchLogs} className="mt-2 px-4 py-1.5 bg-brand-elevated rounded-lg text-xs font-bold">Retry</button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-brand-text-muted font-mono text-xs uppercase">No audit events recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-brand-text-muted">Timestamp</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-brand-text-muted">User</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-brand-text-muted">Action</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-brand-text-muted">Resource</th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest text-brand-text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <motion.tr key={log.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * idx }}
                    className="border-b border-brand-border last:border-b-0 hover:bg-brand-elevated/30 transition-colors">
                    <td className="py-4 px-4 text-sm font-mono text-brand-text whitespace-nowrap">
                      {log.created_at || log.timestamp || '—'}
                    </td>
                    <td className="py-4 px-4 text-sm text-brand-text">{log.user || 'system'}</td>
                    <td className="py-4 px-4 text-sm text-brand-text font-bold">{log.action || '—'}</td>
                    <td className="py-4 px-4 text-sm font-mono text-brand-text-muted">{log.resource || '—'}</td>
                    <td className="py-4 px-4">
                      <span className={cn('px-2 py-1 rounded-lg text-xs font-bold uppercase', statusColors[log.status || ''] || 'bg-brand-elevated text-brand-text-muted')}>
                        {log.status || 'unknown'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
