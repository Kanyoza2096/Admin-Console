import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { Bot, Plus, Trash2, Edit2, AlertTriangle, X, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface AIProfile {
  id: string;
  name: string;
  tone?: string;
  expertise?: string;
  complexity?: string;
  emoji_level?: string;
  writing_style?: string;
  system_prompt_override?: string;
}

export default function AIProfiles() {
  const { restEndpoint, masterToken } = useStore();
  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AIProfile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AIProfile | null>(null);
  const [form, setForm] = useState({ name: '', tone: '', expertise: '', complexity: '', emoji_level: '', writing_style: '', system_prompt_override: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch(`${base}/workspaces`, { headers });
      if (res.ok) { const d = await res.json(); const ws = d.workspaces || []; setWorkspaces(ws); if (!selectedWorkspaceId && ws.length > 0) setSelectedWorkspaceId(ws[0].id); }
    } catch {}
  };

  const fetchProfiles = async () => {
    if (!selectedWorkspaceId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${base}/workspaces/${selectedWorkspaceId}/ai-profiles`, { headers });
      if (res.ok) { const d = await res.json(); setProfiles(d.ai_profiles || []); }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWorkspaces(); }, [restEndpoint]);
  useEffect(() => { fetchProfiles(); }, [restEndpoint, selectedWorkspaceId]);

  const resetForm = () => { setForm({ name: '', tone: '', expertise: '', complexity: '', emoji_level: '', writing_style: '', system_prompt_override: '' }); setEditing(null); setShowForm(false); };

  const openEdit = (p: AIProfile) => {
    setEditing(p);
    setForm({ name: p.name, tone: p.tone || '', expertise: p.expertise || '', complexity: p.complexity || '', emoji_level: p.emoji_level || '', writing_style: p.writing_style || '', system_prompt_override: p.system_prompt_override || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Profile name is required', false); return; }
    setSaving(true);
    try {
      const url = editing ? `${base}/ai-profiles/${editing.id}` : `${base}/workspaces/${selectedWorkspaceId}/ai-profiles`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (res.ok) { showToast(editing ? 'Profile updated' : 'Profile created', true); resetForm(); fetchProfiles(); }
      else { const d = await res.json(); showToast(d.error || 'Save failed', false); }
    } catch (err: any) { showToast(err.message || 'Save failed', false); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${base}/ai-profiles/${confirmDelete.id}`, { method: 'DELETE', headers });
      if (res.ok) { showToast(`"${confirmDelete.name}" deleted`, true); setConfirmDelete(null); fetchProfiles(); }
      else { const d = await res.json(); showToast(d.error || 'Delete failed', false); }
    } catch (err: any) { showToast(err.message || 'Delete failed', false); }
    finally { setDeleting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 md:pb-0">
      <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs font-bold", toast.ok ? "bg-brand-success text-white" : "bg-brand-danger text-white")}>{toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{toast.msg}</motion.div>}</AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center"><Bot className="w-8 h-8 mr-3 text-brand-primary" /> AI Profiles</h1><p className="text-brand-text-muted text-sm font-mono mt-1">AI PERSONA PROFILES</p></div>
        <div className="flex items-center gap-3">
          <select value={selectedWorkspaceId} onChange={e => setSelectedWorkspaceId(e.target.value)} className="px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary">
            {workspaces.length === 0 && <option value="">No workspaces</option>}
            {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button onClick={() => { resetForm(); setShowForm(v => !v); }} disabled={!selectedWorkspaceId} className="px-4 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-primary/90 transition-colors shadow-glow-primary flex items-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> Add Profile</button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleSubmit} className="p-5 bg-brand-surface border border-brand-border rounded-2xl space-y-4 overflow-hidden">
            <div className="flex items-center justify-between"><h3 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-text">{editing ? 'Edit Profile' : 'New Profile'}</h3><button type="button" onClick={resetForm}><X className="w-4 h-4 text-brand-text-muted" /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" /></div>
              <div><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Tone</label><input value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} placeholder="e.g. Witty, formal" className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" /></div>
              <div><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Expertise</label><input value={form.expertise} onChange={e => setForm(f => ({ ...f, expertise: e.target.value }))} placeholder="e.g. Finance, tech" className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" /></div>
              <div><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Complexity</label><select value={form.complexity} onChange={e => setForm(f => ({ ...f, complexity: e.target.value }))} className="w-full px-3 py-2.5 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary"><option value="">Select</option><option value="simple">Simple</option><option value="moderate">Moderate</option><option value="advanced">Advanced</option></select></div>
              <div><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Emoji Level</label><select value={form.emoji_level} onChange={e => setForm(f => ({ ...f, emoji_level: e.target.value }))} className="w-full px-3 py-2.5 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary"><option value="">Select</option><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
              <div><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">Writing Style</label><input value={form.writing_style} onChange={e => setForm(f => ({ ...f, writing_style: e.target.value }))} className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" /></div>
              <div className="md:col-span-2"><label className="block text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-1">System Prompt Override</label><textarea rows={3} value={form.system_prompt_override} onChange={e => setForm(f => ({ ...f, system_prompt_override: e.target.value }))} className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary resize-none" /></div>
            </div>
            <div className="flex justify-end gap-2"><button type="button" onClick={resetForm} className="px-4 py-2 bg-brand-surface hover:bg-brand-elevated border border-brand-border text-brand-text-muted rounded-xl text-sm font-semibold">Cancel</button><button type="submit" disabled={saving} className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-sm font-semibold shadow-glow-primary disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Profile'}</button></div>
          </motion.form>
        )}
      </AnimatePresence>

      {!selectedWorkspaceId ? <div className="py-16 text-center text-brand-text-muted font-mono text-xs uppercase border border-dashed border-brand-border rounded-2xl">Select a workspace.</div>
      : loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="h-40 bg-brand-surface border border-brand-border rounded-2xl animate-pulse" />)}</div>
      : error ? <div className="py-16 text-center text-brand-danger font-mono text-sm flex flex-col items-center gap-2"><AlertTriangle className="w-6 h-6" />Failed to load.<button onClick={fetchProfiles} className="mt-2 px-4 py-1.5 bg-brand-elevated rounded-lg text-xs font-bold">Retry</button></div>
      : profiles.length === 0 ? <div className="py-16 text-center text-brand-text-muted font-mono text-xs uppercase border border-dashed border-brand-border rounded-2xl">No profiles yet.</div>
      : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((p, idx) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * idx }} className="bg-brand-surface border border-brand-border rounded-2xl p-5 hover:border-brand-primary/30 transition-all">
              <h3 className="font-bold text-brand-text text-sm mb-3">{p.name}</h3>
              <div className="flex flex-wrap gap-2 mb-4">{p.tone && <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-brand-elevated text-brand-text-muted">{p.tone}</span>}{p.expertise && <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-brand-elevated text-brand-text-muted">{p.expertise}</span>}{p.complexity && <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-brand-elevated text-brand-text-muted">{p.complexity}</span>}</div>
              <div className="flex justify-end gap-2 pt-3 border-t border-brand-border"><button onClick={() => openEdit(p)} className="p-1.5 hover:bg-brand-elevated rounded text-brand-text-muted hover:text-brand-text transition-colors"><Edit2 className="w-4 h-4" /></button><button onClick={() => setConfirmDelete(p)} className="p-1.5 hover:bg-brand-danger/20 rounded text-brand-text-muted hover:text-brand-danger transition-colors"><Trash2 className="w-4 h-4" /></button></div>
            </motion.div>
          ))}
        </div>
      }

      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}><h3 className="text-sm font-bold text-brand-text mb-2">Delete Profile?</h3><p className="text-xs text-brand-text-muted mb-5">This will permanently remove "{confirmDelete.name}".</p>
              <div className="flex justify-end gap-2"><button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-brand-elevated border border-brand-border text-brand-text-muted rounded-xl text-sm font-semibold">Cancel</button><button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-brand-danger text-white rounded-xl text-sm font-semibold disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button></div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
