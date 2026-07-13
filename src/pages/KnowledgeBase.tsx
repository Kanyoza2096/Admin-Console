import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { BookOpen, Search, Plus, FileText, Trash2, AlertTriangle, X, Globe, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface KnowledgeDoc {
  id: string | number;
  title?: string;
  content?: string;
  doc_type?: string;
  tags?: string[];
  brand_id?: string;
  created_at?: string;
}

interface Brand {
  id: string;
  name: string;
}

const DOC_TYPES = ['fact', 'faq', 'policy', 'product', 'general'];

export default function KnowledgeBase() {
  const { restEndpoint, masterToken } = useStore();
  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [activeTab, setActiveTab] = useState<'brand' | 'global'>('brand');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [globalDocs, setGlobalDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeDoc[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<KnowledgeDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [form, setForm] = useState({ title: '', content: '', doc_type: 'fact', tags: '' });

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBrands = async () => {
    try {
      const res = await fetch(`${base}/workspaces`, { headers });
      if (res.ok) {
        const d = await res.json();
        const wsList = d.workspaces || [];
        if (wsList.length > 0) {
          const brRes = await fetch(`${base}/workspaces/${wsList[0].id}/brands`, { headers });
          if (brRes.ok) {
            const bd = await brRes.json();
            const brList = bd.brands || [];
            setBrands(brList);
            if (!selectedBrandId && brList.length > 0) setSelectedBrandId(brList[0].id);
          }
        }
      }
    } catch {}
  };

  const fetchDocs = async () => {
    if (!selectedBrandId && activeTab === 'brand') return;
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'brand') {
        const res = await fetch(`${base}/brands/${selectedBrandId}/knowledge`, { headers });
        if (res.ok) {
          const d = await res.json();
          setDocuments(d.knowledge_entries || []);
        }
      } else {
        const res = await fetch(`${base}/knowledge?limit=50`, { headers });
        if (res.ok) {
          const d = await res.json();
          setGlobalDocs(d.documents || []);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, [restEndpoint]);
  useEffect(() => { fetchDocs(); }, [restEndpoint, selectedBrandId, activeTab]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !selectedBrandId) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`${base}/brands/${selectedBrandId}/knowledge/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: searchQuery.trim(), top_k: 10 }),
      });
      if (res.ok) {
        const d = await res.json();
        setSearchResults((d.results || []).map((r: any) => r.entry || r));
      }
    } catch {}
    finally { setSearching(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) { showToast('Content is required', false); return; }
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      if (activeTab === 'global') {
        await fetch(`${base}/knowledge`, { method: 'POST', headers, body: JSON.stringify(payload) });
      } else {
        await fetch(`${base}/brands/${selectedBrandId}/knowledge`, { method: 'POST', headers, body: JSON.stringify(payload) });
      }
      showToast('Document saved', true);
      setForm({ title: '', content: '', doc_type: 'fact', tags: '' });
      setShowForm(false);
      fetchDocs();
    } catch (err: any) {
      showToast(err.message || 'Save failed', false);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await fetch(`${base}/knowledge/${confirmDelete.id}`, { method: 'DELETE', headers });
      showToast('Document deleted', true);
      setConfirmDelete(null);
      fetchDocs();
    } catch (err: any) {
      showToast(err.message || 'Delete failed', false);
    } finally { setDeleting(false); }
  };

  const displayedDocs = searchResults ?? (activeTab === 'global' ? globalDocs : documents);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs font-bold", toast.ok ? "bg-brand-success text-white" : "bg-brand-danger text-white")}>
            {toast.ok ? <RefreshCw className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center">
            <BookOpen className="w-8 h-8 mr-3 text-brand-primary" /> Knowledge Base
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">RAG DOCUMENT SOURCES</p>
        </div>
        {activeTab === 'brand' && (
          <select value={selectedBrandId} onChange={e => setSelectedBrandId(e.target.value)}
            className="px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary">
            {brands.length === 0 && <option value="">No brands</option>}
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-brand-border pb-4">
        <button onClick={() => { setActiveTab('brand'); setSearchResults(null); }}
          className={cn('px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border', activeTab === 'brand' ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' : 'bg-brand-elevated border-brand-border text-brand-text-muted hover:text-brand-text')}>
          Brand Knowledge
        </button>
        <button onClick={() => { setActiveTab('global'); setSearchResults(null); }}
          className={cn('px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border', activeTab === 'global' ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' : 'bg-brand-elevated border-brand-border text-brand-text-muted hover:text-brand-text')}>
          Global Knowledge
        </button>
      </div>

      {activeTab === 'brand' && (
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-muted" />
            <input type="text" placeholder="Semantic search documents..." value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
              disabled={!selectedBrandId}
              className="w-full pl-12 pr-4 py-3 bg-brand-surface border border-brand-border rounded-xl text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-primary disabled:opacity-60" />
          </div>
          <button type="submit" disabled={searching || !searchQuery.trim()}
            className="px-4 py-3 bg-brand-elevated border border-brand-border rounded-xl text-sm font-bold uppercase text-brand-text-muted hover:text-brand-text disabled:opacity-50">
            {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </form>
      )}

      <button onClick={() => setShowForm(v => !v)}
        className="px-4 py-3 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-primary/90 transition-colors flex items-center gap-2 shadow-glow-primary disabled:opacity-50"
        disabled={activeTab === 'brand' && !selectedBrandId}>
        <Plus className="w-4 h-4" /> New Document
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSave} className="p-5 bg-brand-surface border border-brand-border rounded-2xl space-y-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-text">New Document</h3>
              <button type="button" onClick={() => setShowForm(false)}><X className="w-4 h-4 text-brand-text-muted" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" />
              <select value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))} className="px-3 py-2.5 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="tags, comma, separated" className="px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary" />
            </div>
            <textarea rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Document content..." className="w-full px-3 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text focus:outline-none focus:border-brand-primary resize-none" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-brand-surface hover:bg-brand-elevated border border-brand-border text-brand-text-muted rounded-xl text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-sm font-semibold shadow-glow-primary disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Document'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading || searching ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-brand-surface border border-brand-border rounded-2xl animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="py-16 text-center text-brand-danger font-mono text-sm flex flex-col items-center gap-2">
          <AlertTriangle className="w-6 h-6" /> Failed to load documents.
          <button onClick={fetchDocs} className="mt-2 px-4 py-1.5 bg-brand-elevated rounded-lg text-xs font-bold">Retry</button>
        </div>
      ) : displayedDocs.length === 0 ? (
        <div className="py-16 text-center text-brand-text-muted font-mono text-xs uppercase border border-dashed border-brand-border rounded-2xl">
          {searchResults ? 'No matching documents found.' : 'No documents yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayedDocs.map((doc, idx) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * idx }}
              className="bg-brand-surface border border-brand-border rounded-2xl p-6 hover:border-brand-primary/30 transition-all flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-4"><FileText className="w-6 h-6 text-brand-primary" /></div>
              {doc.title && <h3 className="text-sm font-bold text-brand-text mb-2 line-clamp-2">{doc.title}</h3>}
              <p className="text-xs text-brand-text-muted line-clamp-3 mb-4 flex-1">{doc.content}</p>
              {doc.doc_type && <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-brand-elevated text-brand-text-muted mb-4 self-start">{doc.doc_type}</span>}
              <div className="flex gap-2 pt-4 border-t border-brand-border">
                <button onClick={() => setConfirmDelete(doc)}
                  className="flex-1 px-3 py-2 text-xs font-bold text-brand-danger bg-brand-danger/10 rounded-lg hover:bg-brand-danger/20 transition-colors flex items-center justify-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-brand-text mb-2">Delete Document?</h3>
              <p className="text-xs text-brand-text-muted mb-5">This will permanently remove this document.</p>
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
