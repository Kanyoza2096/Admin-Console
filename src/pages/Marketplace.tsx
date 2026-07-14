import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Search, Plus, Star, Download, Trash2, RefreshCw, CheckCircle, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

const categories = [
  'All', 'Education', 'Healthcare', 'Business', 'Government',
  'Finance', 'Social Media', 'CRM', 'ERP', 'Inventory', 'Church', 'Schools'
];

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2);

export default function Marketplace() {
  const { restEndpoint, masterToken } = useStore();
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Marketplace is a future feature — no backend endpoint exists yet.
    // Show empty state with a clear message instead of mock data.
    setLoading(false);
  }, []);

  const filteredPlugins = plugins.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalInstalled = plugins.filter(p => p.status === 'installed').length;
  const totalUpdates = plugins.filter(p => p.status === 'update_available').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs font-bold", toast.ok ? "bg-brand-success text-white" : "bg-brand-danger text-white")}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight flex items-center gap-3">
            <Store className="w-8 h-8 text-brand-primary" /> Plugin Marketplace
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">EXTEND PLATFORM CAPABILITIES</p>
        </div>
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-muted" />
            <input type="text" placeholder="Search plugins..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary transition-all" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex items-center justify-between">
          <div><div className="text-brand-text-muted text-xs font-mono uppercase tracking-wider mb-1">Total Plugins</div><div className="text-3xl font-bold text-brand-text">{plugins.length}</div></div>
          <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center"><Store className="w-6 h-6 text-brand-primary" /></div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex items-center justify-between">
          <div><div className="text-brand-text-muted text-xs font-mono uppercase tracking-wider mb-1">Installed</div><div className="text-3xl font-bold text-brand-text">{totalInstalled}</div></div>
          <div className="w-12 h-12 rounded-full bg-brand-success/10 flex items-center justify-center"><CheckCircle className="w-6 h-6 text-brand-success" /></div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex items-center justify-between">
          <div><div className="text-brand-text-muted text-xs font-mono uppercase tracking-wider mb-1">Updates Available</div><div className="text-3xl font-bold text-brand-warning">{totalUpdates}</div></div>
          <div className="w-12 h-12 rounded-full bg-brand-warning/10 flex items-center justify-center"><RefreshCw className="w-6 h-6 text-brand-warning" /></div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            className={cn("px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-bold flex items-center gap-3 transition-all",
              selectedCategory === cat ? "bg-brand-primary text-white shadow-glow-primary" : "bg-brand-surface border border-brand-border text-brand-text-muted hover:text-brand-text hover:bg-brand-elevated")}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-brand-surface border border-brand-border rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredPlugins.length === 0 ? (
        <div className="py-20 text-center">
          <Store className="w-16 h-16 text-brand-border mx-auto mb-4" />
          <p className="text-brand-text-muted font-mono uppercase text-xs tracking-widest mb-2">Plugin Marketplace Coming Soon</p>
          <p className="text-brand-text-muted text-xs font-mono">Third-party plugins and extensions will be available in a future release.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlugins.map(plugin => (
            <motion.div key={plugin.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -4 }} className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col transition-all hover:border-brand-primary/30">
              <div className="flex justify-between items-start mb-5">
                <div className="w-14 h-14 rounded-xl bg-brand-elevated border border-brand-border text-brand-primary flex items-center justify-center font-bold text-xl">{getInitials(plugin.name)}</div>
                {plugin.status === 'installed' && <span className="bg-brand-success/10 text-brand-success border border-brand-success/20 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> Installed</span>}
              </div>
              <h3 className="text-base font-bold text-brand-text mb-1">{plugin.name}</h3>
              <p className="text-xs text-brand-text-muted font-mono mb-4">by {plugin.author} • {plugin.version}</p>
              <p className="text-sm text-brand-text-secondary mb-6 line-clamp-2 min-h-[40px]">{plugin.description}</p>
              <div className="flex items-center justify-between mb-6 pt-4 border-t border-brand-border/50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-brand-warning text-sm font-bold"><Star className="w-4 h-4 fill-current" /> {plugin.rating}</div>
                  <div className="flex items-center gap-1.5 text-brand-text-muted text-xs font-mono"><Download className="w-4 h-4" /> {plugin.downloads}</div>
                </div>
                <div className="text-sm font-bold text-brand-text bg-brand-elevated px-3 py-1 rounded-md border border-brand-border">{plugin.price}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
