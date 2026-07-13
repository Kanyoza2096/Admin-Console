import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import { Link, CheckCircle, XCircle, Plug, Server, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface IntegrationEntry {
  id: string;
  name: string;
  category: string;
  connected: boolean;
  status: string;
  description: string;
}

export default function Integrations() {
  const { restEndpoint, masterToken } = useStore();
  const [integrations, setIntegrations] = useState<IntegrationEntry[]>([]);
  const [connectors, setConnectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers: Record<string, string> = masterToken ? { Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [intRes, connRes] = await Promise.all([
        fetch(`${base}/integrations`, { headers }),
        fetch(`${base}/system/connectors`, { headers }),
      ]);

      if (intRes.ok) {
        const data = await intRes.json();
        setIntegrations(data.integrations || []);
      }

      if (connRes.ok) {
        const data = await connRes.json();
        setConnectors(data.supported_connectors || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [restEndpoint]);

  const categories = [...new Set(integrations.map(i => i.category))];
  const connectedCount = integrations.filter(i => i.connected).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center text-white">
            <Link className="w-8 h-8 mr-3 text-brand-primary" />
            Integrations
          </h1>
          <p className="text-gray-400 text-sm font-mono mt-1">
            {connectedCount}/{integrations.length} Services Connected
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1f2e] border border-gray-700 rounded-xl text-sm font-bold uppercase tracking-wider text-gray-300 hover:text-white hover:border-gray-500 transition-all"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2].map(section => (
            <div key={section}>
              <div className="h-4 w-32 bg-[#1a1f2e] animate-pulse rounded mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-[#0f1624] border border-gray-800 rounded-2xl p-5 animate-pulse space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-[#1a1f2e] rounded w-2/3" />
                      <div className="h-5 bg-[#1a1f2e] rounded-full w-16" />
                    </div>
                    <div className="h-3 bg-[#1a1f2e] rounded w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-16 text-center border border-gray-800 rounded-2xl bg-[#0f1624]">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Failed to Load</h3>
          <p className="text-xs text-gray-400 font-mono mb-4">{error}</p>
          <button onClick={fetchData} className="px-5 py-2.5 bg-[#1a1f2e] border border-gray-700 text-white text-xs font-bold uppercase rounded-xl hover:bg-[#222840] transition-all">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* System Integrations */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Plug className="w-4 h-4 text-indigo-400" /> System Integrations
            </h2>
            {integrations.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-gray-800 rounded-2xl">
                <p className="text-xs text-gray-500 font-mono uppercase">No integration data available</p>
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map(category => (
                  <div key={category}>
                    <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-3">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {integrations.filter(i => i.category === category).map(integration => (
                        <div key={integration.id} className="bg-[#0f1624] border border-gray-800 rounded-xl p-5 hover:border-indigo-500/30 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-white">{integration.name}</h4>
                            {integration.connected ? (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-green-400 bg-green-500/15 px-2.5 py-1 rounded-full border border-green-500/20">
                                <CheckCircle className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-red-400 bg-red-500/15 px-2.5 py-1 rounded-full border border-red-500/20">
                                <XCircle className="w-3 h-3" /> Disconnected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">{integration.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Connectors */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" /> System Connectors
            </h2>
            {connectors.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-gray-800 rounded-2xl">
                <p className="text-xs text-gray-500 font-mono uppercase">No connectors registered</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {connectors.map((name, i) => (
                  <div key={i} className="bg-[#0f1624] border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                    <span className="text-xs font-bold text-white capitalize truncate">{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
  }
