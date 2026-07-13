import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { Database, Key, Activity, Shield, Copy, Check, RefreshCw, AlertTriangle, XCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from '../lib/utils';

export default function ApiAnalytics() {
  const { restEndpoint, masterToken, stats, latencyHistory } = useStore();
  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyLabel, setKeyLabel] = useState('');
  const [storedKeys, setStoredKeys] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${base}/keys`, { headers });
      if (res.ok) {
        const d = await res.json();
        setStoredKeys(d.keys || []);
      }
    } catch {}
  };

  useEffect(() => { fetchKeys(); }, [restEndpoint]);

  const avgLatency = latencyHistory.length > 0
    ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)
    : null;

  const handleGenerateKey = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${base}/keys/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ label: keyLabel || 'api-key' }),
      });
      if (res.ok) {
        const d = await res.json();
        setGeneratedKey(d.token || d.key);
        fetchKeys();
        showToast('Key generated', true);
      } else {
        const d = await res.json();
        showToast(d.error || 'Generate failed', false);
      }
    } catch (err: any) {
      showToast(err.message || 'Generate failed', false);
    } finally { setGenerating(false); }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      const res = await fetch(`${base}/keys/${keyId}`, { method: 'DELETE', headers });
      if (res.ok) {
        showToast('Key revoked', true);
        fetchKeys();
      }
    } catch {}
  };

  const copyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    return {
      name: dayNames[(today - 6 + i + 7) % 7],
      calls: Math.round((stats.apiCalls || 0) * (0.08 + Math.random() * 0.05)),
    };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-7xl mx-auto pb-24 md:pb-0">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs font-bold", toast.ok ? "bg-brand-success text-white" : "bg-brand-danger text-white")}>
            {toast.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">API Analytics</h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">ENDPOINT USAGE & METRICS</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="text" placeholder="Key label..." value={keyLabel} onChange={e => setKeyLabel(e.target.value)}
            className="px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-primary w-32" />
          <button onClick={handleGenerateKey} disabled={generating}
            className="bg-brand-elevated border border-brand-border px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-brand-primary/20 transition-colors flex items-center gap-2 disabled:opacity-50">
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4 text-brand-primary" />} Generate Key
          </button>
        </div>
      </div>

      <AnimatePresence>
        {generatedKey && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-brand-success/30 bg-brand-success/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-sm mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <Key className="w-4 h-4 text-brand-success shrink-0" />
                <span className="text-brand-success font-bold truncate">{generatedKey}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={copyKey} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-success/20 text-brand-success hover:bg-brand-success/30 transition-colors text-xs font-bold uppercase">
                  {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
                <button onClick={() => setGeneratedKey(null)} className="text-brand-text-muted hover:text-white transition-colors text-xs">✕</button>
              </div>
            </div>
            <p className="text-[10px] font-mono text-brand-text-muted px-1">Store this token securely — it will not be shown again.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'API Calls Today', value: (stats.apiCalls || 0).toLocaleString(), icon: Activity, color: 'text-brand-primary', sub: 'Live from backend' },
          { label: 'Avg Latency', value: avgLatency !== null ? `${avgLatency}ms` : '—', icon: Database, color: 'text-brand-accent', sub: avgLatency !== null ? `${latencyHistory.length} samples` : 'Measuring…' },
          { label: 'Active Keys', value: String(storedKeys.length), icon: Shield, color: 'text-brand-success', sub: 'From API' },
        ].map(stat => (
          <div key={stat.label} className="bg-brand-surface rounded-2xl p-6 border border-brand-border">
            <div className="flex items-center space-x-4 mb-4">
              <div className={`p-3 rounded-xl bg-brand-elevated ${stat.color}`}><stat.icon className="w-6 h-6" /></div>
              <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">{stat.label}</h3>
            </div>
            <div className="text-3xl font-extrabold font-mono">{stat.value}</div>
            <p className="text-[10px] text-brand-text-muted font-mono mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-brand-surface rounded-2xl p-6 border border-brand-border">
        <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Usage Volume (7-Day Estimate)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#141A2E', borderColor: '#1E293B', borderRadius: '8px' }} itemStyle={{ color: '#F1F5F9', fontWeight: 'bold' }} formatter={(v: number) => [v.toLocaleString(), 'API Calls']} />
              <Area type="monotone" dataKey="calls" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorCalls)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {storedKeys.length > 0 && (
        <div className="bg-brand-surface rounded-2xl p-6 border border-brand-border">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Active API Keys</h3>
          <div className="space-y-2 font-mono text-xs">
            {storedKeys.map((k, i) => (
              <div key={k.id || i} className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-brand-border">
                <div>
                  <span className="text-brand-text-muted">{k.prefix || '****'}</span>
                  <span className="text-brand-text-muted text-[10px] ml-2">{k.label || ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-brand-text-muted text-[10px]">{k.created_at ? new Date(k.created_at).toLocaleDateString() : ''}</span>
                  <button onClick={() => handleRevoke(k.id)} className="text-brand-danger hover:text-brand-danger/80 text-[10px] font-bold uppercase">Revoke</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
