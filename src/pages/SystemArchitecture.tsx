import React from 'react';
import { motion } from 'motion/react';
import SystemArchitectureVisualizer from '../components/SystemArchitectureVisualizer';
import { Server, Network, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { fetchHealth, fetchSystemHealth } from '../lib/api';

const SystemArchitecturePage = () => {
  const { restEndpoint, masterToken } = useStore();
  
  const { data: healthDeep } = useQuery({
    queryKey: ['system-architecture/health', restEndpoint, masterToken],
    queryFn: () => fetchHealth({ restEndpoint, masterToken }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 30000,
  });
  
  const { data: systemHealth } = useQuery({
    queryKey: ['system-architecture/system-health', restEndpoint, masterToken],
    queryFn: () => fetchSystemHealth({ restEndpoint, masterToken }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 30000,
  });

  const onlineServices = healthDeep?.services
    ? Object.values(healthDeep.services).filter((s) => s.status === 'ok').length
    : 0;
  const totalServices = healthDeep?.services
    ? Object.keys(healthDeep.services).length
    : 0;
  const systemHealthPercentage =
    totalServices > 0 ? Math.round((onlineServices / totalServices) * 100) : 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col gap-4 p-4 md:p-6"
    >
      {/* Header Section */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-primary/10 rounded-xl border border-brand-primary/20">
            <Network className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">System Architecture</h1>
            <p className="text-sm text-brand-text-muted mt-1">Live microservice topology and service health</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-brand-text-muted">System Health</span>
            <span className={`text-xl font-mono font-bold ${systemHealthPercentage === 100 ? 'text-green-400' : systemHealthPercentage >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
              {systemHealthPercentage}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-mono">LIVE</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-brand-text-muted uppercase tracking-wider">Online Services</span>
            <Server className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-3xl font-mono font-bold text-green-400">{onlineServices}</div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-brand-text-muted uppercase tracking-wider">Total Services</span>
            <Server className="w-4 h-4 text-brand-primary" />
          </div>
          <div className="text-3xl font-mono font-bold text-brand-primary">{totalServices}</div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-brand-text-muted uppercase tracking-wider">Connected Nodes</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-mono font-bold text-blue-400">{Object.keys(systemHealth?.connectors || {}).length + totalServices}</div>
        </div>
      </div>

      {/* Visualizer */}
      <div className="flex-1 min-h-0">
        <SystemArchitectureVisualizer />
      </div>
    </motion.div>
  );
};

export default SystemArchitecturePage;
