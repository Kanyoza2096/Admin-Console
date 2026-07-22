import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import {
  Clock, Zap, RefreshCcw, Check, Activity, Calendar, Send, Pause, Play,
  Newspaper, MessageSquare, History, GitBranch, BarChart3, TrendingUp,
  Layers, AlertCircle, ChevronDown, Building2, Settings2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────

interface Brand {
  id: string;
  name: string;
  posting_schedule?: {
    content_hours?: number[];
    news_hours?: number[];
    max_posts_per_day?: number;
    timezone?: string;
  };
  ai_profile_id?: string;
  status?: string;
}

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
  brand_id?: string;
  brand_name?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

function fmt24(h: number) {
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:00 ${h < 12 ? 'AM' : 'PM'}`;
}

// ── Timezone Strip ─────────────────────────────────────────────────────────

function TimezoneStrip({ hours, color, label }: { hours: number[]; color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] font-mono font-bold uppercase text-brand-text-muted w-20 flex-shrink-0">
        {label}
      </span>
      <div className="flex gap-0.5 flex-1">
        {ALL_HOURS.map(h => (
          <div
            key={h}
            className="flex-1 h-5 rounded-sm transition-colors"
            style={{
              backgroundColor: hours.includes(h) ? color : 'transparent',
              opacity: hours.includes(h) ? 0.9 : 0.15,
            }}
            title={hours.includes(h) ? fmt24(h) : ''}
          />
        ))}
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

const SkeletonBlock = () => (
  <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-5 animate-pulse space-y-3">
    <div className="h-5 bg-brand-elevated rounded w-32" />
    <div className="grid grid-cols-12 gap-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
        <div key={i} className="h-10 bg-brand-elevated rounded-xl" />
      ))}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════

export default function Scheduler() {
  const { restEndpoint, masterToken, selectedWorkspaceId } = useStore();

  // ── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [postsToday, setPostsToday] = useState(0);
  const [queueSize, setQueueSize] = useState(0);
  const [lastPost, setLastPost] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkflowRun[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Brand state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);

  // Schedule state (per brand)
  const [contentHours, setContentHours] = useState<number[] | null>(null);
  const [newsHours, setNewsHours] = useState<number[] | null>(null);
  const isDirty = contentHours !== null || newsHours !== null;

  // ── Derived ──────────────────────────────────────────────────────────────
  const headers = masterToken
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` }
    : {};
  const base = restEndpoint.replace(/\/+$/, '');
  const workspaceId = selectedWorkspaceId || 'default';

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const displayContentHours =
    contentHours ?? selectedBrand?.posting_schedule?.content_hours ?? [];
  const displayNewsHours =
    newsHours ?? selectedBrand?.posting_schedule?.news_hours ?? [];
  const targetPosts = displayContentHours.length;

  // ── Fetch Brands ─────────────────────────────────────────────────────────
  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch(`${base}/workspaces/${workspaceId}/brands`, { headers });
      if (res.ok) {
        const d = await res.json();
        const list = d.brands || [];
        setBrands(list);
        if (!selectedBrandId && list.length > 0) {
          setSelectedBrandId(list[0].id);
        }
      }
    } catch {
      // Silently fail — brands will be empty
    }
  }, [base, workspaceId]);

  // ── Fetch Scheduler Status ───────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, histRes] = await Promise.all([
        fetch(`${base}/bot/status`, { headers }),
        fetch(`${base}/workflow/history`, { headers }),
      ]);
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
    } catch {
      toast.error('Failed to load scheduler data');
    }
  }, [base]);

  // ── Initial Load ─────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchBrands();
      await fetchStatus();
      setLoading(false);
    };
    init();
  }, [restEndpoint]);

  // Reload when brand changes
  useEffect(() => {
    if (selectedBrandId) {
      setContentHours(null);
      setNewsHours(null);
      fetchStatus();
    }
  }, [selectedBrandId]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const apiAction = async (path: string, method = 'POST', body?: any, successMsg?: string) => {
    setActionLoading(path);
    try {
      const res = await fetch(`${base}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(successMsg || d.message || 'Action completed');
        fetchStatus();
      } else {
        toast.error(d.error || 'Action failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSave = async () => {
    if (!selectedBrandId) return;
    setActionLoading('save');
    try {
      const res = await fetch(`${base}/brands/${selectedBrandId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          posting_schedule: {
            content_hours: contentHours ?? displayContentHours,
            news_hours: newsHours ?? displayNewsHours,
            max_posts_per_day: targetPosts,
          },
        }),
      });
      if (res.ok) {
        setContentHours(null);
        setNewsHours(null);
        toast.success('Schedule saved');
        fetchBrands(); // Refresh brand data
        fetchStatus();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Save failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setActionLoading(null);
    }
  };

  const triggerWorkflow = async (brandId: string) => {
    setActionLoading('trigger');
    try {
      const res = await fetch(`${base}/workflow/trigger`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ brand_id: brandId }),
      });
      const d = await res.json();
      if (res.ok) {
        const brand = brands.find(b => b.id === brandId);
        toast.success(`Post triggered for ${brand?.name || 'brand'}`);
        fetchStatus();
      } else {
        toast.error(d.error || 'Trigger failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Trigger failed');
    } finally {
      setActionLoading(null);
      setShowTriggerModal(false);
    }
  };

  const toggleHour = (
    hours: number[],
    setHours: React.Dispatch<React.SetStateAction<number[] | null>>,
    h: number,
  ) => {
    const current = hours;
    const updated = current.includes(h)
      ? current.filter(x => x !== h)
      : [...current, h].sort((a, b) => a - b);
    setHours(updated);
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const successRuns = history.filter(r => r.ok || r.status === 'success').length;
  const failedRuns = history.filter(r => !r.ok && r.status !== 'success' && r.status).length;

  // ═════════════════════════════════════════════════════════════════════════

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-5 pb-24 md:pb-0">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
            <Calendar className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Scheduler</h1>
            <p className="text-[10px] text-brand-text-muted font-mono uppercase tracking-wider mt-0.5">
              Content Engine Orchestration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {schedulerRunning ? (
            <button
              onClick={() => apiAction('/workflow/pause', 'POST', null, 'Scheduler paused')}
              disabled={actionLoading === '/workflow/pause'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 text-[10px] font-bold font-mono uppercase tracking-wider transition-all disabled:opacity-50">
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          ) : (
            <button
              onClick={() => apiAction('/workflow/resume', 'POST', null, 'Scheduler resumed')}
              disabled={actionLoading === '/workflow/resume'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 text-[10px] font-bold font-mono uppercase tracking-wider transition-all disabled:opacity-50">
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          )}
          <button
            onClick={() => apiAction('/bot/news', 'POST', null, 'News post triggered')}
            disabled={actionLoading === '/bot/news'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-primary/30 text-brand-text-muted hover:text-white text-[10px] font-bold font-mono uppercase tracking-wider transition-all disabled:opacity-50">
            <Newspaper className="w-3.5 h-3.5" /> News
          </button>
          <button
            onClick={() => apiAction('/bot/engage', 'POST', null, 'Engagement triggered')}
            disabled={actionLoading === '/bot/engage'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-primary/30 text-brand-text-muted hover:text-white text-[10px] font-bold font-mono uppercase tracking-wider transition-all disabled:opacity-50">
            <MessageSquare className="w-3.5 h-3.5" /> Engage
          </button>

          {/* ── Trigger with Brand Selector ── */}
          <button
            onClick={() => setShowTriggerModal(true)}
            disabled={brands.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-primary/30 text-brand-text-muted hover:text-white text-[10px] font-bold font-mono uppercase tracking-wider transition-all disabled:opacity-50">
            <GitBranch className="w-3.5 h-3.5" /> Trigger
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (selectedBrandId) triggerWorkflow(selectedBrandId);
              else setShowTriggerModal(true);
            }}
            disabled={actionLoading === 'trigger'}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary text-white text-[10px] font-bold font-mono uppercase tracking-wider hover:bg-brand-primary/90 transition-all shadow-glow-primary disabled:opacity-50">
            <Send className="w-3.5 h-3.5" /> Post Now
          </motion.button>
        </div>
      </div>

      {/* ── Brand Selector ── */}
      <div className="relative">
        <button
          onClick={() => setShowBrandSelector(!showBrandSelector)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-surface border border-brand-border/50 rounded-xl hover:border-brand-primary/30 transition-all">
          <Building2 className="w-4 h-4 text-brand-primary" />
          <span className="text-sm font-bold text-white">
            {selectedBrand?.name || 'Select Brand'}
          </span>
          <ChevronDown className={cn(
            'w-4 h-4 text-brand-text-muted transition-transform',
            showBrandSelector && 'rotate-180',
          )} />
        </button>

        <AnimatePresence>
          {showBrandSelector && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-64 bg-brand-surface/95 backdrop-blur-xl border border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-2 border-b border-brand-border/50">
                <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider px-2">
                  Brands
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {brands.map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => {
                      setSelectedBrandId(brand.id);
                      setShowBrandSelector(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-brand-elevated transition-colors text-left',
                      selectedBrandId === brand.id && 'bg-brand-primary/10 text-brand-primary',
                    )}>
                    <div className="w-7 h-7 rounded-lg bg-brand-primary/20 text-brand-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {brand.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="truncate font-medium text-white">{brand.name}</span>
                      <p className="text-[9px] text-brand-text-muted font-mono">
                        {brand.posting_schedule?.content_hours?.length || 0} slots · {brand.posting_schedule?.max_posts_per_day || 0}/day
                      </p>
                    </div>
                    {selectedBrandId === brand.id && (
                      <Check className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Stats ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-brand-surface/50 border border-brand-border/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              label: 'Status',
              value: schedulerRunning ? 'Running' : 'Paused',
              icon: Activity,
              color: schedulerRunning ? 'text-emerald-400' : 'text-amber-400',
            },
            {
              label: 'Posts Today',
              value: `${postsToday}/${targetPosts}`,
              icon: Check,
              color: 'text-brand-primary',
            },
            { label: 'Queue', value: queueSize, icon: Layers, color: 'text-violet-400' },
            {
              label: 'Last Post',
              value: lastPost
                ? new Date(lastPost).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '—',
              icon: Clock,
              color: 'text-brand-text-muted',
            },
            {
              label: 'Success Rate',
              value: history.length > 0
                ? `${Math.round((successRuns / history.length) * 100)}%`
                : '—',
              icon: TrendingUp,
              color: 'text-emerald-400',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-brand-surface/50 border border-brand-border/50 rounded-xl p-3 hover:border-brand-border transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-text-muted">
                  {stat.label}
                </span>
                <stat.icon className={cn('w-3.5 h-3.5', stat.color)} />
              </div>
              <div
                className={cn(
                  'text-sm font-mono font-bold',
                  stat.color === 'text-brand-text-muted' ? 'text-white' : stat.color,
                )}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Timeline ── */}
      {!loading && selectedBrand && (
        <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-4 space-y-3">
          <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-brand-primary" />
            {selectedBrand.name} — Posting Schedule (UTC)
          </h2>
          <TimezoneStrip hours={displayContentHours} color="#818cf8" label="Content" />
          <TimezoneStrip hours={displayNewsHours} color="#f59e0b" label="News" />
          <div className="flex justify-between text-[8px] font-mono text-brand-text-muted px-0">
            {[0, 6, 12, 18].map(h => (
              <span key={h}>{fmt24(h)}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Content Hours Grid ── */}
      {loading ? (
        <SkeletonBlock />
      ) : selectedBrand ? (
        <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400" /> Content Hours
            </h2>
            <span className="text-[9px] font-mono text-brand-text-muted">
              {displayContentHours.length} slots · {targetPosts} posts/day
            </span>
          </div>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
            {ALL_HOURS.map(h => (
              <button
                key={h}
                onClick={() => toggleHour(displayContentHours, setContentHours, h)}
                className={cn(
                  'py-2.5 rounded-lg text-[10px] font-bold font-mono transition-all border',
                  displayContentHours.includes(h)
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-400 shadow-glow-primary'
                    : 'bg-brand-elevated border-brand-border/50 text-brand-text-muted hover:border-violet-500/30 hover:text-white',
                )}>
                {String(h).padStart(2, '0')}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {displayContentHours.map(h => (
              <span
                key={h}
                className="text-[9px] font-mono bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20">
                {fmt24(h)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-8 text-center">
          <Settings2 className="w-8 h-8 mx-auto mb-3 text-brand-text-muted opacity-50" />
          <p className="text-sm text-brand-text-muted font-mono">Select a brand to configure its schedule</p>
        </div>
      )}

      {/* ── News Hours Grid ── */}
      {!loading && selectedBrand && (
        <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" /> News Hours
            </h2>
            <span className="text-[9px] font-mono text-brand-text-muted">
              {displayNewsHours.length} slots
            </span>
          </div>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
            {ALL_HOURS.map(h => (
              <button
                key={h}
                onClick={() => toggleHour(displayNewsHours, setNewsHours, h)}
                className={cn(
                  'py-2.5 rounded-lg text-[10px] font-bold font-mono transition-all border',
                  displayNewsHours.includes(h)
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-brand-elevated border-brand-border/50 text-brand-text-muted hover:border-amber-500/30 hover:text-white',
                )}>
                {String(h).padStart(2, '0')}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {displayNewsHours.map(h => (
              <span
                key={h}
                className="text-[9px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                {fmt24(h)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Workflow History ── */}
      {loading ? (
        <SkeletonBlock />
      ) : (
        <div className="bg-brand-surface border border-brand-border/50 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-brand-border/30 bg-brand-elevated/10">
            <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-brand-primary" /> Workflow History
            </h2>
            <span className="text-[9px] font-mono text-brand-text-muted">{history.length} runs</span>
          </div>
          {history.length === 0 ? (
            <div className="py-12 text-center text-brand-text-muted font-mono text-xs">
              No workflow history yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-brand-border/30 text-[9px] font-mono font-bold text-brand-text-muted uppercase tracking-widest">
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 hidden sm:table-cell">Time</th>
                    <th className="py-2.5 px-4 hidden md:table-cell">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/20">
                  {history.slice(0, 20).map((run, i) => (
                    <tr key={run.id || i} className="hover:bg-brand-elevated/20 transition-colors">
                      <td className="py-2.5 px-4">
                        <p className="text-xs font-bold text-white">
                          {run.workflow || run.type || '—'}
                        </p>
                        {run.topic && (
                          <p className="text-[9px] text-brand-text-muted font-mono mt-0.5 truncate max-w-[200px]">
                            {run.topic}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase border',
                            run.ok || run.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30',
                          )}>
                          <div
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              run.ok ? 'bg-emerald-400' : 'bg-red-400',
                            )}
                          />
                          {run.ok ? 'Success' : run.status || 'Failed'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 hidden sm:table-cell text-[10px] font-mono text-brand-text-muted whitespace-nowrap">
                        {run.ran_at || run.started_at || run.created_at
                          ? new Date(
                              (run.ran_at || run.started_at || run.created_at) as string,
                            ).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 hidden md:table-cell text-[10px] font-mono text-brand-text-muted">
                        {run.duration_ms ? `${run.duration_ms}ms` : run.duration || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Trigger Modal ── */}
      <AnimatePresence>
        {showTriggerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowTriggerModal(false)}>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-brand-surface border border-brand-border rounded-2xl p-5 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-white mb-4">Select Brand to Post</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {brands.map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => triggerWorkflow(brand.id)}
                    disabled={actionLoading === 'trigger'}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-brand-elevated text-left transition-colors disabled:opacity-50">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/20 text-brand-primary flex items-center justify-center text-xs font-bold">
                      {brand.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white">{brand.name}</span>
                      <p className="text-[9px] text-brand-text-muted font-mono">
                        {brand.posting_schedule?.content_hours?.length || 0} slots
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowTriggerModal(false)}
                className="w-full mt-3 py-2 text-xs font-semibold text-brand-text-muted hover:text-white rounded-lg transition-colors">
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save Bar ── */}
      <AnimatePresence>
        {isDirty && selectedBrand && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4">
            <div className="bg-brand-surface border border-brand-primary/30 rounded-2xl shadow-2xl p-3.5 flex items-center gap-4">
              <AlertCircle className="w-4 h-4 text-brand-primary flex-shrink-0" />
              <span className="text-xs font-mono text-brand-text-muted">
                Unsaved changes for {selectedBrand.name}
              </span>
              <button
                onClick={() => {
                  setContentHours(null);
                  setNewsHours(null);
                }}
                className="text-xs font-bold text-brand-text-muted hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading === 'save'}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold font-mono uppercase tracking-wider hover:bg-brand-primary/90 transition-all disabled:opacity-50">
                {actionLoading === 'save' ? (
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
