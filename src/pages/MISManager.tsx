import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Plus, Users, FileText, Settings, Building, 
  GraduationCap, Heart, Briefcase, ShoppingCart, Hotel, 
  DollarSign, Zap, CheckCircle, Clock, Activity, Terminal,
  RefreshCw, ArrowRight, Wifi
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

const misIcons: Record<string, React.ElementType> = {
  church_mis: Building,
  school_mis: GraduationCap,
  hospital: Heart,
  crm: Users,
  erp: Briefcase,
  inventory: ShoppingCart,
  hotel: Hotel,
  bank: DollarSign,
};

const misNames: Record<string, string> = {
  church_mis: 'Church MIS',
  school_mis: 'School MIS',
  hospital: 'Hospital MIS',
  crm: 'CRM',
  erp: 'ERP',
  inventory: 'Inventory',
  hotel: 'Hotel',
  bank: 'Bank',
};

interface PluginInfo {
  name: string;
  commands: Array<{
    intent: string;
    description: string;
    params: string[];
    example: string;
    category: string;
  }>;
  webhooks: Array<{
    path: string;
    method: string;
    description: string;
  }>;
}

export default function MISManager() {
  const { restEndpoint, masterToken } = useStore();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const base = restEndpoint.replace(/\/+$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (masterToken) headers['Authorization'] = `Bearer ${masterToken}`;

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch live plugins
  useEffect(() => {
    const fetchPlugins = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${base}/plugins`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPlugins(data.plugins || []);
        if (data.plugins?.length > 0 && !selectedPlugin) {
          setSelectedPlugin(data.plugins[0].name);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load plugins');
      } finally {
        setLoading(false);
      }
    };
    fetchPlugins();
  }, [restEndpoint]);

  const activePlugin = plugins.find(p => p.name === selectedPlugin);
  const activeIcon = activePlugin ? (misIcons[activePlugin.name] || Database) : Database;
  const activeName = activePlugin ? (misNames[activePlugin.name] || activePlugin.name) : 'MIS';
  const Icon = activeIcon;

  // Group commands by category
  const commandsByCategory = activePlugin?.commands.reduce((acc, cmd) => {
    const cat = cmd.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cmd);
    return acc;
  }, {} as Record<string, typeof activePlugin.commands>) || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs font-bold", 
              toast.ok ? "bg-brand-success text-white" : "bg-brand-danger text-white")}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight flex items-center gap-3">
            <Database className="w-8 h-8 text-brand-primary" /> MIS Manager
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">
            MANAGEMENT INFORMATION SYSTEMS
            {!loading && (
              <span className="ml-3 text-brand-primary">
                {plugins.length} system{plugins.length !== 1 ? 's' : ''} active
              </span>
            )}
          </p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-success/10 border border-brand-success/30 rounded-lg">
            <Wifi className="w-3.5 h-3.5 text-brand-success" />
            <span className="text-[10px] font-mono text-brand-success uppercase font-bold">Live Data</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-brand-surface border border-brand-border rounded-2xl p-6 animate-pulse space-y-4">
              <div className="w-12 h-12 bg-brand-elevated rounded-xl" />
              <div className="h-5 bg-brand-elevated rounded w-2/3" />
              <div className="h-3 bg-brand-elevated rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
          <p className="text-red-400 font-mono text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Plugin Cards */}
      {!loading && !error && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {plugins.map(plugin => {
            const IconComponent = misIcons[plugin.name] || Database;
            const isSelected = selectedPlugin === plugin.name;
            return (
              <button
                key={plugin.name}
                onClick={() => { setSelectedPlugin(plugin.name); setExpandedCommand(null); }}
                className={cn(
                  "min-w-[160px] p-5 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all flex-shrink-0 relative group",
                  isSelected 
                    ? "bg-brand-primary/10 border-brand-primary shadow-lg shadow-brand-primary/10" 
                    : "bg-brand-surface border-brand-border hover:bg-brand-elevated hover:border-brand-primary/30"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  isSelected ? "bg-brand-primary/20" : "bg-brand-elevated group-hover:bg-brand-primary/10"
                )}>
                  <IconComponent className={cn("w-6 h-6", isSelected ? "text-brand-primary" : "text-brand-text-muted")} />
                </div>
                <div className="text-center">
                  <span className={cn("text-sm font-bold block", isSelected ? "text-brand-primary" : "text-brand-text")}>
                    {misNames[plugin.name] || plugin.name}
                  </span>
                  <span className="text-[10px] font-mono text-brand-text-muted">
                    {plugin.commands.length} command{plugin.commands.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {isSelected && (
                  <motion.div layoutId="activeIndicator" className="absolute -bottom-0.5 left-4 right-4 h-0.5 bg-brand-primary rounded-full" />
                )}
              </button>
            );
          })}

          {/* Coming soon cards for unregistered plugins */}
          {['erp', 'inventory', 'hotel', 'bank'].filter(id => !plugins.find(p => p.name === id)).map(id => {
            const IconComponent = misIcons[id] || Database;
            return (
              <div key={id}
                className="min-w-[160px] p-5 rounded-2xl border border-brand-border/50 bg-brand-surface/50 flex flex-col items-center justify-center gap-3 flex-shrink-0 opacity-50">
                <div className="w-12 h-12 rounded-xl bg-brand-elevated flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-brand-text-muted" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-bold text-brand-text-muted block">{misNames[id]}</span>
                  <span className="text-[10px] font-mono text-brand-text-muted">Coming soon</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Plugin Detail */}
      {activePlugin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Plugin Info */}
          <div className="lg:col-span-4 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-brand-text mb-1">Kanyoza {activeName}</h2>
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="px-2 py-1 bg-brand-success/20 text-brand-success text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Live
                  </span>
                  <span className="px-2 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase rounded-md">
                    v10
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 bg-brand-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-7 h-7 text-brand-primary" />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-brand-elevated rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-brand-primary">{activePlugin.commands.length}</p>
                <p className="text-[9px] font-mono text-brand-text-muted uppercase">Commands</p>
              </div>
              <div className="bg-brand-elevated rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-brand-success">{Object.keys(commandsByCategory).length}</p>
                <p className="text-[9px] font-mono text-brand-text-muted uppercase">Categories</p>
              </div>
              <div className="bg-brand-elevated rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-brand-accent">{activePlugin.webhooks?.length || 0}</p>
                <p className="text-[9px] font-mono text-brand-text-muted uppercase">Webhooks</p>
              </div>
              <div className="bg-brand-elevated rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-brand-warning">
                  {activePlugin.commands.reduce((sum, c) => sum + (c.params?.length || 0), 0)}
                </p>
                <p className="text-[9px] font-mono text-brand-text-muted uppercase">Params</p>
              </div>
            </div>

            <p className="text-xs text-brand-text-muted font-mono leading-relaxed">
              Manage {activeName.toLowerCase()} operations through natural language AI commands or the REST API. 
              All data is workspace-isolated and stored in Supabase.
            </p>

            {/* Webhooks */}
            {activePlugin.webhooks?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-brand-border/50">
                <h4 className="text-[10px] font-mono font-bold uppercase text-brand-text-muted mb-2">Webhooks</h4>
                {activePlugin.webhooks.map(wh => (
                  <div key={wh.path} className="flex items-center gap-2 text-[10px] font-mono text-brand-text-muted mb-1">
                    <span className="px-1.5 py-0.5 bg-brand-elevated rounded text-brand-primary font-bold">{wh.method}</span>
                    <span className="truncate">{wh.path}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Commands */}
          <div className="lg:col-span-8 bg-brand-surface border border-brand-border rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand-primary" />
              Available Commands
            </h3>

            <div className="space-y-4">
              {Object.entries(commandsByCategory).map(([category, commands]) => (
                <div key={category}>
                  <h4 className="text-[10px] font-mono font-bold uppercase text-brand-primary mb-2 tracking-wider">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {commands.map(cmd => (
                      <motion.div
                        key={cmd.intent}
                        layout
                        className={cn(
                          "bg-brand-elevated border border-brand-border rounded-xl overflow-hidden transition-all",
                          expandedCommand === cmd.intent ? "border-brand-primary/30" : "hover:border-brand-primary/20"
                        )}
                      >
                        <button
                          onClick={() => setExpandedCommand(expandedCommand === cmd.intent ? null : cmd.intent)}
                          className="w-full p-4 flex items-center justify-between text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary text-[9px] font-mono font-bold rounded">
                                {cmd.intent}
                              </span>
                              {cmd.params?.map(p => (
                                <span key={p} className="text-[9px] font-mono text-brand-text-muted">
                                  {`{${p}}`}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-brand-text-muted">{cmd.description}</p>
                          </div>
                          <motion.div animate={{ rotate: expandedCommand === cmd.intent ? 180 : 0 }}>
                            <ArrowRight className="w-4 h-4 text-brand-text-muted" />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {expandedCommand === cmd.intent && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-4 pb-4 border-t border-brand-border/50"
                            >
                              <div className="pt-3 space-y-2">
                                <div>
                                  <span className="text-[9px] font-mono text-brand-text-muted uppercase">Example</span>
                                  <p className="text-xs font-mono text-brand-primary mt-1 bg-brand-elevated rounded-lg p-2">
                                    {cmd.example}
                                  </p>
                                </div>
                                {cmd.params?.length > 0 && (
                                  <div>
                                    <span className="text-[9px] font-mono text-brand-text-muted uppercase">Parameters</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {cmd.params.map(p => (
                                        <span key={p} className="px-2 py-0.5 bg-brand-primary/5 border border-brand-primary/10 rounded text-[10px] font-mono text-brand-text">
                                          {p}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && plugins.length === 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-16 text-center">
          <Database className="w-16 h-16 text-brand-border mx-auto mb-4 opacity-40" />
          <p className="text-brand-text-muted font-mono uppercase text-xs tracking-widest">No MIS Plugins Deployed</p>
          <p className="text-brand-text-muted text-xs font-mono mt-2">
            Add plugin folders to plugins/industries/ and deploy to see them here.
          </p>
        </div>
      )}
    </motion.div>
  );
}
