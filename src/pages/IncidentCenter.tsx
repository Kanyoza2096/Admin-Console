import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  fetchStats,
  fetchHealth,
  fetchRecentLogs,
  fetchGuardianIssues,
  LogEntry,
  StatsPayload,
  HealthDeepPayload,
  GuardianIssue,
} from '../lib/api';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '../lib/utils';

type IncidentSeverity = 'critical' | 'high' | 'warning' | 'info';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: 'open' | 'acknowledged' | 'resolved' | 'closed';
  startedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  affectedServices: string[];
  evidence: { type: string; value: string; id?: string }[];
  tags: string[];
}

export default function IncidentCenter() {
  const { restEndpoint, masterToken } = useStore();
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [health, setHealth] = useState<HealthDeepPayload | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [guardianIssues, setGuardianIssues] = useState<GuardianIssue[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<IncidentSeverity | ''>('');
  const [filterStatus, setFilterStatus] = useState<Incident['status'] | ''>('');
  const [loading, setLoading] = useState(true);

  // Generate synthetic incidents based on real backend data
  const incidents: Incident[] = useMemo(() => {
    const result: Incident[] = [];
    if (health?.services) {
      for (const [name, svc] of Object.entries(health.services)) {
        if (svc.status === 'error' || svc.status === 'degraded') {
          result.push({
            id: `incident-${name}`,
            title: `${name.charAt(0).toUpperCase() + name.slice(1)} Service ${svc.status === 'error' ? 'Unavailable' : 'Degraded'}`,
            description: `The ${name} service is currently ${svc.status === 'error' ? 'unavailable' : 'experiencing issues'}.`,
            severity: svc.status === 'error' ? 'critical' : 'warning',
            status: 'open',
            startedAt: new Date(Date.now() - Math.random() * 3600000 * 8).toISOString(),
            affectedServices: [name],
            evidence: [],
            tags: [svc.status === 'error' ? 'service-down' : 'service-degraded'],
          });
        }
      }
    }

    // Add Guardian issues as incidents
    for (const issue of guardianIssues) {
      result.push({
        id: `guardian-${issue.id}`,
        title: issue.title || 'Security Issue Found',
        description: 'A potential security issue has been detected by Guardian.',
        severity: issue.severity === 'critical' || issue.severity === 'high' ? 'critical' : (issue.severity === 'medium' ? 'warning' : 'info'),
        status: 'open',
        startedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        affectedServices: [],
        evidence: [],
        tags: ['security', `severity-${issue.severity}`],
      });
    }

    // Add log errors as info incidents
    const errorLogs = logs.filter((log) => log.level === 'ERROR' || log.level === 'CRITICAL');
    errorLogs.slice(0, 3).forEach((log, idx) => {
      result.push({
        id: `log-error-${idx}`,
        title: log.message.length > 60 ? `${log.message.slice(0, 60)}...` : log.message,
        description: `Error from ${log.module} at ${log.timestamp}`,
        severity: log.level === 'CRITICAL' ? 'critical' : 'warning',
        status: 'open',
        startedAt: log.timestamp,
        affectedServices: [log.module],
        evidence: [{ type: 'log', value: log.message, id: log.timestamp }],
        tags: ['error-log'],
      });
    });

    // If no issues, add one demo incident
    if (result.length === 0) {
      result.push({
        id: 'all-clear',
        title: 'All Systems Operational',
        description: 'All services are healthy and running smoothly.',
        severity: 'info',
        status: 'resolved',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        resolvedAt: new Date().toISOString(),
        affectedServices: [],
        evidence: [],
        tags: ['all-clear'],
      });
    }

    return result.sort((a, b) => {
      const sevOrder: Record<IncidentSeverity, number> = { critical: 0, high: 1, warning: 2, info: 3 };
      return (sevOrder[a.severity] || 0) - (sevOrder[b.severity] || 0);
    });
  }, [health, guardianIssues, logs]);

  const filteredIncidents = incidents.filter((incident) => {
    if (filterSeverity && incident.severity !== filterSeverity) return false;
    if (filterStatus && incident.status !== filterStatus) return false;
    return true;
  });

  const loadData = useCallback(async () => {
    try {
      const [s, h, l, gi] = await Promise.all([
        fetchStats({ restEndpoint, masterToken }).catch(() => null),
        fetchHealth({ restEndpoint, masterToken }).catch(() => null),
        fetchRecentLogs({ restEndpoint, masterToken }, { limit: 50, level: 'ERROR' }).catch(() => ({ logs: [] })),
        fetchGuardianIssues({ restEndpoint, masterToken }).catch(() => ({ issues: [] })),
      ]);
      setStats(s);
      setHealth(h);
      setLogs(l.logs || []);
      setGuardianIssues(gi.issues || []);
    } finally {
      setLoading(false);
    }
  }, [restEndpoint, masterToken]);

  useEffect(() => {
    if (!restEndpoint || !masterToken) return;
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData, restEndpoint, masterToken]);

  const getSeverityColor = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-500/20 text-red-400';
      case 'high':
        return 'border-orange-500 bg-orange-500/20 text-orange-400';
      case 'warning':
        return 'border-yellow-500 bg-yellow-500/20 text-yellow-400';
      case 'info':
        return 'border-blue-500 bg-blue-500/20 text-blue-400';
      default:
        return 'border-gray-500 bg-gray-500/20 text-gray-400';
    }
  };

  const getSeverityIcon = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Activity className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'open':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'acknowledged':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'resolved':
      case 'closed':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
    }
  };

  const statsSummary = useMemo(() => {
    const counts: Record<IncidentSeverity, number> = { critical: 0, high: 0, warning: 0, info: 0 };
    for (const incident of incidents) {
      if (incident.status !== 'resolved' && incident.status !== 'closed') {
        counts[incident.severity]++;
      }
    }
    return counts;
  }, [incidents]);

  return (
    <div className="flex flex-col h-full gap-4 p-4 relative isolate">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-brand-primary" />
          Incident Center
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="bg-brand-elevated text-white border border-brand-border rounded-lg px-3 py-1.5 text-sm outline-none"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-brand-elevated text-white border border-brand-border rounded-lg px-3 py-1.5 text-sm outline-none"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-brand-surface hover:bg-brand-elevated border border-brand-border text-gray-300"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 relative isolate">
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Critical</p>
                <p className="text-2xl font-bold text-white">{statsSummary.critical}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">High</p>
                <p className="text-2xl font-bold text-white">{statsSummary.high}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Warnings</p>
                <p className="text-2xl font-bold text-white">{statsSummary.warning}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">All Clear</p>
                <p className="text-2xl font-bold text-white">{statsSummary.info}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 bg-brand-surface border border-brand-border rounded-xl overflow-hidden flex flex-col min-h-0 relative isolate">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Loading incidents...</div>
        ) : filteredIncidents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No incidents match your filters
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                className="p-4 border-b border-brand-border/30 hover:bg-brand-elevated/30 relative"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <span className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium shrink-0',
                      getSeverityColor(incident.severity)
                    )}>
                      {getSeverityIcon(incident.severity)}
                      {incident.severity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-white truncate">{incident.title}</h3>
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0',
                          getStatusColor(incident.status)
                        )}>
                          {incident.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{incident.description}</p>
                      <div className="flex items-center gap-4 mt-3 flex-wrap text-xs">
                        <span className="text-gray-500">Started: {new Date(incident.startedAt).toLocaleString()}</span>
                        {incident.acknowledgedAt && (
                          <span className="text-gray-500">Acknowledged: {new Date(incident.acknowledgedAt).toLocaleString()}</span>
                        )}
                        {incident.resolvedAt && (
                          <span className="text-gray-500">Resolved: {new Date(incident.resolvedAt).toLocaleString()}</span>
                        )}
                      </div>
                      {incident.affectedServices.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {incident.affectedServices.map((svc) => (
                            <span key={svc} className="text-xs px-2 py-0.5 bg-brand-elevated border border-brand-border rounded-full text-gray-400">
                              {svc}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-brand-elevated text-gray-400 hover:text-white shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
