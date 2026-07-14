import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { ShieldAlert, Bug, Activity, AlertTriangle, FileText, RefreshCw, Play, Check, Server, Clock, Link } from 'lucide-react';
import { cn } from '../lib/utils';

interface GuardianStatus {
  configured?: boolean;
  last_scan_at?: string;
  total_findings?: number;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  last_scan?: string;
  issues?: any[];
}

interface GuardianIssue {
  id: string;
  title: string;
  severity: string;
  repo?: string;
  status?: string;
}

interface AuditLogEntry {
  id: string;
  action?: string;
  user?: string;
  resource?: string;
  status?: string;
  created_at?: string;
  timestamp?: string;
}

interface SystemHealthEntry {
  status?: string;
  latency_ms?: number;
  ok?: boolean;
  page_name?: string;
}

export default function Security() {
  const { restEndpoint, masterToken } = useStore();

  const [status, setStatus] = useState<GuardianStatus | null>(null);
  const [issues, setIssues] = useState<GuardianIssue[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [systemHealth, setSystemHealth] = useState<Record<string, SystemHealthEntry>>({});
  const [connectors, setConnectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [severityFilter, setSeverityFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');

  const headers = masterToken ? { Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statusRes, issuesRes, logsRes, healthRes, connRes] = await Promise.all([
        fetch(`${base}/guardian/status`, { headers }),
        fetch(`${base}/guardian/issues${severityFilter ? `?severity=${severityFilter}` : ''}`, { headers }),
        fetch(`${base}/audit-logs?limit=50`, { headers }),
        fetch(`${base}/system/health`, { headers }),
        fetch(`${base}/system/connectors`, { headers }),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (issuesRes.ok) { const d = await issuesRes.json(); setIssues(d.issues || []); }
      if (logsRes.ok) { const d = await logsRes.json(); setLogs(d.logs || []); }
      if (healthRes.ok) { const d = await healthRes.json(); setSystemHealth(d.connectors || d.services || {}); }
      if (connRes.ok) { const d = await connRes.json(); setConnectors(d.supported_connectors || []); }
    } catch (err) {
      showToast('Failed to load security data', false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [restEndpoint, severityFilter]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${base}/guardian/scan`, { method: 'POST', headers });
      const d = await res.json();
      showToast(d.message || 'Scan started', true);
      setTimeout(fetchAll, 3000);
    } catch (err: any) {
      showToast(err.message || 'Scan failed', false);
    } finally {
      setScanning(false);
    }
  };

  const total = status?.total_findings ?? issues.length;
  const critical = status?.critical ?? issues.filter(i => i.severity === 'critical').length;
  const high = status?.high ?? issues.filter(i => i.severity === 'high').length;
  const score = Math.max(0, 100 - critical * 15 - high * 8 - Math.max(0, total - critical - high) * 2);
  const circumference = 2 * Math.PI * 45;
  const dashArray = `${(score / 100) * circumference} ${circumference}`;

  const getSeverityClass = (severity: string) => {
    switch ((severity || '').toLowerCase()) {
      case 'critical': return 'bg-[#EF4444]/20 border-[#EF4444]/30 text-[#EF4444]';
      case 'high': return 'bg-[#F97316]/20 border-[#F97316]/30 text-[#F97316]';
      case 'medium': return 'bg-[#EAB308]/20 border-[#EAB308]/30 text-[#EAB308]';
      default: return 'bg-brand-text-muted/20 border-brand-border text-brand-text-muted';
    }
  };

  const healthColor = (s?: string) => {
    switch ((s || '').toLowerCase()) {
      case 'healthy': case 'ok': case 'up': return 'text-brand-success';
      case 'degraded': case 'warn': return 'text-brand-warning';
      default: return 'text-brand-danger';
    }
  };

  const healthServices = Object.entries(systemHealth);
  const filteredLogs = logs.filter(l => !auditActionFilter || (l.action || '').toLowerCase().includes(auditActionFilter.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20 md:pb-0">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl border text-sm font-bold font-mono shadow-lg", toast.ok ? "bg-brand-success/10 text-brand-success border-brand-success/30" : "bg-brand-danger/10 text-brand-danger border-brand-danger/30")}>
            {toast.ok ? <Check className="w-4 h-4 inline mr-2" /> : <AlertTriangle className="w-4 h-4 inline mr-2" />}{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-brand-primary" /> Security Center
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">GUARDIAN THREAT DETECTION & AUDIT TRAIL</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAll} className="p-2.5 bg-brand-elevated rounded-xl hover:bg-brand-border/50 transition-colors border border-brand-border">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button onClick={handleScan} disabled={scanning}
            className="px-5 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-primary/90 transition-colors shadow-glow-primary flex items-center gap-2 disabled:opacity-60">
            {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-brand-surface border border-brand-border rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex items-center justify-center gap-6">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-brand-border" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                  className={cn('transition-all duration-1000', score > 80 ? 'text-brand-success' : score > 65 ? 'text-brand-warning' : 'text-brand-danger')}
                  strokeDasharray={dashArray} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn('text-2xl font-bold', score > 80 ? 'text-brand-success' : score > 65 ? 'text-brand-warning' : 'text-brand-danger')}>{score}</span>
              </div>
            </div>
            <div>
              <div className="text-brand-text-muted text-xs font-mono mb-1 uppercase">Security Score</div>
              <div className={cn('font-bold text-sm', score > 80 ? 'text-brand-success' : 'text-brand-warning')}>{score > 80 ? 'Guarded' : 'Action Needed'}</div>
              {status?.last_scan && <div className="text-[10px] font-mono text-brand-text-muted mt-1">{status.last_scan}</div>}
            </div>
          </div>
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-center">
            <div className="w-10 h-10 bg-brand-danger/20 rounded-xl flex items-center justify-center mb-4"><Bug className="w-5 h-5 text-brand-danger" /></div>
            <div className="text-3xl font-bold text-brand-text">{critical}</div>
            <div className="text-brand-text-muted text-xs font-mono uppercase mt-1">Critical</div>
          </div>
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-center">
            <div className="w-10 h-10 bg-brand-warning/20 rounded-xl flex items-center justify-center mb-4"><AlertTriangle className="w-5 h-5 text-brand-warning" /></div>
            <div className="text-3xl font-bold text-brand-text">{total}</div>
            <div className="text-brand-text-muted text-xs font-mono uppercase mt-1">Total Issues</div>
          </div>
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col justify-center">
            <div className="w-10 h-10 bg-brand-primary/20 rounded-xl flex items-center justify-center mb-4"><Activity className="w-5 h-5 text-brand-primary" /></div>
            <div className="text-3xl font-bold text-brand-text">{status?.configured ? 'Yes' : 'No'}</div>
            <div className="text-brand-text-muted text-xs font-mono uppercase mt-1">Guardian Active</div>
          </div>
        </div>
      )}

      {/* System Health */}
      {healthServices.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text-muted mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-brand-success" /> System Health
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {healthServices.map(([name, svc]) => (
              <div key={name} className="bg-brand-elevated border border-brand-border rounded-xl p-3">
                <div className={cn('text-xs font-bold', healthColor(svc.status))}>{(svc.status || 'unknown').toUpperCase()}</div>
                <div className="text-xs text-brand-text mt-0.5">{svc.page_name || name}</div>
                {svc.latency_ms !== undefined && <div className="text-[9px] font-mono text-brand-text-muted mt-0.5">{svc.latency_ms}ms</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Connectors */}
      {connectors.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text-muted mb-4 flex items-center gap-2">
            <Link className="w-4 h-4 text-brand-accent" /> System Connectors
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {connectors.map((name, i) => (
              <div key={i} className="bg-brand-elevated border border-brand-border rounded-xl p-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-success shrink-0" />
                <span className="text-xs font-bold text-brand-text capitalize">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guardian Findings */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text-muted flex items-center gap-2"><Activity className="w-4 h-4 text-brand-danger" /> Guardian Findings</h2>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
            className="bg-brand-elevated border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text font-mono focus:outline-none focus:border-brand-primary">
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-brand-border bg-brand-elevated">{['Title','Repo','Severity','Status'].map(h => <th key={h} className="py-3 px-4 text-[10px] font-mono uppercase tracking-widest text-brand-text-muted">{h}</th>)}</tr></thead>
            <tbody>
              {issues.map(issue => (
                <tr key={issue.id} className="border-b border-brand-border/50 hover:bg-brand-elevated/40 transition-colors">
                  <td className="py-3 px-4 text-sm font-bold text-brand-text">{issue.title || 'Untitled'}</td>
                  <td className="py-3 px-4 text-xs font-mono text-brand-text-muted">{issue.repo || '—'}</td>
                  <td className="py-3 px-4"><span className={cn('px-2 py-1 rounded-md text-[10px] font-bold border uppercase', getSeverityClass(issue.severity))}>{issue.severity}</span></td>
                  <td className="py-3 px-4 text-sm text-brand-text-muted">{issue.status || 'open'}</td>
                </tr>
              ))}
              {issues.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-brand-text-muted font-mono uppercase text-xs">No security findings.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text-muted flex items-center gap-2"><FileText className="w-4 h-4 text-brand-accent" /> Audit Log</h2>
          <input type="text" placeholder="Filter by action…" value={auditActionFilter} onChange={e => setAuditActionFilter(e.target.value)}
            className="bg-brand-elevated border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text font-mono focus:outline-none focus:border-brand-primary w-40" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-brand-border bg-brand-elevated">{['Time','Action','User','Resource','Status'].map(h => <th key={h} className="py-3 px-4 text-[10px] font-mono uppercase tracking-widest text-brand-text-muted">{h}</th>)}</tr></thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} className="border-b border-brand-border/50 hover:bg-brand-elevated/40 transition-colors">
                  <td className="py-3 px-4 text-xs font-mono text-brand-text-muted whitespace-nowrap">{log.created_at || log.timestamp || '—'}</td>
                  <td className="py-3 px-4 text-sm font-bold text-brand-text">{log.action || '—'}</td>
                  <td className="py-3 px-4 text-xs font-mono text-brand-text-muted">{log.user || '—'}</td>
                  <td className="py-3 px-4 text-xs text-brand-text-muted">{log.resource || '—'}</td>
                  <td className="py-3 px-4 text-sm text-brand-text-muted">{log.status || '—'}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-brand-text-muted font-mono uppercase text-xs">No audit events recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
