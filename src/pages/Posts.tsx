import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  FileText, Send, Plus, Clock, X, CheckCircle2, Trash2, AlertCircle, 
  RefreshCcw, Facebook, Twitter, Linkedin, Instagram, MessageCircle,
  Calendar, Eye, Edit3, Copy, MoreHorizontal, TrendingUp,
  Filter, Search, Zap, Layers
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface PostRecord {
  id: string; topic?: string; category?: string; caption?: string;
  platform?: string; platforms?: string[]; state?: string;
  engagement?: number; created_at?: string; scheduled_for?: string; title?: string;
}

type TabId = 'published' | 'drafts' | 'scheduled';

const PLATFORM_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  facebook:  { icon: Facebook,      color: 'text-[#1877F2]', bg: 'bg-[#1877F2]/10', border: 'border-[#1877F2]/20', label: 'Facebook' },
  twitter:   { icon: Twitter,       color: 'text-sky-400',    bg: 'bg-sky-400/10',    border: 'border-sky-400/20',    label: 'X/Twitter' },
  linkedin:  { icon: Linkedin,      color: 'text-[#0A66C2]', bg: 'bg-[#0A66C2]/10', border: 'border-[#0A66C2]/20', label: 'LinkedIn' },
  instagram: { icon: Instagram,     color: 'text-[#E4405F]', bg: 'bg-[#E4405F]/10', border: 'border-[#E4405F]/20', label: 'Instagram' },
  whatsapp:  { icon: MessageCircle, color: 'text-[#25D366]', bg: 'bg-[#25D366]/10', border: 'border-[#25D366]/20', label: 'WhatsApp' },
};

const CATEGORIES = ['Announcement', 'Educational', 'Engagement', 'Promotional', 'Culture', 'News', 'Behind the Scenes'];

