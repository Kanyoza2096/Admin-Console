import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { ShieldAlert, CheckCircle, Search, Filter, AlertTriangle, Shield, ChevronDown, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

type Severity = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM';

interface GuardianAlert {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  time: number;
}

export default function Guardian() {
  const { restEndpoint, masterToken } = useStore();
  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [alerts, setAlerts] = useState<GuardianAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<Severity>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/guardian/issues${filterSeverity !== 'ALL' ? `?severity=${filterSeverity.toLowerCase()}` : ''}`, { headers });
      if (res.ok) {
        const d = await res.json();
        setAlerts(d.issues || []);
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchIssues(); }, [restEndpoint, filterSeverity]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${base}/guardian/scan`, { method: 'POST', headers });
      const d = await res.json();
      showToast(d.message || 'Scan started', true);
      setLastScan({ scan_id: Date.now().toString(36).toUpperCase(), findings: 0, critical: 0, high: 0, medium: 0, low: 0 });
      setTimeout(fetchIssues, 3000);
    } catch (err: any) {
      showToast(err.message || 'Scan failed', false);
    } finally {
      setScanning(false);
    }
  };

  const filteredAlerts = alerts;

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH').length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto pb-24 md:pb-0">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs font-bold", toast.ok ? "bg-brand-success text-white" : "bg-brand-danger text-white")}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">Guardian</h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">SECURITY & COMPLIANCE</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleScan} disabled={scanning}
            className="bg-brand-elevated border border-brand-border hover:bg-brand-border text-brand-text px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-60">
            {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {scanning ? 'Scanning…' : 'Scan Now'}
          </button>
        </div>
      </div>

      {lastScan && (
        <div className={cn('rounded-xl border p-4 mb-5 font-mono text-sm', 'bg-brand-success/10 border-brand-success/30 text-brand-success')}>
          <div className="flex items-center justify-between">
            <span className="font-bold">Scan {lastScan.scan_id} complete</span>
            <button onClick={() => setLastScan(null)} className="text-brand-text-muted hover:text-white">✕</button>
          </div>
        </div>
      )}

      <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-elevated/30">
          <div className="flex space-x-2">
            <span className="px-3 py-1 bg-brand-danger/20 text-brand-danger rounded text-xs font-bold font-mono">CRITICAL: {criticalCount}</span>
            <span className="px-3 py-1 bg-brand-warning/20 text-brand-warning rounded text-xs font-bold font-mono hidden md:inline-block">HIGH: {highCount}</span>
            {filterSeverity !== 'ALL' && (
              <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded text-xs font-bold font-mono flex items-center gap-1">
                Filtered: {filterSeverity}
                <button onClick={() => setFilterSeverity('ALL')}>✕</button>
              </span>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setIsFilterOpen(v => !v)}
              className={cn("p-2 rounded-md hover:bg-brand-elevated transition-colors flex items-center gap-1 text-xs font-bold", isFilterOpen ? "text-brand-primary bg-brand-elevated" : "text-brand-text-muted hover:text-brand-text")}>
              <Filter className="w-4 h-4" /> <ChevronDown className={cn("w-3 h-3 transition-transform", isFilterOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 mt-2 w-40 bg-brand-surface border border-brand-border rounded-xl shadow-2xl z-20 p-1 font-mono text-xs">
                  {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as Severity[]).map(s => (
                    <button key={s} onClick={() => { setFilterSeverity(s); setIsFilterOpen(false); }}
                      className={cn("w-full text-left px-3 py-2 rounded-lg transition-colors font-bold uppercase tracking-wider", filterSeverity === s ? "bg-brand-primary/20 text-brand-primary" : "text-brand-text-muted hover:text-brand-text hover:bg-brand-elevated")}>{s}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="divide-y divide-brand-border">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-text-muted" /></div>
          ) : filteredAlerts.length > 0 ? filteredAlerts.map(alert => (
            <div key={alert.id}>
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-brand-elevated/30 transition-colors">
                <div className="flex items-start space-x-4">
                  <div className={cn('p-2 rounded-lg mt-1', alert.severity === 'CRITICAL' ? 'bg-brand-danger/20 text-brand-danger' : alert.severity === 'HIGH' ? 'bg-brand-warning/20 text-brand-warning' : 'bg-brand-accent/20 text-brand-accent')}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">{alert.title}</h3>
                    <p className="text-xs text-brand-text-muted font-mono">{new Date(alert.time).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 ml-12 md:ml-0">
                  <span className={cn('px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded border', alert.severity === 'CRITICAL' ? 'text-brand-danger border-brand-danger/30' : alert.severity === 'HIGH' ? 'text-brand-warning border-brand-warning/30' : 'text-brand-accent border-brand-accent/30')}>{alert.severity}</span>
                  <button onClick={() => setInvestigatingId(investigatingId === alert.id ? null : alert.id)}
                    className={cn("text-xs font-bold uppercase px-3 py-1.5 rounded bg-brand-elevated border border-brand-border transition-colors flex items-center gap-1", investigatingId === alert.id ? "text-brand-primary border-brand-primary/40 bg-brand-primary/10" : "text-brand-primary hover:text-brand-text")}>
                    <ExternalLink className="w-3 h-3" /> {investigatingId === alert.id ? 'Close' : 'Investigate'}
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {investigatingId === alert.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className={cn("mx-5 mb-5 p-4 rounded-xl border font-mono text-xs", alert.severity === 'CRITICAL' ? 'bg-brand-danger/5 border-brand-danger/20' : 'bg-brand-warning/5 border-brand-warning/20')}>
                      <p className="font-bold uppercase text-brand-text mb-2">Incident Details</p>
                      <p className="text-brand-text-muted">Severity: {alert.severity}</p>
                      <p className="text-brand-text-muted">Detected: {new Date(alert.time).toLocaleString()}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )) : (
            <div className="p-12 flex flex-col items-center justify-center text-brand-text-muted">
              <CheckCircle className="w-12 h-12 text-brand-success mb-4 opacity-50" />
              <p className="font-mono text-sm uppercase tracking-widest">No Issues Detected</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
