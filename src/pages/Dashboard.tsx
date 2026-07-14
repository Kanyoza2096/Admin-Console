import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Cpu,
  Database,
  FileText,
  Globe,
  LogOut,
  MessageSquare,
  Server,
  ShieldAlert,
  Terminal,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getServiceCatalogEntry, resolveServiceId } from '../lib/serviceCatalog';
import {
  fetchStats,
  fetchHealth,
  fetchRecentLogs,
  fetchGuardianIssues,
  fetchWorkflowStatus,
  fetchWorkflowHistory,
  fetchAuditLogs,
  fetchSystemHealth,
  type StatsPayload,
  type HealthDeepPayload,
  type LogEntry,
  type GuardianIssue,
  type AuditLogEntry,
  type WorkflowHistoryEntry,
} from '../lib/api';

const StatusBadge = ({
  status,
}: {
  status: 'online' | 'degraded' | 'offline' | 'open' | 'resolved' | 'active' | 'error' | string;
}) => {
  const styles = {
    online: 'bg-green-500/10 text-green-400 border-green-500/20',
    degraded: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    offline: 'bg-red-500/10 text-red-400 border-red-500/20',
    open: 'bg-red-500/10 text-red-400 border-red-500/20',
    resolved: 'bg-green-500/10 text-green-400 border-green-500/20',
    active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-semibold border',
        styles[status as keyof typeof styles] ||
          'bg-gray-500/10 text-gray-400 border-gray-500/20'
      )}
    >
      {status}
    </span>
  );
};

const Card = ({
  children,
  title,
  icon: Icon,
  action,
  className,
}: {
  children: React.ReactNode;
  title?: string;
  icon?: any;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'bg-brand-surface border border-brand-border rounded-2xl flex flex-col overflow-hidden',
      className
    )}
  >
    {(title || Icon || action) && (
      <div className='p-4 border-b border-brand-border/50 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {Icon && <Icon className='w-4 h-4 text-brand-primary' />}
          {title && (
            <h3 className='text-sm font-semibold text-white uppercase tracking-wider'>
              {title}
            </h3>
          )}
        </div>
        {action}
      </div>
    )}
    <div className='p-4 flex-1'>{children}</div>
  </div>
);

