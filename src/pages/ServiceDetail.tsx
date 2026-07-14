import React, { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Database,
  FileWarning,
  Network,
  Server,
  TerminalSquare,
  Workflow,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import {
  fetchHealth,
  fetchRecentLogs,
  fetchSystemHealth,
  fetchWorkflowHistory,
  type LogEntry,
  type ServiceHealthEntry,
  type WorkflowHistoryEntry,
} from '../lib/api';
import { cn } from '../lib/utils';
import { getServiceCatalogEntry, resolveServiceId } from '../lib/serviceCatalog';

function statusTone(status: string) {
  switch (status) {
    case 'online':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'degraded':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'offline':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    default:
      return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
  }
}

function normalizeStatus(status?: string) {
  if (status === 'ok' || status === 'healthy') return 'online';
  if (status === 'error' || status === 'failed' || status === 'offline') return 'offline';
  if (status === 'degraded' || status === 'warning') return 'degraded';
  return 'unknown';
}

function card(title: string, value: string | number, subtitle: string, icon: React.ElementType) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-brand-text-muted">{title}</span>
        <Icon className="h-4 w-4 text-brand-primary" />
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-brand-text-muted">{subtitle}</div>
    </div>
  );
}

export default function ServiceDetail() {
  const params = useParams();
  const serviceId = resolveServiceId(params.serviceId ?? null);
  const service = getServiceCatalogEntry(serviceId);
  const { restEndpoint, masterToken } = useStore();

  const healthQuery = useQuery({
    queryKey: ['service-detail', 'health', restEndpoint, masterToken],
    queryFn: () => fetchHealth({ restEndpoint, masterToken }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 30000,
  });

  const systemHealthQuery = useQuery({
    queryKey: ['service-detail', 'system-health', restEndpoint, masterToken],
    queryFn: () => fetchSystemHealth({ restEndpoint, masterToken }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 30000,
  });

  const logsQuery = useQuery({
    queryKey: ['service-detail', 'logs', restEndpoint, masterToken],
    queryFn: () => fetchRecentLogs({ restEndpoint, masterToken }, { limit: 120 }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 15000,
  });

  const workflowQuery = useQuery({
    queryKey: ['service-detail', 'workflow-history', restEndpoint, masterToken],
    queryFn: () => fetchWorkflowHistory({ restEndpoint, masterToken }, 25),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 20000,
  });

  const serviceHealth = useMemo(() => {
    if (!service || !healthQuery.data?.services) return null;
    const entries = Object.entries(healthQuery.data.services);
    return (
      entries.find(([key]) =>
        service.healthKeys.some(
          (candidate) => key.toLowerCase() === candidate || key.toLowerCase().includes(candidate)
        )
      ) ?? null
    );
  }, [healthQuery.data, service]);

  const connectorHealth = useMemo(() => {
    if (!service || !systemHealthQuery.data?.connectors) return null;
    const entries = Object.entries(systemHealthQuery.data.connectors);
    return (
      entries.find(([key]) =>
        [...service.healthKeys, ...(service.connectorKeys ?? [])].some(
          (candidate) => key.toLowerCase() === candidate || key.toLowerCase().includes(candidate)
        )
      ) ?? null
    );
  }, [service, systemHealthQuery.data]);

  const matchingLogs = useMemo(() => {
    if (!service) return [];
    const logs = logsQuery.data?.logs ?? [];
    return logs.filter((log) => {
      const haystack = `${log.module} ${log.message}`.toLowerCase();
      return service.logKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
    });
  }, [logsQuery.data, service]);

  const matchingRuns = useMemo(() => {
    if (!service) return [];
    const runs = workflowQuery.data?.history ?? [];
    return runs.filter((run) => {
      const haystack = `${run.topic ?? ''} ${run.error ?? ''} ${
        run.steps?.map((step) => `${step.name} ${step.error ?? ''}`).join(' ') ?? ''
      }`.toLowerCase();
      return service.logKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
    });
  }, [service, workflowQuery.data]);

  const derivedStatus = normalizeStatus(
    (connectorHealth?.[1] as { status?: string } | undefined)?.status ??
      (serviceHealth?.[1] as ServiceHealthEntry | undefined)?.status
  );

  const openLogCount = matchingLogs.filter((log) => log.level === 'ERROR' || log.level === 'CRITICAL').length;

  if (!serviceId || !service) {
    return <Navigate to="/system-architecture" replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full flex-col gap-6"
    >
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Link
                to="/system-architecture"
                className="text-sm text-brand-primary transition-colors hover:text-white"
              >
                System Architecture
              </Link>
              <span className="text-brand-text-muted">/</span>
              <span className="text-sm text-brand-text-muted">{service.label}</span>
            </div>
            <h1 className="text-3xl font-semibold text-white">{service.label}</h1>
            <p className="mt-2 max-w-3xl text-sm text-brand-text-muted">{service.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={cn('rounded-full border px-3 py-1 text-sm font-medium capitalize', statusTone(derivedStatus))}>
              {derivedStatus}
            </span>
            <Link
              to={`/live-logs?search=${encodeURIComponent(service.logKeywords[0] ?? service.id)}`}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-brand-elevated px-3 py-2 text-sm text-white transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
            >
              Open Logs
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/workflow-runs"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-brand-elevated px-3 py-2 text-sm text-white transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
            >
              View Runs
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {card('Health State', derivedStatus, 'Current operator-facing status', Activity)}
        {card(
          'Latency',
          `${(serviceHealth?.[1] as ServiceHealthEntry | undefined)?.latency_ms ?? 0} ms`,
          'Latest reported service latency',
          Network
        )}
        {card('Error Logs', openLogCount, 'Recent errors and critical events', FileWarning)}
        {card('Related Runs', matchingRuns.length, 'Workflow runs touching this service', Workflow)}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-2xl border border-brand-border bg-brand-surface">
          <div className="flex items-center justify-between border-b border-brand-border/60 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Recent Evidence</h2>
              <p className="mt-1 text-xs text-brand-text-muted">Most relevant logs for this service</p>
            </div>
            <TerminalSquare className="h-4 w-4 text-brand-primary" />
          </div>
          <div className="max-h-[520px] overflow-y-auto p-4">
            {matchingLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-brand-border bg-brand-bg/40 p-6 text-sm text-brand-text-muted">
                No recent logs matched this service.
              </div>
            ) : (
              <div className="space-y-3">
                {matchingLogs.slice(0, 18).map((log: LogEntry, index) => (
                  <div key={`${log.timestamp}-${index}`} className="rounded-xl border border-brand-border/60 bg-brand-bg/30 p-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 font-semibold',
                          log.level === 'ERROR' || log.level === 'CRITICAL'
                            ? 'border-red-500/20 bg-red-500/10 text-red-400'
                            : log.level === 'WARNING'
                            ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                            : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                        )}
                      >
                        {log.level}
                      </span>
                      <span className="font-mono text-brand-text-muted">{new Date(log.timestamp).toLocaleString()}</span>
                      <span className="rounded-full bg-brand-elevated px-2 py-0.5 text-brand-text-muted">{log.module}</span>
                    </div>
                    <p className="mt-3 text-sm text-white">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-brand-border bg-brand-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Service Health</h2>
                <p className="mt-1 text-xs text-brand-text-muted">Backend-reported health metadata</p>
              </div>
              <Server className="h-4 w-4 text-brand-primary" />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-brand-text-muted">Service Key</span>
                <span className="font-mono text-white">{serviceHealth?.[0] ?? service.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-text-muted">Latency</span>
                <span className="font-mono text-white">
                  {(serviceHealth?.[1] as ServiceHealthEntry | undefined)?.latency_ms ?? 'n/a'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-brand-text-muted">Reason</span>
                <span className="max-w-[65%] text-right text-white">
                  {(serviceHealth?.[1] as ServiceHealthEntry | undefined)?.reason ??
                    (connectorHealth?.[1] as { reason?: string } | undefined)?.reason ??
                    'No degradation reason reported.'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-border bg-brand-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Connector State</h2>
                <p className="mt-1 text-xs text-brand-text-muted">External provider health where available</p>
              </div>
              <Database className="h-4 w-4 text-brand-primary" />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-brand-text-muted">Connector</span>
                <span className="font-mono text-white">{connectorHealth?.[0] ?? 'n/a'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-text-muted">Status</span>
                <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium capitalize', statusTone(derivedStatus))}>
                  {derivedStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-border bg-brand-surface">
            <div className="flex items-center justify-between border-b border-brand-border/60 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Workflow Touchpoints</h2>
                <p className="mt-1 text-xs text-brand-text-muted">Recent runs related to this service</p>
              </div>
              <Clock3 className="h-4 w-4 text-brand-primary" />
            </div>
            <div className="p-4">
              {matchingRuns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-brand-border bg-brand-bg/40 p-5 text-sm text-brand-text-muted">
                  No recent workflow history matched this service.
                </div>
              ) : (
                <div className="space-y-3">
                  {matchingRuns.slice(0, 6).map((run: WorkflowHistoryEntry, index) => (
                    <div key={`${run.id ?? run.topic ?? 'run'}-${index}`} className="rounded-xl border border-brand-border/60 bg-brand-bg/30 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">{run.topic ?? 'Workflow run'}</p>
                          <p className="mt-1 text-xs text-brand-text-muted">
                            {run.started_at ? new Date(run.started_at).toLocaleString() : 'No timestamp'}
                          </p>
                        </div>
                        <span className="rounded-full border border-brand-border bg-brand-elevated px-2 py-0.5 text-xs capitalize text-white">
                          {run.status ?? 'unknown'}
                        </span>
                      </div>
                      {run.error && <p className="mt-3 text-sm text-red-400">{run.error}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-brand-border bg-brand-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Suggested Actions</h2>
                <p className="mt-1 text-xs text-brand-text-muted">Fast operator moves from this service</p>
              </div>
              <AlertTriangle className="h-4 w-4 text-brand-primary" />
            </div>
            <div className="space-y-2 text-sm">
              <Link to={`/live-logs?search=${encodeURIComponent(service.logKeywords[0] ?? service.id)}`} className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-bg/30 px-4 py-3 text-white transition-colors hover:border-brand-primary/40 hover:text-brand-primary">
                <span>Inspect live logs</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/incident-center" className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-bg/30 px-4 py-3 text-white transition-colors hover:border-brand-primary/40 hover:text-brand-primary">
                <span>Review related incidents</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/workflow-runs" className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-bg/30 px-4 py-3 text-white transition-colors hover:border-brand-primary/40 hover:text-brand-primary">
                <span>Inspect workflow history</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