function timeAgo(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = Math.max(0, Date.now() - d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SkeletonCard = () => (
  <div className="bg-brand-surface border border-brand-border/50 rounded-2xl p-5 animate-pulse space-y-3">
    <div className="flex justify-between"><div className="h-5 w-16 bg-brand-elevated rounded-full" /><div className="h-4 w-4 bg-brand-elevated rounded" /></div>
    <div className="h-5 w-3/4 bg-brand-elevated rounded" />
    <div className="h-4 w-full bg-brand-elevated rounded" />
    <div className="h-4 w-2/3 bg-brand-elevated rounded" />
    <div className="pt-3 border-t border-brand-border/30 flex justify-between"><div className="h-3 w-16 bg-brand-elevated rounded" /><div className="h-3 w-20 bg-brand-elevated rounded" /></div>
  </div>
);

export default function Posts() {
  const { restEndpoint, masterToken } = useStore();
  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [activeTab, setActiveTab] = useState<TabId>('published');
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PostRecord | null>(null);
  const [previewPost, setPreviewPost] = useState<PostRecord | null>(null);

  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('Announcement');
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['facebook']);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later' | 'draft'>('now');
  const [scheduledFor, setScheduledFor] = useState('');

  const stateParam = activeTab === 'published' ? 'published' : activeTab === 'drafts' ? 'draft' : 'scheduled';

  const fetchPosts = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${base}/posts?state=${stateParam}&per_page=30`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      } else throw new Error('Failed to fetch');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, [restEndpoint, activeTab]);

  const filteredPosts = useMemo(() => {
    let result = [...posts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.topic || '').toLowerCase().includes(q) || 
        (p.caption || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }
    if (platformFilter !== 'all') {
      result = result.filter(p => 
        p.platform === platformFilter || (p.platforms || []).includes(platformFilter)
      );
    }
    return result;
  }, [posts, searchQuery, platformFilter]);

  const stats = useMemo(() => ({
    total: posts.length,
    engagement: posts.reduce((sum, p) => sum + (p.engagement || 0), 0),
    platforms: [...new Set(posts.map(p => p.platform).filter(Boolean))].length,
  }), [posts]);

  const resetForm = () => {
    setTopic(''); setCategory('Announcement'); setCaption('');
    setPlatforms(['facebook']); setScheduleMode('now'); setScheduledFor('');
  };

  const handleCreate = async () => {
    if (!caption.trim() || platforms.length === 0) return;
    setActionLoading('create');
    try {
      const res = await fetch(`${base}/posts`, {
        method: 'POST', headers,
        body: JSON.stringify({ caption, topic, category, state: scheduleMode === 'draft' ? 'draft' : 'publish', platforms, scheduled_for: scheduleMode === 'later' ? scheduledFor : undefined }),
      });
      if (res.ok) {
        toast.success(scheduleMode === 'draft' ? 'Draft saved' : scheduleMode === 'later' ? 'Post scheduled' : 'Post published');
        setIsModalOpen(false); resetForm(); fetchPosts();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Create failed');
      }
    } catch (err: any) { toast.error(err.message || 'Create failed'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading('delete');
    try {
      const res = await fetch(`${base}/posts/${deleteTarget.id}`, { method: 'DELETE', headers });
      if (res.ok) { toast.success('Post deleted'); setDeleteTarget(null); fetchPosts(); }
      else { const d = await res.json(); toast.error(d.error || 'Delete failed'); }
    } catch (err: any) { toast.error(err.message || 'Delete failed'); }
    finally { setActionLoading(null); }
  };

  const handleForcePost = async () => {
    setActionLoading('force');
    try {
      const res = await fetch(`${base}/bot/post`, { method: 'POST', headers });
      const d = await res.json();
      if (d.queued) { toast.success('Post queued'); fetchPosts(); }
      else toast.error('Queue full');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const submitDisabled = !caption.trim() || platforms.length === 0 || actionLoading !== null || (scheduleMode === 'later' && !scheduledFor);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto pb-24 space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
            <FileText className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Content Studio</h1>
            <p className="text-[10px] text-brand-text-muted font-mono uppercase tracking-wider mt-0.5">
              {stats.total} posts · {stats.engagement.toLocaleString()} engagement · {stats.platforms} platforms
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleForcePost} disabled={actionLoading === 'force'}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-primary/30 text-brand-text-muted hover:text-white text-xs font-bold font-mono uppercase tracking-wider transition-all disabled:opacity-50">
            {actionLoading === 'force' ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Force Post
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold font-mono uppercase tracking-wider hover:bg-brand-primary/90 transition-all shadow-glow-primary">
            <Plus className="w-4 h-4" /> New Post
          </motion.button>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1 p-1 bg-brand-surface border border-brand-border/50 rounded-xl">
          {(['published', 'drafts', 'scheduled'] as TabId[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('px-4 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all',
                activeTab === tab ? 'bg-brand-primary text-white shadow-glow-primary' : 'text-brand-text-muted hover:text-white')}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text-muted" />
            <input type="text" placeholder="Search posts..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 bg-brand-surface border border-brand-border/50 rounded-xl text-xs text-brand-text placeholder-brand-text-muted font-mono focus:outline-none focus:border-brand-primary/50 w-44 transition-all" />
          </div>
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
            className="bg-brand-surface border border-brand-border/50 rounded-xl px-2.5 py-2 text-xs text-brand-text font-mono focus:outline-none focus:border-brand-primary/50">
            <option value="all">All Platforms</option>
            {Object.entries(PLATFORM_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Post Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="py-16 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3 opacity-50" />
          <p className="text-sm text-brand-text-muted font-mono">{error}</p>
          <button onClick={fetchPosts} className="mt-3 text-xs text-brand-primary hover:underline">Retry</button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-brand-border/50 rounded-2xl">
          <FileText className="w-12 h-12 text-brand-text-muted/30 mx-auto mb-4" />
          <p className="text-sm text-brand-text-muted font-mono">
            {posts.length === 0 ? 'No posts yet. Create your first post.' : 'No posts match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post, i) => {
              const platformKey = post.platform || (post.platforms?.[0]) || 'facebook';
              const config = PLATFORM_CONFIG[platformKey] || PLATFORM_CONFIG.facebook;
              const Icon = config.icon;

              return (
                <motion.div key={post.id} layout
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-brand-surface border border-brand-border/50 rounded-2xl p-5 hover:border-brand-primary/30 transition-all group flex flex-col">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold font-mono uppercase border', config.bg, config.color, config.border)}>
                      <Icon className="w-3 h-3" /> {config.label}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setPreviewPost(post)} className="p-1 rounded hover:bg-brand-elevated text-brand-text-muted"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { navigator.clipboard.writeText(post.caption || ''); toast.success('Copied'); }}
                        className="p-1 rounded hover:bg-brand-elevated text-brand-text-muted"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(post)} className="p-1 rounded hover:bg-red-500/10 text-brand-text-muted hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="font-bold text-white text-sm mb-2 leading-snug">{post.topic || post.category || 'Untitled'}</h3>
                  <p className="text-xs text-brand-text-muted mb-4 flex-1 line-clamp-3 leading-relaxed">{post.caption || 'No caption'}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-brand-border/30 text-[10px] font-mono">
                    <span className="text-brand-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeAgo(post.created_at || post.scheduled_for)}
                    </span>
                    {activeTab === 'published' && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {(post.engagement ?? 0).toLocaleString()}
                      </span>
                    )}
                    {activeTab === 'scheduled' && (
                      <span className="text-brand-primary font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Scheduled
                      </span>
                    )}
                    {activeTab === 'drafts' && (
                      <span className="text-amber-400 font-bold">Draft</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setPreviewPost(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-brand-surface border border-brand-border/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Post Preview</h3>
                <button onClick={() => setPreviewPost(null)} className="p-1 rounded-lg hover:bg-brand-elevated text-brand-text-muted"><X className="w-4 h-4" /></button>
              </div>
              <div className="bg-brand-bg border border-brand-border/30 rounded-xl p-4 mb-4">
                <p className="text-xs text-brand-text-muted font-mono uppercase mb-2">{previewPost.topic || previewPost.category}</p>
                <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{previewPost.caption}</p>
              </div>
              <div className="flex gap-2 text-[10px] font-mono text-brand-text-muted">
                <span>Platform: {previewPost.platform || (previewPost.platforms || []).join(', ')}</span>
                <span>·</span>
                <span>{timeAgo(previewPost.created_at)}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-brand-surface border border-brand-border/50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
              
              <div className="p-4 border-b border-brand-border/50 flex items-center justify-between bg-brand-elevated/20 sticky top-0 z-10">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">New Post</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-brand-elevated text-brand-text-muted"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1.5 block">Topic</label>
                  <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Product launch"
                    className="w-full bg-brand-elevated border border-brand-border/50 rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary/50 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1.5 block">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full bg-brand-elevated border border-brand-border/50 rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary/50 transition-all">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1.5 block">Caption *</label>
                  <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4}
                    placeholder="Write your post content..."
                    className="w-full bg-brand-elevated border border-brand-border/50 rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary/50 transition-all resize-none" />
                  <p className="text-[9px] text-brand-text-muted font-mono text-right mt-1">{caption.length} chars</p>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1.5 block">Platforms *</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
                      <button key={key} type="button" onClick={() => togglePlatform(key)}
                        className={cn('px-3 py-2 rounded-xl text-[10px] font-bold font-mono uppercase tracking-wider border transition-all flex items-center gap-1.5',
                          platforms.includes(key) ? cfg.bg + ' ' + cfg.color + ' ' + cfg.border : 'bg-brand-elevated border-brand-border/50 text-brand-text-muted')}>
                        <cfg.icon className="w-3 h-3" /> {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1.5 block">Publishing</label>
                  <div className="flex gap-1.5">
                    {([
                      { id: 'now', label: 'Publish Now', icon: Send },
                      { id: 'later', label: 'Schedule', icon: Calendar },
                      { id: 'draft', label: 'Save Draft', icon: FileText },
                    ] as const).map(opt => (
                      <button key={opt.id} type="button" onClick={() => setScheduleMode(opt.id)}
                        className={cn('flex-1 py-2 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5',
                          scheduleMode === opt.id ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' : 'bg-brand-elevated border-brand-border/50 text-brand-text-muted')}>
                        <opt.icon className="w-3 h-3" /> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {scheduleMode === 'later' && (
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1.5 block">Date & Time</label>
                    <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)}
                      className="w-full bg-brand-elevated border border-brand-border/50 rounded-xl px-3 py-2.5 text-sm text-brand-text font-mono focus:outline-none focus:border-brand-primary/50 transition-all" />
                  </div>
                )}
                {caption.trim() && (
                  <div className="bg-brand-bg border border-brand-border/30 rounded-xl p-4">
                    <span className="text-[9px] font-mono font-bold uppercase text-brand-text-muted">Preview</span>
                    <p className="text-sm text-white mt-2 whitespace-pre-wrap line-clamp-4 leading-relaxed">{caption}</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-brand-border/50 flex gap-2 bg-brand-elevated/10">
                <button onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-brand-surface border border-brand-border text-brand-text-muted hover:text-white text-xs font-semibold transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={submitDisabled}
                  className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-glow-primary">
                  {actionLoading === 'create' ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {scheduleMode === 'now' ? 'Publish' : scheduleMode === 'later' ? 'Schedule' : 'Save Draft'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-brand-surface border border-brand-border/50 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-white text-center">Delete Post?</h3>
              <p className="text-xs text-brand-text-muted text-center mt-1 mb-5">
                "{deleteTarget.topic || deleteTarget.category || 'Untitled'}" will be permanently removed.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2 rounded-xl bg-brand-surface border border-brand-border text-brand-text-muted text-xs font-semibold">Cancel</button>
                <button onClick={handleDelete} disabled={actionLoading === 'delete'}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold disabled:opacity-50">
                  {actionLoading === 'delete' ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
