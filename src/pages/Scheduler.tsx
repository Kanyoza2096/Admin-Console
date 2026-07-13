import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { Clock, Zap, RefreshCcw, Check, Activity, Calendar, Send, Pause, Play, Newspaper, MessageSquare, History, GitBranch } from 'lucide-react';
import { cn } from '../lib/utils';

interface ScheduleConfig {
  content_hours_utc: number[];
  news_hours_utc: number[];
  post_interval_hours?: number | null;
  news_interval_hours?: number | null;
  enabled?: boolean;
}

interface WorkflowRun {
  id?: string;
  workflow?: string;
  type?: string;
  status?: string;
  ok?: boolean;
  ran_at?: string;
  started_at?: string;
  created_at?: string;
  duration_ms?: number;
  duration?: string;
  topic?: string;
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

function fmt24(h: number) {
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:00 ${h < 12 ? 'AM' : 'PM'}`;
}

export default function Scheduler() {
  const { restEndpoint, masterToken } = useStore();

  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [postsToday, setPostsToday] = useState(0);
  const [queueSize, setQueueSize] = useState(0);
  const [lastPost, setLastPost] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkflowRun[]>([]);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [contentHours, setContentHours] = useState<number[] | null>(null);
  const [newsHours, setNewsHours] = useState<number[] | null>(null);
  const isDirty = contentHours !== null || newsHours !== null;

  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [schedRes, statusRes, histRes] = await Promise.all([
        fetch(`${base}/schedule`, { headers }),
        fetch(`${base}/bot/status`, { headers }),
        fetch(`${base}/workflow/history`, { headers }),
      ]);
      if (schedRes.ok) {
        const d = await schedRes.json();
        const s = d.schedule || d;
        setSchedule(s);
        if (!contentHours) setContentHours(s.content_hours_utc || []);
        if (!newsHours) setNewsHours(s.news_hours_utc || []);
      }
      if (statusRes.ok) {
        const d = await statusRes.json();
        setSchedulerRunning(d.scheduler?.running || d.running || false);
        setPostsToday(d.scheduler?.posts_today || d.posts_today || 0);
        setQueueSize(d.scheduler?.queue_size || d.queue_size || 0);
        setLastPost(d.scheduler?.last_post || d.last_post || null);
      }
      if (histRes.ok) {
        const d = await histRes.json();
        setHistory(d.history || d.workflows || []);
      }
    } catch (err) {
      showToast('Failed to load scheduler data', false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [restEndpoint]);

  const apiAction = async (path: string, method = 'POST') => {
    setActionLoading(path);
    try {
      const res = await fetch(`${base}${path}`, { method, headers });
      const d = await res.json();
      showToast(d.message || 'Action completed', res.ok);
      fetchAll();
    } catch (err: any) {
      showToast(err.message || 'Action failed', false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSave = async () => {
    setActionLoading('save');
    try {
      const res = await fetch(`${base}/schedule`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          content_hours_utc: contentHours || [],
          news_hours_utc: newsHours || [],
        }),
      });
      if (res.ok) {
        setContentHours(null);
        setNewsHours(null);
        showToast('Schedule saved', true);
        fetchAll();
      } else {
        const d = await res.json();
        showToast(d.error || 'Save failed', false);
      }
    } catch (err: any) {
      showToast(err.message || 'Save failed', false);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleHour = (hours: number[], setHours: React.Dispatch<React.SetStateAction<number[] | null>>, h: number) => {
    setHours(hours.includes(h) ? hours.filter(x => x !== h) : [...hours, h].sort((a, b) => a - b));
  };

  const displayContentHours = contentHours ?? schedule?.content_hours_utc ?? [];
  const displayNewsHours = newsHours ?? schedule?.news_hours_utc ?? [];
  const targetPosts = displayContentHours.length;

  if (loading) {
    return <div className="space-y-6 animate-pulse"><div className="h-8 bg-brand-elevated rounded w-48" /><div className="h-64 bg-brand-surface border border-brand-border rounded-2xl" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-0">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs font-bold", toast.ok ? "bg-brand-success text-white" : "bg-brand-danger text-white")}>
            {toast.ok ? <Check className="w-4 h-4" /> : <Activity className="w-4 h-4" />}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center">
            <Calendar className="w-8 h-8 mr-3 text-brand-primary" /> Scheduler Control
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">CONTENT ENGINE ORCHESTRATION</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {schedulerRunning ? (
            <button onClick={() => apiAction('/workflow/pause')} disabled={actionLoading === '/workflow/pause'}
              className="bg-brand-warning/10 border border-brand-warning/40 text-brand-warning px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-warning/20 flex items-center gap-2 disabled:opacity-60">
              <Pause className="w-4 h-4" /> Pause
            </button>
          ) : (
            <button onClick={() => apiAction('/workflow/resume')} disabled={actionLoading === '/workflow/resume'}
              className="bg-brand-success/10 border border-brand-success/40 text-brand-success px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-success/20 flex items-center gap-2 disabled:opacity-60">
              <Play className="w-4 h-4" /> Resume
            </button>
          )}
          <button onClick={() => apiAction('/bot/news')} disabled={actionLoading === '/bot/news'}
            className="bg-brand-elevated border border-brand-border text-brand-text px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:border-brand-accent/40 flex items-center gap-2 disabled:opacity-60">
            <Newspaper className="w-4 h-4" /> Post News
          </button>
          <button onClick={() => apiAction('/bot/engage')} disabled={actionLoading === '/bot/engage'}
            className="bg-brand-elevated border border-brand-border text-brand-text px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:border-brand-accent/40 flex items-center gap-2 disabled:opacity-60">
            <MessageSquare className="w-4 h-4" /> Engage
          </button>
          <button onClick={() => apiAction('/workflow/trigger')} disabled={actionLoading === '/workflow/trigger'}
            className="bg-brand-elevated border border-brand-border text-brand-text px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:border-brand-warning/40 flex items-center gap-2 disabled:opacity-60">
            <GitBranch className="w-4 h-4" /> Trigger
          </button>
          <button onClick={() => apiAction('/bot/post')} disabled={actionLoading === '/bot/post'}
            className="bg-brand-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-primary/90 transition-colors shadow-glow-primary flex items-center gap-2 disabled:opacity-60">
            <Send className="w-4 h-4" /> Post Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Scheduler', value: <span className={cn('text-xs font-bold uppercase', schedulerRunning ? 'text-brand-success' : 'text-brand-warning')}>{schedulerRunning ? 'Running' : 'Paused'}</span>, icon: Activity },
          { label: 'Posts Today', value: `${postsToday} / ${targetPosts}`, icon: Check },
          { label: 'Queue Depth', value: String(queueSize), icon: Zap },
          { label: 'Last Post', value: lastPost ? new Date(lastPost).toLocaleTimeString() : '—', icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-brand-surface border border-brand-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4 text-brand-text-muted" /><span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-muted font-mono">{label}</span></div>
            <div className="text-sm font-bold text-brand-text">{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center mb-5"><Clock className="w-4 h-4 mr-2 text-brand-accent" /> Content Post Hours — UTC ({displayContentHours.length} slots/day)</h2>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {ALL_HOURS.map(h => (
            <button key={h} onClick={() => toggleHour(displayContentHours, setContentHours, h)}
              className={cn('py-2 rounded-xl text-xs font-bold font-mono transition-all border', displayContentHours.includes(h) ? 'bg-brand-primary/20 border-brand-primary text-brand-primary shadow-glow-primary' : 'bg-brand-elevated border-brand-border text-brand-text-muted hover:border-brand-primary/30')}>
              {String(h).padStart(2, '0')}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {displayContentHours.map(h => <span key={h} className="text-[10px] font-mono bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full border border-brand-primary/20">{fmt24(h)}</span>)}
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center mb-5"><RefreshCcw className="w-4 h-4 mr-2 text-brand-warning" /> News Post Hours — UTC ({displayNewsHours.length} slots/day)</h2>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {ALL_HOURS.map(h => (
            <button key={h} onClick={() => toggleHour(displayNewsHours, setNewsHours, h)}
              className={cn('py-2 rounded-xl text-xs font-bold font-mono transition-all border', displayNewsHours.includes(h) ? 'bg-brand-warning/20 border-brand-warning text-brand-warning' : 'bg-brand-elevated border-brand-border text-brand-text-muted hover:border-brand-warning/30')}>
              {String(h).padStart(2, '0')}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {displayNewsHours.map(h => <span key={h} className="text-[10px] font-mono bg-brand-warning/10 text-brand-warning px-2 py-0.5 rounded-full border border-brand-warning/20">{fmt24(h)}</span>)}
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-5"><History className="w-4 h-4 text-brand-text-muted" /> Workflow History</h2>
        {history.length === 0 ? (
          <div className="py-10 text-center text-brand-text-muted font-mono text-xs uppercase">No workflow history.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b border-brand-border bg-brand-elevated">{['Type','Status','Time','Duration'].map(h => <th key={h} className="py-3 px-4 text-[10px] font-mono uppercase tracking-widest text-brand-text-muted">{h}</th>)}</tr></thead>
              <tbody>
                {history.slice(0, 20).map((run, i) => (
                  <tr key={run.id || i} className="border-b border-brand-border/50 hover:bg-brand-elevated/40 transition-colors">
                    <td className="py-3 px-4 text-sm font-bold text-brand-text">{run.workflow || run.type || '—'}</td>
                    <td className="py-3 px-4"><span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border font-mono', run.ok || run.status === 'success' ? 'bg-brand-success/10 border-brand-success/30 text-brand-success' : 'bg-brand-danger/10 border-brand-danger/30 text-brand-danger')}>{run.ok ? 'Success' : run.status || '—'}</span></td>
                    <td className="py-3 px-4 text-xs font-mono text-brand-text-muted">{run.ran_at || run.started_at || run.created_at ? new Date((run.ran_at || run.started_at || run.created_at) as string).toLocaleString() : '—'}</td>
                    <td className="py-3 px-4 text-xs font-mono text-brand-text-muted">{run.duration_ms ? `${run.duration_ms}ms` : run.duration || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isDirty && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 inset-x-0 flex justify-center z-40 px-4">
            <div className="bg-brand-surface border border-brand-primary/40 rounded-2xl shadow-2xl p-4 flex items-center gap-4 w-full max-w-md">
              <span className="text-xs font-mono text-brand-text-muted flex-1">Unsaved changes</span>
              <button onClick={() => { setContentHours(null); setNewsHours(null); }} className="text-xs font-bold text-brand-text-muted hover:text-brand-text px-3 py-1.5 rounded-lg">Discard</button>
              <button onClick={handleSave} disabled={actionLoading === 'save'}
                className="bg-brand-primary text-white px-5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-brand-primary/90 transition-colors flex items-center gap-2 disabled:opacity-60">
                {actionLoading === 'save' ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
