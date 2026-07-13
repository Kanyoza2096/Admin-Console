import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { Palette, Plus, Trash2, Edit2, AlertTriangle, X, RefreshCw, CheckCircle, Bot } from 'lucide-react';
import { cn } from '../lib/utils';

interface Brand {
  id: string;
  name: string;
  tone?: string;
  hashtags?: string;
  language?: string;
  audience?: string;
  workspace_id?: string;
  ai_profile_id?: string;
}

interface AIProfile {
  id: string;
  name: string;
  tone?: string;
  expertise?: string;
}

export default function Brands() {
  const { restEndpoint, masterToken } = useStore();
  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [aiProfiles, setAiProfiles] = useState<AIProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: '', tone: '', hashtags: '', language: '', audience: '', ai_profile_id: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch(`${base}/workspaces`, { headers });
      if (res.ok) {
        const d = await res.json();
        const ws = d.workspaces || [];
        setWorkspaces(ws);
        if (!selectedWorkspaceId && ws.length > 0) setSelectedWorkspaceId(ws[0].id);
      }
    } catch {}
  };

  const fetchBrands = async () => {
    if (!selectedWorkspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/workspaces/${selectedWorkspaceId}/brands`, { headers });
      if (res.ok) {
        const d = await res.json();
        setBrands(d.brands || []);
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchAiProfiles = async () => {
    if (!selectedWorkspaceId) return;
    try {
      const res = await fetch(`${base}/workspaces/${selectedWorkspaceId}/ai-profiles`, { headers });
      if (res.ok) {
        const d = await res.json();
        setAiProfiles(d.ai_profiles || []);
      }
    } catch {}
  };

  useEffect(() => { fetchWorkspaces(); }, [restEndpoint]);
  useEffect(() => { fetchBrands(); fetchAiProfiles(); }, [restEndpoint, selectedWorkspaceId]);

  const resetForm = () => { setForm({ name: '', tone: '', hashtags: '', language: '', audience: '', ai_profile_id: '' }); setEditing(null); setShowForm(false); };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({ 
      name: b.name, tone: b.tone || '',  hashtags: Array.isArray(b.hashtags) ? b.hashtags.join(', ') : (b.hashtags || ''),
      language: b.language || '', audience: b.audience || '', 
      ai_profile_id: b.ai_profile_id || '' 
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Brand name is required', false); return; }
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        hashtags: form.hashtags ? form.hashtags.split(',').map(t => t.trim()).filter(Boolean) : [],
        ai_profile_id: form.ai_profile_id || null,
      };
      const url = editing ? `${base}/brands/${editing.id}` : `${base}/workspaces/${selectedWorkspaceId}/brands`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (res.ok) {
        showToast(editing ? 'Brand updated' : 'Brand created', true);
        resetForm();
        fetchBrands();
      } else {
        const d = await res.json();
        showToast(d.error || 'Save failed', false);
      }
    } catch (err: any) { showToast(err.message || 'Save failed', false); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${base}/brands/${confirmDelete.id}`, { method: 'DELETE', headers });
      if (res.ok) {
        showToast(`"${confirmDelete.name}" deleted`, true);
        setConfirmDelete(null);
        fetchBrands();
      } else {
        const d = await res.json();
        showToast(d.error || 'Delete failed', false);
      }
    } catch (err: any) { showToast(err.message || 'Delete failed', false); }
    finally { setDeleting(false); }
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center">
            <Palette className="w-8 h-8 mr-3 text-brand-primary" /> Brands
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">BRAND VOICE & IDENTITY PROFILES</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedWorkspaceId} onChange={e => setSelectedWorkspaceId(e.target.value)}
            className="px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary">
            {workspaces.length === 0 && <option value="">No workspaces</option>}
            {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button onClick={() => { resetForm(); setShowForm(v => !v); }}
            className="px-4 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-primary/90 transition-colors shadow-glow-primary flex items-center gap-2 disabled:opacity-50"
            disabled={!selectedWorkspaceId}>
            <Plus className="w-4 h-4" /> Add Brand
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit} className="p-5 bg-brand-surface border border-brand-border rounded-2xl space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-text">{editing ? 'Edit Brand' : 'New Brand'}</h3>
              <button type="button" onClick={resetForm}><X className="w-4 h-4 text-brand-text-muted" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" /></div>
              <div><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Tone</label><input value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} placeholder="e.g. Bold, friendly" className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" /></div>
              <div><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Language</label><input value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} placeholder="e.g. English" className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" /></div>
              <div><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Audience</label><input value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} placeholder="e.g. Young professionals" className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" /></div>
              <div className="md:col-span-2"><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Hashtags</label><input value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} placeholder="#brand #marketing" className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" /></div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> AI Profile
                </label>
                <select value={form.ai_profile_id} onChange={e => setForm(f => ({ ...f, ai_profile_id: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary">
                  <option value="">None (use workspace default)</option>
                  {aiProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.tone ? ` (${p.tone})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-brand-surface hover:bg-brand-elevated border border-brand-border text-brand-text-muted rounded-xl text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-sm font-semibold shadow-glow-primary disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Brand'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {!selectedWorkspaceId ? (
        <div className="py-16 text-center text-brand-text-muted font-mono text-xs uppercase border border-dashed border-brand-border rounded-2xl">Select a workspace to manage brands.</div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="h-40 bg-brand-surface border border-brand-border rounded-2xl animate-pulse" />)}</div>
      ) : error ? (
        <div className="py-16 text-center text-brand-danger font-mono text-sm flex flex-col items-center gap-2"><AlertTriangle className="w-6 h-6" />Failed to load brands.<button onClick={fetchBrands} className="mt-2 px-4 py-1.5 bg-brand-elevated rounded-lg text-xs font-bold">Retry</button></div>
      ) : brands.length === 0 ? (
        <div className="py-16 text-center text-brand-text-muted font-mono text-xs uppercase border border-dashed border-brand-border rounded-2xl">No brands in this workspace yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((b, idx) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * idx }}
              className="bg-brand-surface border border-brand-border rounded-2xl p-5 hover:border-brand-primary/30 transition-all">
              <div className="flex items-start justify-between mb-3"><h3 className="font-bold text-brand-text text-sm">{b.name}</h3></div>
              <div className="flex flex-wrap gap-2 mb-4">
                {b.tone && <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-brand-elevated text-brand-text-muted">{b.tone}</span>}
                {b.language && <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-brand-elevated text-brand-text-muted">{b.language}</span>}
                {b.ai_profile_id && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-brand-primary/10 text-brand-primary flex items-center gap-1">
                    <Bot className="w-3 h-3" /> AI Linked
                  </span>
                )}
              </div>
              {b.audience && <p className="text-xs text-brand-text-muted mb-4">Audience: {b.audience}</p>}
              <div className="flex justify-end gap-2 pt-3 border-t border-brand-border">
                <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-brand-elevated rounded text-brand-text-muted hover:text-brand-text transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setConfirmDelete(b)} className="p-1.5 hover:bg-brand-danger/20 rounded text-brand-text-muted hover:text-brand-danger transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-brand-text mb-2">Delete Brand?</h3>
              <p className="text-xs text-brand-text-muted mb-5">This will permanently remove "{confirmDelete.name}".</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-brand-elevated border border-brand-border text-brand-text-muted rounded-xl text-sm font-semibold">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-brand-danger text-white rounded-xl text-sm font-semibold disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
