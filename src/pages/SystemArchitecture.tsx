import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { fetchHealth, fetchSystemHealth } from '../lib/api';
import SystemArchitectureVisualizer from '../components/SystemArchitectureVisualizer';
import { 
  Server, Network, Activity, AlertTriangle, CheckCircle2, XCircle,
  Clock, Zap, Database, Globe, Cpu, BrainCircuit, Search, Filter,
  RefreshCw, Eye, EyeOff, ChevronRight, ExternalLink, Wifi, WifiOff,
  ArrowUpRight, ArrowDownRight, Minimize2, Maximize2
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Service detail panel ───────────────────────────────────────────────────

function ServiceDetailPanel({ service, onClose }: { service: any; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-4 top-4 bottom-4 w-80 bg-brand-surface/95 backdrop-blur-xl border border-brand-border/60 rounded-2xl shadow-2xl z-30 overflow-hidden flex flex-col"
    >
      <div className="p-4 border-b border-brand-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2.5 h-2.5 rounded-full',
            service.status === 'ok' ? 'bg-emerald-400' : service.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
          )} />
          <h3 className="text-sm font-bold text-white">{service.name}</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-brand-elevated text-brand-text-muted">
          <XCircle className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status */}
        <div className="p-3 rounded-xl border border-brand-border/30 space-y-2">
          <span className="text-[10px] text-brand-text-muted uppercase font-mono tracking-wider">Status</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase',
              service.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
              service.status === 'degraded' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
              'bg-red-500/10 text-red-400 border border-red-500/30'
            )}>
              {service.status}
            </span>
          </div>
        </div>

        {/* Metrics */}
        {service.latency && (
          <div className="p-3 rounded-xl border border-brand-border/30 space-y-2">
            <span className="text-[10px] text-brand-text-muted uppercase font-mono tracking-wider">Latency</span>
            <p className="text-lg font-mono font-bold text-white">{service.latency}ms</p>
          </div>
        )}

        {service.uptime && (
          <div className="p-3 rounded-xl border border-brand-border/30 space-y-2">
            <span className="text-[10px] text-brand-text-muted uppercase font-mono tracking-wider">Uptime</span>
            <p className="text-lg font-mono font-bold text-emerald-400">{service.uptime}%</p>
          </div>
        )}

        {/* Endpoints */}
        {service.endpoints && service.endpoints.length > 0 && (
          <div className="p-3 rounded-xl border border-brand-border/30 space-y-2">
            <span className="text-[10px] text-brand-text-muted uppercase font-mono tracking-wider">Endpoints</span>
            <div className="space-y-1">
              {service.endpoints.map((ep: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs font-mono text-brand-text-muted">
                  <div className="w-1 h-1 rounded-full bg-brand-primary" />
                  {ep}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last checked */}
        {service.lastChecked && (
          <div className="p-3 rounded-xl border border-brand-border/30 space-y-2">
            <span className="text-[10px] text-brand-text-muted uppercase font-mono tracking-wider">Last Checked</span>
            <p className="text-xs font-mono text-brand-text-muted">
              {new Date(service.lastChecked).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Service icon mapper ────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, React.ElementType> = {
  gemini: BrainCircuit,
  supabase: Database,
  facebook: Globe,
  redis: Zap,
  browser: Globe,
  render: Cpu,
  scheduler: Clock,
  default: Server,
};

function getServiceIcon(name: string): React.ElementType {
  const key = Object.keys(SERVICE_ICONS).find(k => name.toLowerCase().includes(k));
  return key ? SERVICE_ICONS[key] : SERVICE_ICONS.default;
}

// ═══════════════════════════════════════════════════════════════════════════

const SystemArchitecturePage = () => {
  const { restEndpoint, masterToken } = useStore();
  const [selectedService, setSelectedService] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showServiceList, setShowServiceList] = useState(true);

  const { data: healthDeep, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['system-architecture/health', restEndpoint, masterToken],
    queryFn: () => fetchHealth({ restEndpoint, masterToken }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 15000,
  });

  const { data: systemHealth, isLoading: sysLoading } = useQuery({
    queryKey: ['system-architecture/system-health', restEndpoint, masterToken],
    queryFn: () => fetchSystemHealth({ restEndpoint, masterToken }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 15000,
  });

  // ── Derived data ─────────────────────────────────────────────────────────

  const services = useMemo(() => {
    if (!healthDeep?.services) return [];
    return Object.entries(healthDeep.services).map(([name, data]: [string, any]) => ({
      name,
      status: data.status || 'unknown',
      latency: data.latency_ms,
      uptime: data.uptime,
      lastChecked: data.last_checked,
      endpoints: data.endpoints || [],
      version: data.version,
    }));
  }, [healthDeep]);

  const connectors = useMemo(() => {
    if (!systemHealth?.connectors) return [];
    return Object.entries(systemHealth.connectors).map(([name, data]: [string, any]) => ({
      name,
      status: data.ok ? 'ok' : 'error',
      ...data,
    }));
  }, [systemHealth]);

  const allNodes = useMemo(() => [...services, ...connectors], [services, connectors]);

  const filteredNodes = useMemo(() => {
    let result = [...allNodes];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.name.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      result = result.filter(n => n.status === statusFilter);
    }
    return result;
  }, [allNodes, searchQuery, statusFilter]);

  const onlineCount = allNodes.filter(n => n.status === 'ok' || n.status === 'online').length;
  const degradedCount = allNodes.filter(n => n.status === 'degraded').length;
  const offlineCount = allNodes.filter(n => n.status === 'error' || n.status === 'offline').length;
  const systemHealthPercentage = allNodes.length > 0 ? Math.round((onlineCount / allNodes.length) * 100) : 100;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className={cn(
        "flex flex-col gap-4",
        isFullscreen ? "fixed inset-0 z-50 bg-brand-bg p-4" : "w-full h-full p-4 md:p-6"
      )}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
            <Network className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">System Architecture</h1>
            <p className="text-[10px] text-brand-text-muted font-mono uppercase tracking-wider mt-0.5">
              {allNodes.length} services · {onlineCount} healthy · {degradedCount} degraded · {offlineCount} down
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Health percentage */}
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold',
            systemHealthPercentage === 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
            systemHealthPercentage >= 80 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
            'bg-red-500/10 text-red-400 border-red-500/30'
          )}>
            <Activity className="w-3.5 h-3.5" />
            {systemHealthPercentage}%
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-surface border border-brand-border/50 text-[10px] font-mono text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </div>

          <button onClick={() => refetchHealth()} className="p-2 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors">
            <RefreshCw className={cn('w-4 h-4', healthLoading && 'animate-spin')} />
          </button>

          <button onClick={() => setShowServiceList(!showServiceList)} className="p-2 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors">
            {showServiceList ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Topology Visualizer */}
      <div className="flex-1 min-h-[300px] bg-brand-surface/30 border border-brand-border/50 rounded-2xl overflow-hidden relative">
        <SystemArchitectureVisualizer
          services={services}
          connectors={connectors}
          onNodeClick={setSelectedService}
          selectedNode={selectedService?.name}
        />

        {/* Service detail slide-over */}
        <AnimatePresence>
          {selectedService && (
            <ServiceDetailPanel
              service={selectedService}
              onClose={() => setSelectedService(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Service List */}
      <AnimatePresence>
        {showServiceList && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="bg-brand-surface border border-brand-border/50 rounded-2xl overflow-hidden">
              {/* Filters */}
              <div className="p-3 border-b border-brand-border/50 flex items-center gap-3 bg-brand-elevated/20">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text-muted" />
                  <input
                    type="text" placeholder="Filter services..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-brand-elevated border border-brand-border/50 rounded-lg text-xs text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-primary/50 transition-all"
                  />
                </div>
                <div className="flex gap-1">
                  {['all', 'ok', 'degraded', 'error'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition-all',
                        statusFilter === s ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:text-white'
                      )}>
                      {s === 'all' ? 'All' : s}
                    </button>
                  ))}
                </div>
                <span className="ml-auto text-[10px] text-brand-text-muted font-mono">
                  {filteredNodes.length} of {allNodes.length}
                </span>
              </div>

              {/* Service rows */}
              <div className="max-h-64 overflow-y-auto">
                {filteredNodes.map((node, i) => {
                  const Icon = getServiceIcon(node.name);
                  return (
                    <motion.button
                      key={node.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                      onClick={() => setSelectedService(node)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-elevated/30 transition-colors border-b border-brand-border/30 last:border-0 text-left group',
                        selectedService?.name === node.name && 'bg-brand-primary/10 border-l-2 border-l-brand-primary'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        node.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400' :
                        node.status === 'degraded' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{node.name}</p>
                        <p className="text-[10px] text-brand-text-muted font-mono capitalize">{node.status}</p>
                      </div>
                      {node.latency !== undefined && (
                        <span className="text-[10px] font-mono text-brand-text-muted">{node.latency}ms</span>
                      )}
                      <div className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        node.status === 'ok' ? 'bg-emerald-400' :
                        node.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
                      )} />
                      <ChevronRight className="w-3.5 h-3.5 text-brand-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SystemArchitecturePage;