const MetricCard = ({
  label,
  value,
  trend,
  trendDir,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  trend?: string;
  trendDir?: 'up' | 'down' | 'neutral';
  icon: any;
  color?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className='bg-brand-surface border border-brand-border p-4 rounded-2xl'
  >
    <div className='flex items-center justify-between mb-2'>
      <div className='flex items-center gap-2'>
        <div
          className={cn(
            'p-2 rounded-lg',
            color === 'green'
              ? 'bg-green-500/10'
              : color === 'yellow'
              ? 'bg-yellow-500/10'
              : color === 'red'
              ? 'bg-red-500/10'
              : 'bg-brand-primary/10'
          )}
        >
          <Icon
            className={cn(
              'w-5 h-5',
              color === 'green'
                ? 'text-green-400'
                : color === 'yellow'
                ? 'text-yellow-400'
                : color === 'red'
                ? 'text-red-400'
                : 'text-brand-primary'
            )}
          />
        </div>
      </div>
    </div>
    <div className='text-2xl font-mono font-bold text-white mb-1'>{value}</div>
    <div className='text-xs text-brand-text-muted'>{label}</div>
    {trend && (
      <div
        className={cn(
          'text-xs font-medium mt-1 flex items-center gap-1',
          trendDir === 'up' ? 'text-green-400' : 'text-brand-text-muted'
        )}
      >
        {trendDir === 'up' && <ArrowUpRight className='w-3 h-3' />}
        {trend}
      </div>
    )}
  </motion.div>
);

export default function Dashboard() {
  const { restEndpoint, masterToken, messages, payloads } = useStore();

  const { data: stats } = useQuery({
    queryKey: ['dashboard/stats', restEndpoint, masterToken],
    queryFn: () => fetchStats({ restEndpoint, masterToken }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 30000,
  });

  const { data: healthDeep } = useQuery({
    queryKey: ['dashboard/health', restEndpoint, masterToken],
    queryFn: () => fetchHealth({ restEndpoint, masterToken }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 30000,
  });

  const { data: recentLogs } = useQuery({
    queryKey: ['dashboard/logs', restEndpoint, masterToken],
    queryFn: () =>
      fetchRecentLogs({ restEndpoint, masterToken }, { limit: 10 }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 15000,
  });

  const { data: guardianIssues } = useQuery({
    queryKey: ['dashboard/guardian', restEndpoint, masterToken],
    queryFn: () => fetchGuardianIssues({ restEndpoint, masterToken }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 30000,
  });

  const { data: workflowStatus } = useQuery({
    queryKey: ['dashboard/workflow/status', restEndpoint, masterToken],
    queryFn: () => fetchWorkflowStatus({ restEndpoint, masterToken }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 10000,
  });

  const { data: workflowHistory } = useQuery({
    queryKey: ['dashboard/workflow/history', restEndpoint, masterToken],
    queryFn: () => fetchWorkflowHistory({ restEndpoint, masterToken }, 10),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 30000,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['dashboard/audit', restEndpoint, masterToken],
    queryFn: () => fetchAuditLogs({ restEndpoint, masterToken }, 10),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 30000,
  });

  const { data: systemHealth } = useQuery({
    queryKey: ['dashboard/system-health', restEndpoint, masterToken],
    queryFn: () => fetchSystemHealth({ restEndpoint, masterToken }),
    enabled: !!restEndpoint && !!masterToken,
    refetchInterval: 30000,
  });

  const onlineServices = healthDeep?.services
    ? Object.values(healthDeep.services).filter((s) => s.status === 'ok')
        .length
    : 0;
  const totalServices = healthDeep?.services
    ? Object.keys(healthDeep.services).length
    : 0;
  const systemHealthPercentage =
    totalServices > 0 ? Math.round((onlineServices / totalServices) * 100) : 100;

  const criticalIssues = guardianIssues?.issues?.filter(
    (i) => i.severity === 'critical'
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='space-y-6 p-4 md:p-6 h-full flex flex-col'
    >
      {/* Top KPI cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <MetricCard
          label='System Health'
          value={`${systemHealthPercentage}%`}
          icon={Activity}
          color={systemHealthPercentage > 90 ? 'green' : 'yellow'}
        />
        <MetricCard
          label='Critical Incidents'
          value={criticalIssues || 0}
          icon={AlertTriangle}
          color={criticalIssues ? 'red' : 'green'}
        />
        <MetricCard
          label='AI Requests Today'
          value={stats?.api_calls_today || 0}
          icon={Zap}
          color='green'
        />
        <MetricCard
          label='Active Workflows'
          value={workflowStatus?.status === 'running' ? 1 : 0}
          icon={Clock}
        />
      </div>

      {/* Main grid */}
      <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 flex-1'>
        {/* System Health */}
        <Card
          title='System Health'
          icon={Server}
          action={
            <Link
              to='/prometheus'
              className='text-xs text-brand-primary hover:underline'
            >
              View all
            </Link>
          }
        >
          <div className='space-y-2'>
            {healthDeep?.services ? (
              Object.entries(healthDeep.services).map(([name, service]) => (
                <div
                  key={name}
                  className='flex items-center justify-between py-1'
                >
                  <Link
                    to={`/services/${resolveServiceId(name) ?? name}`}
                    className='text-sm text-gray-300 capitalize transition-colors hover:text-brand-primary'
                  >
                    {getServiceCatalogEntry(resolveServiceId(name))?.label ?? service.page_name ?? name}
                  </Link>
                  <StatusBadge
                    status={
                      service.status === 'ok'
                        ? 'online'
                        : service.status || 'offline'
                    }
                  />
                </div>
              ))
            ) : (
              <div className='text-sm text-brand-text-muted'>
                No system status available
              </div>
            )}
          </div>
        </Card>

        {/* Active Incidents */}
        <Card
          title='Active Incidents'
          icon={ShieldAlert}
          action={
            <Link
              to='/incident-center'
              className='text-xs text-brand-primary hover:underline'
            >
              View all
            </Link>
          }
        >
          <div className='space-y-3'>
            {guardianIssues?.issues?.slice(0, 5).map((issue) => (
              <div key={issue.id} className='flex items-start gap-3'>
                <div
                  className={cn(
                    'mt-1 w-2 h-2 rounded-full',
                    issue.severity === 'critical'
                      ? 'bg-red-500'
                      : issue.severity === 'high'
                      ? 'bg-orange-500'
                      : issue.severity === 'medium'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  )}
                />
                <div className='flex-1'>
                  <p className='text-sm font-medium text-white truncate'>
                    {issue.title || 'Security issue'}
                  </p>
                  <p className='text-xs text-brand-text-muted'>
                    {issue.severity} · {issue.status || 'Open'}
                  </p>
                </div>
              </div>
            ))}
            {(!guardianIssues?.issues ||
              guardianIssues.issues.length === 0) && (
              <div className='text-sm text-brand-text-muted'>
                No active incidents
              </div>
            )}
          </div>
        </Card>

        {/* Workflow Queue */}
        <Card
          title='Workflow Queue'
          icon={Clock}
          action={
            <Link
              to='/workflow-runs'
              className='text-xs text-brand-primary hover:underline'
            >
              View all
            </Link>
          }
        >
          <div className='space-y-3'>
            {workflowHistory?.history?.slice(0, 5).map((run) => (
              <div key={run.id || run.topic} className='flex items-center gap-3'>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-white truncate'>
                    {run.topic || 'Workflow run'}
                  </p>
                  <p className='text-xs text-brand-text-muted'>
                    {run.started_at
                      ? new Date(run.started_at).toLocaleTimeString()
                      : ''}
                  </p>
                </div>
                <StatusBadge status={run.status || 'unknown'} />
              </div>
            ))}
            {(!workflowHistory?.history ||
              workflowHistory.history.length === 0) && (
              <div className='text-sm text-brand-text-muted'>
                No recent workflow runs
              </div>
            )}
          </div>
        </Card>

        {/* Connector Failures */}
        <Card title='Connector Status' icon={Database}>
          <div className='space-y-2'>
            {systemHealth?.connectors ? (
              Object.entries(systemHealth.connectors).map(([name, conn]) => (
                <div
                  key={name}
                  className='flex items-center justify-between py-1'
                >
                  <span className='text-sm text-gray-300 capitalize'>
                    {name}
                  </span>
                  <StatusBadge
                    status={
                      (conn as any).status === 'ok' || (conn as any).status === 'healthy'
                        ? 'online'
                        : (conn as any).status || 'offline'
                    }
                  />
                </div>
              ))
            ) : (
              <div className='text-sm text-brand-text-muted'>
                No connector status available
              </div>
            )}
          </div>
        </Card>

        {/* Recent Audit Events */}
        <Card
          title='Recent Audit Logs'
          icon={Users}
          action={
            <Link
              to='/audit-logs'
              className='text-xs text-brand-primary hover:underline'
            >
              View all
            </Link>
          }
        >
          <div className='space-y-2'>
            {auditLogs?.logs?.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className='flex items-start justify-between border-b border-brand-border/30 pb-2 last:border-0 last:pb-0'
              >
                <div>
                  <p className='text-sm text-white font-medium'>
                    {log.action || 'Event'}
                  </p>
                  <p className='text-xs text-brand-text-muted'>
                    {log.user || 'System'} ·{' '}
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString()
                      : ''}
                  </p>
                </div>
              </div>
            ))}
            {(!auditLogs?.logs || auditLogs.logs.length === 0) && (
              <div className='text-sm text-brand-text-muted'>
                No recent audit events
              </div>
            )}
          </div>
        </Card>

        {/* Live Logs */}
        <Card
          title='Live Logs'
          icon={Terminal}
          action={
            <Link
              to='/live-logs'
              className='text-xs text-brand-primary hover:underline'
            >
              View all
            </Link>
          }
        >
          <div className='space-y-1 font-mono text-xs'>
            {recentLogs?.logs?.slice(0, 5).map((log, i) => (
              <div key={i} className='truncate'>
                <span
                  className={cn(
                    'mr-2 font-bold',
                    log.level === 'ERROR' || log.level === 'CRITICAL'
                      ? 'text-red-400'
                      : log.level === 'WARNING'
                      ? 'text-yellow-400'
                      : 'text-blue-400'
                  )}
                >
                  {log.level}
                </span>
                <span className='text-brand-text-muted mr-2'>
                  {log.module}
                </span>
                <span className='text-white/80'>{log.message}</span>
              </div>
            ))}
            {(!recentLogs?.logs || recentLogs.logs.length === 0) && (
              <div className='text-sm text-brand-text-muted'>
                No recent logs
              </div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
