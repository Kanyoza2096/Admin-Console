import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  fetchWorkflowHistory,
  fetchWorkflowStatus,
  pauseWorkflow,
  resumeWorkflow,
  triggerPost,
  cancelWorkflow,
  rollbackWorkflow,
  WorkflowHistoryEntry,
  WorkflowJobStatus,
} from '../lib/api';
import { Play, Pause, RotateCcw, XCircle, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function WorkflowRuns() {
  const { restEndpoint, masterToken } = useStore();
  const [history, setHistory] = useState<WorkflowHistoryEntry[]>([]);
  const [status, setStatus] = useState<{ status: WorkflowJobStatus; progress: number; current_step: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [h, s] = await Promise.all([
        fetchWorkflowHistory({ restEndpoint, masterToken }).catch(() => ({ history: [] })),
        fetchWorkflowStatus({ restEndpoint, masterToken }).catch(() => ({ status: 'idle', progress: 0, current_step: '' })),
      ]);
      setHistory(h.history || []);
      setStatus(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [restEndpoint, masterToken]);

  const handlePause = async () => {
    setActionLoading('pause');
    await pauseWorkflow({ restEndpoint, masterToken });
    await loadData();
    setActionLoading(null);
  };

  const handleResume = async () => {
    setActionLoading('resume');
    await resumeWorkflow({ restEndpoint, masterToken });
    await loadData();
    setActionLoading(null);
  };

  const handleTrigger = async () => {
    setActionLoading('trigger');
    await triggerPost({ restEndpoint, masterToken });
    await loadData();
    setActionLoading(null);
  };

  const handleCancel = async (id: string | number) => {
    setActionLoading(`cancel-${id}`);
    await cancelWorkflow({ restEndpoint, masterToken }, id);
    await loadData();
    setActionLoading(null);
  };

  const handleRollback = async (id: string | number) => {
    setActionLoading(`rollback-${id}`);
    await rollbackWorkflow({ restEndpoint, masterToken }, id);
    await loadData();
    setActionLoading(null);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'running':
      case 'active':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'paused':
      case 'idle':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'cancelled':
      case 'rolled_back':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'failed':
      case 'error':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'completed':
      case 'success':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'running':
      case 'active':
        return <Play className="w-4 h-4" />;
      case 'paused':
      case 'idle':
        return <Pause className="w-4 h-4" />;
      case 'cancelled':
      case 'rolled_back':
        return <XCircle className="w-4 h-4" />;
      case 'failed':
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'completed':
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-brand-primary" />
          Workflow Runs
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-surface hover:bg-brand-elevated border border-brand-border text-gray-300"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {status?.status === 'running' ? (
            <button
              onClick={handlePause}
              disabled={actionLoading === 'pause'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/30 disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              {actionLoading === 'pause' ? 'Pausing...' : 'Pause'}
            </button>
          ) : (
            <button
              onClick={handleResume}
              disabled={actionLoading === 'resume'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {actionLoading === 'resume' ? 'Resuming...' : 'Resume'}
            </button>
          )}
          <button
            onClick={handleTrigger}
            disabled={actionLoading === 'trigger'}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {actionLoading === 'trigger' ? 'Triggering...' : 'Trigger Run'}
          </button>
        </div>
      </div>

      {/* Current Status */}
      {status && (
        <div className="p-4 bg-brand-surface border border-brand-border rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Current Status:</span>
                <span className={cn('flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border', getStatusColor(status.status))}>
                  {getStatusIcon(status.status)}
                  {status.status}
                </span>
              </div>
              {status.current_step && (
                <div className="text-gray-400 text-sm">
                  Step: <span className="text-white font-mono">{status.current_step}</span>
                </div>
              )}
            </div>
            {status.progress > 0 && (
              <div className="w-64">
                <div className="h-2 bg-brand-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(status.progress * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History List */}
      <div className="flex-1 bg-brand-surface border border-brand-border rounded-xl overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Loading workflow history...</div>
        ) : history.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No workflow runs yet
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-brand-border/50 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-2">Time</div>
              <div className="col-span-3">Topic</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Duration</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {history.map((run) => (
              <div
                key={run.id || run.topic}
                className="p-4 border-b border-brand-border/30 grid grid-cols-12 gap-4 hover:bg-brand-elevated/30"
              >
                <div className="col-span-2 text-gray-400 text-sm font-mono">
                  {run.started_at ? new Date(run.started_at).toLocaleString() : '—'}
                </div>
                <div className="col-span-3 text-white font-medium">
                  {run.topic || 'Untitled Run'}
                </div>
                <div className="col-span-2">
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', getStatusColor(run.status))}>
                    {getStatusIcon(run.status)}
                    {run.status || 'unknown'}
                  </span>
                </div>
                <div className="col-span-3 text-gray-400 text-sm font-mono">
                  {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '—'}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {run.status === 'running' && (
                    <button
                      onClick={() => handleCancel(run.id || run.topic!)}
                      disabled={actionLoading?.startsWith('cancel')}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  {(run.status === 'completed' || run.status === 'failed') && (
                    <button
                      onClick={() => handleRollback(run.id || run.topic!)}
                      disabled={actionLoading?.startsWith('rollback')}
                      className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
