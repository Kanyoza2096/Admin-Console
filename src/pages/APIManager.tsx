import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  Key, Plus, Trash2, Copy, CheckCircle, AlertTriangle, RefreshCw,
  Shield, Building, Eye, Clock, Zap, Users, Globe, Wifi,
  ChevronDown, X, Search, Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface APIKey {
  id: string; key_id?: string; label: string; prefix: string;
  created_at: string; last_used?: string | null; revoked: boolean;
  key_type?: string; workspace_id?: string; expires_at?: string | null; request_count?: number;
}

const KEY_TYPES = [
  { value: 'admin', label: 'Admin', icon: Shield, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { value: 'workspace', label: 'Workspace', icon: Building, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { value: 'readonly', label: 'Read-Only', icon: Eye, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  { value: 'plugin', label: 'Plugin', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { value: 'temporary', label: 'Temporary', icon: Clock, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
];

const KEY_PERMISSIONS: Record<string, string[]> = {
  admin: ['Full API access', 'Generate keys', 'Manage workspaces', 'Toggle features', 'View all data'],
  workspace: ['Access own workspace', 'CRUD records', 'View analytics', 'Use AI Chat'],
  readonly: ['View data only', 'No modifications'],
  plugin: ['Specific plugin access', 'Execute commands'],
  temporary: ['Same as selected type', 'Expires automatically'],
};

const SKELETON_ROW = () => (
  <div className="bg-brand-surface/50 border border-brand-border/50 rounded-2xl p-5 animate-pulse">
    <div className="flex items-center gap-4"><div className="w-10 h-10 bg-brand-elevated rounded-xl" /><div className="space-y-2 flex-1"><div className="h-4 w-32 bg-brand-elevated rounded" /><div className="h-3 w-48 bg-brand-elevated rounded" /></div></div>
  </div>
);

export default function APIManager() {
  const { restEndpoint, masterToken } = useStore();
  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [keyLabel, setKeyLabel] = useState('');
  const [keyType, setKeyType] = useState('admin');
  const [keyWorkspace, setKeyWorkspace] = useState('');
  const [keyExpiry, setKeyExpiry] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ token: string; prefix: string; id: string } | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<APIKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchKeys = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${base}/keys`, { headers });
      if (res.ok) {
        const d = await res.json();
        const list = (d.keys || []).map((k: any) => ({
          ...k,
          key_type: k.key_type || (k.label?.includes('workspace') ? 'workspace' : k.label?.includes('read') ? 'readonly' : 'admin'),
        }));
        setKeys(list);
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchKeys(); }, [restEndpoint]);

  const handleGenerate = async () => {
    if (!keyLabel.trim()) { toast.error('Key label is required'); return; }
    setGenerating(true);
    try {
      const payload: any = { label: `${keyType}_${keyLabel.trim()}` };
      if (keyType === 'workspace') payload.workspace_id = keyWorkspace || 'default';
      if (keyExpiry && keyExpiry !== 'never') {
        const durations: Record<string, number> = { '24h': 86400, '7d': 604800, '30d': 2592000 };
        payload.expires_in = durations[keyExpiry] || 0;
      }
      const res = await fetch(`${base}/keys/generate`, { method: 'POST', headers, body: JSON.stringify(payload) });
      const d = await res.json();
      if (res.ok) {
        setGeneratedKey({ token: d.token, prefix: d.prefix, id: d.key_id });
        toast.success('Key generated — copy it now');
        fetchKeys(); resetForm();
      } else { toast.error(d.error || 'Generation failed'); }
    } catch (err: any) { toast.error(err.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const resetForm = () => { setKeyLabel(''); setKeyType('admin'); setKeyWorkspace(''); setKeyExpiry(''); setShowForm(false); };

  const handleCopy = (token: string) => { navigator.clipboard.writeText(token); toast.success('Key copied'); };

  const handleRevoke = async () => {
    if (!confirmDelete) return;
    setRevoking(true);
    try {
      const id = confirmDelete.key_id || confirmDelete.id;
      await fetch(`${base}/keys/${id}`, { method: 'DELETE', headers });
      toast.success(`Key "${confirmDelete.prefix}" revoked`);
      setConfirmDelete(null); fetchKeys();
    } catch { toast.error('Revoke failed'); }
    finally { setRevoking(false); }
  };

  const getKeyTypeInfo = (type: string) => KEY_TYPES.find(t => t.value === type) || KEY_TYPES[0];
  const activeKeys = keys.filter(k => !k.revoked);

  const filteredKeys = useMemo(() => {
    let result = [...activeKeys];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(k => k.label.toLowerCase().includes(q) || k.prefix.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') result = result.filter(k => (k.key_type || 'admin') === typeFilter);
    return result;
  }, [activeKeys, searchQuery, typeFilter]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
            <Key className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">API Manager</h1>
            <p className="text-[10px] text-brand-text-muted font-mono uppercase tracking-wider mt-0.5">
              {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchKeys} className="p-2 rounded-xl bg-brand-surface border border-brand-border/50 hover:border-brand-primary/30 text-brand-text-muted hover:text-white transition-all">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold font-mono uppercase tracking-wider hover:bg-brand-primary/90 transition-all shadow-glow-primary">
            <Plus className="w-4 h-4" /> Generate Key
          </motion.button>
        </div>
      </div>

      {/* Generated key */}
      <AnimatePresence>
        {generatedKey && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Key Generated</h3>
              <button onClick={() => setGeneratedKey(null)}><X className="w-4 h-4 text-brand-text-muted" /></button>
            </div>
            <p className="text-[10px] text-brand-text-muted mb-3">Copy now — <span className="text-amber-400 font-bold">not shown again.</span></p>
            <div className="flex items-center gap-2 bg-brand-elevated border border-brand-border/30 rounded-xl p-3">
              <code className="flex-1 text-xs font-mono text-emerald-400 break-all">{generatedKey.token}</code>
              <button onClick={() => handleCopy(generatedKey.token)}
                className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold flex items-center gap-1 hover:bg-brand-primary/90">
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <div className="flex gap-4 mt-2 text-[9px] font-mono text-brand-text-muted">
              <span>ID: {generatedKey.id}</span><span>Prefix: {generatedKey.prefix}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-brand-surface border border-brand-border/50 rounded-2xl p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono font-bold uppercase text-brand-text flex items-center gap-2"><Key className="w-4 h-4 text-brand-primary" /> Generate New Key</h3>
              <button onClick={resetForm}><X className="w-4 h-4 text-brand-text-muted" /></button>
            </div>

            <div className="mb-4">
              <label className="text-[9px] font-mono font-bold uppercase text-brand-text-muted mb-2 block">Type</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {KEY_TYPES.map(type => (
                  <button key={type.value} onClick={() => setKeyType(type.value)}
                    className={cn('p-3 rounded-xl border text-left transition-all',
                      keyType === type.value ? `${type.bg} ${type.border} ${type.color}` : 'bg-brand-elevated border-brand-border/50 text-brand-text-muted hover:border-brand-primary/30')}>
                    <type.icon className={cn('w-4 h-4 mb-1', keyType === type.value ? type.color : 'text-brand-text-muted')} />
                    <span className="text-[10px] font-bold block">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-[9px] font-mono font-bold uppercase text-brand-text-muted mb-1 block">Label</label>
                <input value={keyLabel} onChange={e => setKeyLabel(e.target.value)} placeholder="e.g. Church Portal"
                  className="w-full bg-brand-elevated border border-brand-border/50 rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary/50 transition-all" />
              </div>
              {keyType === 'workspace' && (
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase text-brand-text-muted mb-1 block">Workspace</label>
                  <input value={keyWorkspace} onChange={e => setKeyWorkspace(e.target.value)} placeholder="default"
                    className="w-full bg-brand-elevated border border-brand-border/50 rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary/50 transition-all" />
                </div>
              )}
              {keyType === 'temporary' && (
                <div>
                  <label className="text-[9px] font-mono font-bold uppercase text-brand-text-muted mb-1 block">Expiry</label>
                  <select value={keyExpiry} onChange={e => setKeyExpiry(e.target.value)}
                    className="w-full bg-brand-elevated border border-brand-border/50 rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary/50 transition-all">
                    <option value="">Select</option><option value="24h">24 Hours</option><option value="7d">7 Days</option><option value="30d">30 Days</option><option value="never">Never</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-brand-elevated/30 rounded-xl p-3 mb-4">
              <span className="text-[9px] font-mono uppercase text-brand-text-muted">Permissions</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {KEY_PERMISSIONS[keyType]?.map(p => (
                  <span key={p} className="text-[9px] font-mono text-brand-text-muted bg-brand-surface px-2 py-0.5 rounded-full border border-brand-border/30">{p}</span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl bg-brand-surface border border-brand-border text-brand-text-muted hover:text-white text-xs font-semibold transition-colors">Cancel</button>
              <button onClick={handleGenerate} disabled={generating || !keyLabel.trim()}
                className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold shadow-glow-primary disabled:opacity-50 transition-all flex items-center gap-1.5">
                {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text-muted" />
          <input type="text" placeholder="Search keys..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-brand-surface border border-brand-border/50 rounded-xl text-xs text-brand-text placeholder-brand-text-muted font-mono focus:outline-none focus:border-brand-primary/50 transition-all" />
        </div>
        <div className="flex gap-1 p-1 bg-brand-surface border border-brand-border/50 rounded-xl">
          <button onClick={() => setTypeFilter('all')}
            className={cn('px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase', typeFilter === 'all' ? 'bg-brand-primary text-white' : 'text-brand-text-muted')}>All</button>
          {KEY_TYPES.map(t => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)}
              className={cn('px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase', typeFilter === t.value ? 'bg-brand-primary text-white' : 'text-brand-text-muted')}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Key list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <SKELETON_ROW key={i} />)}</div>
      ) : error ? (
        <div className="py-12 text-center text-red-400 font-mono text-sm">Failed to load keys. <button onClick={fetchKeys} className="text-brand-primary hover:underline">Retry</button></div>
      ) : filteredKeys.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-brand-border/50 rounded-2xl">
          <Key className="w-10 h-10 text-brand-text-muted/30 mx-auto mb-3" />
          <p className="text-sm text-brand-text-muted font-mono">{activeKeys.length === 0 ? 'No API keys yet.' : 'No keys match your filters.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredKeys.map(key => {
            const typeInfo = getKeyTypeInfo(key.key_type || 'admin');
            const isExpanded = expandedKey === (key.key_id || key.id);
            return (
              <motion.div key={key.key_id || key.id} layout
                className="bg-brand-surface border border-brand-border/50 rounded-2xl overflow-hidden hover:border-brand-primary/20 transition-all">
                <button onClick={() => setExpandedKey(isExpanded ? null : (key.key_id || key.id))}
                  className="w-full p-4 flex items-center justify-between text-left group">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', typeInfo.bg)}>
                      <typeInfo.icon className={cn('w-4 h-4', typeInfo.color)} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">{key.label}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-[10px] font-mono text-brand-text-muted">{key.prefix}</code>
                        <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase border', typeInfo.bg, typeInfo.color, typeInfo.border)}>{typeInfo.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-brand-text-muted hidden sm:block">
                      {key.last_used ? `Used ${new Date(key.last_used).toLocaleDateString()}` : 'Never used'}
                    </span>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                      <ChevronDown className="w-4 h-4 text-brand-text-muted group-hover:text-white transition-colors" />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 border-t border-brand-border/30">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mb-4 text-[10px] font-mono">
                        {[
                          { label: 'Created', value: new Date(key.created_at).toLocaleDateString() },
                          { label: 'Type', value: typeInfo.label },
                          { label: 'Last Used', value: key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never' },
                          { label: 'Status', value: 'Active', color: 'text-emerald-400' },
                        ].map(row => (
                          <div key={row.label}>
                            <span className="text-brand-text-muted uppercase">{row.label}</span>
                            <p className={cn('text-white mt-0.5 font-bold', row.color)}>{row.value}</p>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setConfirmDelete(key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold font-mono uppercase hover:bg-red-500/20 transition-all">
                        <Trash2 className="w-3 h-3" /> Revoke
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-brand-surface border border-brand-border/50 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-white text-center">Revoke Key?</h3>
              <p className="text-xs text-brand-text-muted text-center mt-1 mb-5">"{confirmDelete.label}" will stop working immediately.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl bg-brand-surface border border-brand-border text-brand-text-muted text-xs font-semibold">Cancel</button>
                <button onClick={handleRevoke} disabled={revoking} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold disabled:opacity-50">{revoking ? 'Revoking…' : 'Revoke'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
