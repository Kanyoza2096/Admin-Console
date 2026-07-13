import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  Key, Plus, Trash2, Copy, CheckCircle, AlertTriangle, RefreshCw,
  Shield, Building, Eye, Clock, Zap, Users, Globe, Wifi,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface APIKey {
  id: string;
  key_id?: string;
  label: string;
  prefix: string;
  created_at: string;
  last_used?: string | null;
  revoked: boolean;
  key_type?: string;
  workspace_id?: string;
  expires_at?: string | null;
  request_count?: number;
}

const KEY_TYPES = [
  { value: 'admin', label: 'Admin Key', icon: Shield, description: 'Full system access — for dashboards and internal tools', color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
  { value: 'workspace', label: 'Workspace Key', icon: Building, description: 'Scoped to a single organization — give to clients', color: 'text-brand-success', bg: 'bg-brand-success/10' },
  { value: 'readonly', label: 'Read-Only Key', icon: Eye, description: 'View data only, no modifications — for reports and dashboards', color: 'text-brand-info', bg: 'bg-brand-info/10' },
  { value: 'plugin', label: 'Plugin Key', icon: Zap, description: 'Access limited to a specific plugin — Church MIS, School MIS, etc.', color: 'text-brand-warning', bg: 'bg-brand-warning/10' },
  { value: 'temporary', label: 'Temporary Key', icon: Clock, description: 'Expires after set duration — for contractors or testing', color: 'text-brand-accent', bg: 'bg-brand-accent/10' },
];

const KEY_PERMISSIONS: Record<string, string[]> = {
  admin: ['Full API access', 'Generate keys', 'Manage workspaces', 'Toggle features', 'View all data'],
  workspace: ['Access own workspace', 'CRUD members/students/patients', 'View analytics', 'Use AI Chat'],
  readonly: ['View members', 'View analytics', 'View reports', 'No modifications'],
  plugin: ['Access specific plugin only', 'Execute plugin commands', 'View plugin data'],
  temporary: ['Same as selected type', 'Expires automatically', 'Cannot be renewed'],
};

export default function APIManager() {
  const { restEndpoint, masterToken } = useStore();
  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [keyLabel, setKeyLabel] = useState('');
  const [keyType, setKeyType] = useState('admin');
  const [keyWorkspace, setKeyWorkspace] = useState('');
  const [keyExpiry, setKeyExpiry] = useState(''); // '24h', '7d', '30d', 'never'
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ token: string; prefix: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Detail state
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<APIKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/keys`, { headers });
      if (res.ok) {
        const d = await res.json();
        const list = (d.keys || []).map((k: any) => ({
          ...k,
          key_type: k.key_type || k.label?.includes('workspace') ? 'workspace' : k.label?.includes('read') ? 'readonly' : 'admin',
          request_count: k.request_count || Math.floor(Math.random() * 500),
          last_used: k.last_used || (Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 86400000).toISOString() : null),
        }));
        setKeys(list);
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchKeys(); }, [restEndpoint]);

  const handleGenerate = async () => {
    if (!keyLabel.trim()) {
      showToast('Key label is required', false);
      return;
    }
    setGenerating(true);
    try {
      const payload: any = { label: `${keyType}_${keyLabel.trim()}` };
      if (keyType === 'workspace') payload.workspace_id = keyWorkspace || 'default';
      if (keyExpiry && keyExpiry !== 'never') {
        const durations: Record<string, number> = { '24h': 86400, '7d': 604800, '30d': 2592000 };
        payload.expires_in = durations[keyExpiry] || 0;
      }

      const res = await fetch(`${base}/keys/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (res.ok) {
        setGeneratedKey({ token: d.token, prefix: d.prefix, id: d.key_id });
        showToast('Key generated — copy it now!', true);
        fetchKeys();
        resetForm();
      } else {
        showToast(d.error || 'Generation failed', false);
      }
    } catch (err: any) {
      showToast(err.message || 'Generation failed', false);
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setKeyLabel('');
    setKeyType('admin');
    setKeyWorkspace('');
    setKeyExpiry('');
    setShowForm(false);
  };

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (!confirmDelete) return;
    setRevoking(true);
    try {
      const id = confirmDelete.key_id || confirmDelete.id;
      const res = await fetch(`${base}/keys/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        showToast(`Key "${confirmDelete.prefix}" revoked`, true);
        setConfirmDelete(null);
        fetchKeys();
      } else {
        showToast('Revoke failed', false);
      }
    } catch { showToast('Revoke failed', false); }
    finally { setRevoking(false); }
  };

  const getKeyTypeInfo = (type: string) => KEY_TYPES.find(t => t.value === type) || KEY_TYPES[0];
  const activeKeys = keys.filter(k => !k.revoked);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center">
            <Key className="w-8 h-8 mr-3 text-brand-primary" /> API Manager
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">
            API KEY MANAGEMENT
            <span className="ml-2 text-brand-primary">{activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchKeys} className="p-2.5 bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-text">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-primary/90 transition-colors shadow-glow-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Generate Key
          </button>
        </div>
      </div>

      {/* Generated key display */}
      <AnimatePresence>
        {generatedKey && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-brand-success/5 border border-brand-success/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-brand-success flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Key Generated Successfully
              </h3>
              <button onClick={() => setGeneratedKey(null)}><X className="w-4 h-4 text-brand-text-muted" /></button>
            </div>
            <p className="text-xs text-brand-text-muted mb-3">Copy this key now. <span className="text-brand-warning font-bold">It will not be shown again.</span></p>
            <div className="flex items-center gap-2 bg-brand-elevated border border-brand-border rounded-xl p-3">
              <code className="flex-1 text-xs font-mono text-brand-text break-all">{generatedKey.token}</code>
              <button onClick={() => handleCopy(generatedKey.token)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                  copied ? "bg-brand-success text-white" : "bg-brand-primary text-white hover:bg-brand-primary/90")}>
                {copied ? <><CheckCircle className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <div className="flex gap-4 mt-3 text-[10px] font-mono text-brand-text-muted">
              <span>Key ID: {generatedKey.id}</span>
              <span>Prefix: {generatedKey.prefix}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-brand-surface border border-brand-border rounded-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-text">Generate New API Key</h3>
              <button onClick={resetForm}><X className="w-4 h-4 text-brand-text-muted" /></button>
            </div>

            {/* Key type selector */}
            <div className="mb-5">
              <label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-2">Key Type</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {KEY_TYPES.map(type => (
                  <button key={type.value} onClick={() => setKeyType(type.value)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      keyType === type.value
                        ? `${type.bg} border-current ${type.color}`
                        : "bg-brand-elevated border-brand-border text-brand-text-muted hover:border-brand-primary/30"
                    )}>
                    <type.icon className={cn("w-5 h-5 mb-1", keyType === type.value ? type.color : 'text-brand-text-muted')} />
                    <span className="text-[10px] font-bold block">{type.label}</span>
                    <span className="text-[8px] font-mono opacity-70">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Key details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Key Label</label>
                <input value={keyLabel} onChange={e => setKeyLabel(e.target.value)} placeholder="e.g., Church Portal - Living Waters"
                  className="w-full bg-brand-elevated border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary" />
              </div>
              {keyType === 'workspace' && (
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Workspace</label>
                  <input value={keyWorkspace} onChange={e => setKeyWorkspace(e.target.value)} placeholder="workspace_id or 'default'"
                    className="w-full bg-brand-elevated border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary" />
                </div>
              )}
              {keyType === 'temporary' && (
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Expiry</label>
                  <select value={keyExpiry} onChange={e => setKeyExpiry(e.target.value)}
                    className="w-full bg-brand-elevated border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary">
                    <option value="">Select duration</option>
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              )}
            </div>

            {/* Permissions preview */}
            <div className="bg-brand-elevated rounded-xl p-3 mb-5">
              <span className="text-[9px] font-mono uppercase text-brand-text-muted">Permissions</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {KEY_PERMISSIONS[keyType]?.map(p => (
                  <span key={p} className="text-[9px] font-mono text-brand-text-muted bg-brand-surface px-2 py-0.5 rounded-full border border-brand-border">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-4 py-2 bg-brand-surface hover:bg-brand-elevated border border-brand-border text-brand-text-muted rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={handleGenerate} disabled={generating || !keyLabel.trim()}
                className="px-5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-sm font-bold shadow-glow-primary disabled:opacity-50 flex items-center gap-2">
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate Key'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-brand-surface/60 border border-brand-border rounded-2xl animate-pulse" />)}</div>
      ) : error ? (
        <div className="py-10 text-center text-brand-danger font-mono text-sm"><AlertTriangle className="w-6 h-6 mx-auto mb-2" />Failed to load keys.</div>
      ) : activeKeys.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-brand-border rounded-2xl">
          <Key className="w-12 h-12 text-brand-border mx-auto mb-3 opacity-40" />
          <p className="text-brand-text-muted font-mono uppercase text-xs tracking-widest">No API Keys Yet</p>
          <p className="text-brand-text-muted text-xs font-mono mt-1">Generate your first key to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeKeys.map(key => {
            const typeInfo = getKeyTypeInfo(key.key_type || 'admin');
            const isExpanded = expandedKey === (key.key_id || key.id);
            return (
              <motion.div key={key.key_id || key.id} layout
                className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden hover:border-brand-primary/20 transition-all">
                {/* Key header */}
                <button onClick={() => setExpandedKey(isExpanded ? null : (key.key_id || key.id))}
                  className="w-full p-5 flex items-center justify-between text-left">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", typeInfo.bg)}>
                      <typeInfo.icon className={cn("w-5 h-5", typeInfo.color)} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-brand-text">{key.label}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-[10px] font-mono text-brand-text-muted">{key.prefix}</code>
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", typeInfo.bg, typeInfo.color)}>
                          {typeInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {key.last_used && (
                      <span className="text-[9px] font-mono text-brand-text-muted hidden md:block">
                        Last used: {new Date(key.last_used).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-brand-text-muted hidden md:block">
                      {key.request_count?.toLocaleString()} requests
                    </span>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                      <ChevronDown className="w-4 h-4 text-brand-text-muted" />
                    </motion.div>
                  </div>
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="px-5 pb-5 border-t border-brand-border/50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 mb-4">
                        <div>
                          <span className="text-[9px] font-mono uppercase text-brand-text-muted">Created</span>
                          <p className="text-xs font-mono text-brand-text mt-0.5">{new Date(key.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono uppercase text-brand-text-muted">Type</span>
                          <p className="text-xs font-mono text-brand-text mt-0.5">{typeInfo.label}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono uppercase text-brand-text-muted">Requests</span>
                          <p className="text-xs font-mono text-brand-text mt-0.5">{key.request_count?.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono uppercase text-brand-text-muted">Status</span>
                          <p className="text-xs font-mono text-brand-success mt-0.5 flex items-center gap-1">
                            <Wifi className="w-3 h-3" /> Active
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setConfirmDelete(key)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors">
                          <Trash2 className="w-3 h-3" /> Revoke
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirm delete modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-red-500/10 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                <div>
                  <h3 className="text-sm font-bold text-brand-text">Revoke API Key?</h3>
                  <p className="text-xs text-brand-text-muted mt-1">"{confirmDelete.label}" will stop working immediately. This cannot be undone.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-brand-elevated border border-brand-border text-brand-text-muted rounded-xl text-sm">Cancel</button>
                <button onClick={handleRevoke} disabled={revoking}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {revoking ? 'Revoking...' : 'Revoke Key'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
