import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { Bell, Check, RefreshCw, AlertTriangle, CheckCheck, Info, AlertCircle, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface NotificationEntry {
  id: string | number;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  created_at?: string;
}

function typeIcon(type?: string) {
  switch ((type ?? '').toLowerCase()) {
    case 'error': return <AlertCircle className="w-4 h-4 text-brand-danger" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-brand-warning" />;
    case 'success': return <Check className="w-4 h-4 text-brand-success" />;
    case 'info': return <Info className="w-4 h-4 text-brand-accent" />;
    default: return <Zap className="w-4 h-4 text-brand-primary" />;
  }
}

function typeColor(type?: string) {
  switch ((type ?? '').toLowerCase()) {
    case 'error': return 'border-brand-danger/30 bg-brand-danger/5';
    case 'warning': return 'border-brand-warning/30 bg-brand-warning/5';
    case 'success': return 'border-brand-success/30 bg-brand-success/5';
    default: return 'border-brand-border bg-brand-surface';
  }
}

export default function Notifications() {
  const { restEndpoint, masterToken } = useStore();
  const headers = masterToken ? { Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchNotifs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/notifications?limit=50`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifs(); }, [restEndpoint]);

  const markRead = async (id: string | number) => {
    setActionLoading(String(id));
    try {
      await fetch(`${base}/notifications/${id}/read`, { method: 'POST', headers });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err: any) {
      showToast('Failed to mark as read', false);
    } finally {
      setActionLoading(null);
    }
  };

  const markAllRead = async () => {
    setActionLoading('all');
    try {
      await Promise.all(unread.map(n => fetch(`${base}/notifications/${n.id}/read`, { method: 'POST', headers })));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      showToast('All marked as read', true);
    } catch {
      showToast('Failed to mark all', false);
    } finally {
      setActionLoading(null);
    }
  };

  const unread = notifications.filter(n => !n.read);
  const displayed = filter === 'unread' ? unread : notifications;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-24 max-w-3xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs font-bold", toast.ok ? "bg-brand-success text-white" : "bg-brand-danger text-white")}>
            {toast.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center gap-3">
            <Bell className="w-8 h-8 text-brand-primary" /> Notifications
            {unread.length > 0 && <span className="px-2.5 py-0.5 bg-brand-primary text-white text-xs font-bold rounded-full font-mono">{unread.length}</span>}
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">SYSTEM ALERT FEED</p>
        </div>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <button onClick={markAllRead} disabled={actionLoading === 'all'}
              className="px-4 py-2.5 bg-brand-elevated border border-brand-border rounded-xl text-xs font-bold uppercase tracking-wider text-brand-text-muted hover:text-brand-text hover:border-brand-primary/40 transition-colors flex items-center gap-2 disabled:opacity-50">
              {actionLoading === 'all' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />} Mark All Read
            </button>
          )}
          <button onClick={fetchNotifs} className="p-2.5 bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-text transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-brand-border pb-4">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors', filter === f ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/40' : 'bg-brand-elevated border border-brand-border text-brand-text-muted hover:text-brand-text')}>
            {f === 'all' ? `All (${notifications.length})` : `Unread (${unread.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-brand-surface border border-brand-border rounded-2xl animate-pulse" />)}</div>
      ) : error ? (
        <div className="py-16 text-center text-brand-danger font-mono text-sm flex flex-col items-center gap-2 bg-brand-surface border border-brand-border rounded-2xl">
          <AlertTriangle className="w-6 h-6" /> Failed to load notifications.
          <button onClick={fetchNotifs} className="mt-2 px-4 py-1.5 bg-brand-elevated rounded-lg text-xs font-bold">Retry</button>
        </div>
      ) : displayed.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-brand-border rounded-2xl">
          <Bell className="w-10 h-10 text-brand-text-muted mx-auto mb-3 opacity-30" />
          <p className="text-brand-text-muted font-mono text-xs uppercase">{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {displayed.map((n, idx) => (
            <motion.div key={n.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: 0.03 * idx }}
              className={cn('flex items-start gap-4 p-5 rounded-2xl border transition-all', typeColor(n.type), n.read && 'opacity-60')}>
              <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                {n.title && <div className="text-sm font-bold text-brand-text mb-0.5">{n.title}</div>}
                {n.message && <div className="text-xs text-brand-text-muted leading-relaxed">{n.message}</div>}
                {n.created_at && <div className="text-[10px] font-mono text-brand-text-muted mt-2">{new Date(n.created_at).toLocaleString()}</div>}
              </div>
              {!n.read && (
                <button onClick={() => markRead(n.id)} disabled={actionLoading === String(n.id)}
                  className="shrink-0 p-1.5 bg-brand-elevated border border-brand-border rounded-lg text-brand-text-muted hover:text-brand-success hover:border-brand-success/40 transition-colors disabled:opacity-50" title="Mark as read">
                  {actionLoading === String(n.id) ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
