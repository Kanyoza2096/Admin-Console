import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import ReactFlow, { 
  Background, Controls, MiniMap, 
  applyNodeChanges, applyEdgeChanges, 
  addEdge, BackgroundVariant, Handle, Position,
  Node, Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  GitBranch, Play, Pause, RefreshCcw, Activity,
  BrainCircuit, Database, Globe, Clock, AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { fetchWorkflowStatus, pauseWorkflow, resumeWorkflow, triggerPost } from '../lib/api';

// --- CUSTOM NODES ---

const CustomNodeTemplate = ({ data, icon: Icon, colorClass, borderClass }: any) => {
  return (
    <div className={cn("px-4 py-3 rounded-xl border bg-brand-surface/90 backdrop-blur-md shadow-xl min-w-[200px] transition-all", borderClass)}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-brand-elevated border-2 border-brand-text-muted" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", colorClass)}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">{data.label}</span>
        </div>
        {data.status === 'running' && <Activity className="w-3 h-3 text-brand-primary animate-pulse" />}
        {data.status === 'success' && <div className="w-2 h-2 rounded-full bg-brand-success" />}
        {data.status === 'error' && <div className="w-2 h-2 rounded-full bg-brand-danger" />}
      </div>
      <div className="text-[10px] text-brand-text-muted font-mono">{data.subLabel || 'Configure node properties'}</div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-brand-elevated border-2 border-brand-primary" />
    </div>
  );
};

const TriggerNode = ({ data }: any) => <CustomNodeTemplate data={data} icon={Clock} colorClass="bg-brand-warning/20 text-brand-warning" borderClass="border-brand-warning/30" />;
const AINode = ({ data }: any) => <CustomNodeTemplate data={data} icon={BrainCircuit} colorClass="bg-brand-primary/20 text-brand-primary" borderClass="border-brand-primary/50 ring-1 ring-brand-primary/20" />;
const DBNode = ({ data }: any) => <CustomNodeTemplate data={data} icon={Database} colorClass="bg-brand-accent/20 text-brand-accent" borderClass="border-brand-accent/30" />;
const SocialNode = ({ data }: any) => <CustomNodeTemplate data={data} icon={Globe} colorClass="bg-brand-success/20 text-brand-success" borderClass="border-brand-success/30" />;

const nodeTypes = {
  trigger: TriggerNode,
  ai: AINode,
  db: DBNode,
  social: SocialNode
};

// --- STATIC TOPOLOGY (shape only; status driven by real API) ---

const BASE_NODES: Node[] = [
  { id: '1', type: 'trigger', position: { x: 50, y: 150 }, data: { label: 'CRON Trigger', subLabel: 'Scheduled content posting', status: 'idle' } },
  { id: '2', type: 'ai',      position: { x: 350, y: 150 }, data: { label: 'Gemini AI',    subLabel: 'Generate content',          status: 'idle' } },
  { id: '3', type: 'db',      position: { x: 700, y: 50  }, data: { label: 'Supabase Sync', subLabel: 'Store generation history',  status: 'idle' } },
  { id: '4', type: 'social',  position: { x: 700, y: 250 }, data: { label: 'Publish',       subLabel: 'Post to configured pages',  status: 'idle' } },
];

const BASE_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: false, style: { stroke: '#1E293B', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', animated: false, style: { stroke: '#1E293B', strokeWidth: 2 } },
  { id: 'e2-4', source: '2', target: '4', animated: false, style: { stroke: '#1E293B', strokeWidth: 2 } },
];

/** Map workflow status / current_step to per-node status */
function applyWorkflowStatus(
  baseNodes: Node[],
  wf: { status: string; current_step: string } | undefined
): Node[] {
  if (!wf) return baseNodes;
  const { status, current_step } = wf;
  const step = (current_step || '').toLowerCase();

  return baseNodes.map(node => {
    let nodeStatus: string = 'idle';

    if (status === 'running') {
      // Highlight node whose label/id matches current_step
      const matches =
        node.data.label.toLowerCase().includes(step) ||
        node.id === step ||
        (step.includes('trigger') && node.id === '1') ||
        (step.includes('ai') || step.includes('gemini')) && node.id === '2' ||
        (step.includes('supabase') || step.includes('db') || step.includes('sync')) && node.id === '3' ||
        (step.includes('publish') || step.includes('facebook') || step.includes('social')) && node.id === '4';
      nodeStatus = matches ? 'running' : 'success';
    } else if (status === 'paused') {
      nodeStatus = 'idle';
    } else if (status === 'error') {
      nodeStatus = 'error';
    } else {
      nodeStatus = 'idle';
    }

    return { ...node, data: { ...node.data, status: nodeStatus } };
  });
}

/** Animate edge from trigger→AI when running */
function applyWorkflowEdges(
  baseEdges: Edge[],
  wf: { status: string } | undefined
): Edge[] {
  const isRunning = wf?.status === 'running';
  return baseEdges.map(e => ({
    ...e,
    animated: isRunning,
    style: { ...e.style, stroke: isRunning ? '#4F46E5' : '#1E293B' },
  }));
}

export default function Workflows() {
  const { restEndpoint, masterToken, triggerNotification } = useStore();
  const cfg = { restEndpoint, masterToken };

  const [nodes, setNodes] = useState<Node[]>(BASE_NODES);
  const [edges, setEdges] = useState<Edge[]>(BASE_EDGES);

  const onNodesChange = useCallback((changes: any) => setNodes(nds => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: any) => setEdges(eds => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: any) => setEdges(eds => addEdge({ ...params, style: { stroke: '#1E293B', strokeWidth: 2 } }, eds)), []);

  // Real workflow status
  const { data: wfStatus, isError: wfError, error: wfErr, refetch } = useQuery({
    queryKey: ['workflow-status', restEndpoint],
    queryFn: () => fetchWorkflowStatus(cfg),
    retry: 1,
    staleTime: 10_000,
    refetchInterval: 10_000,
    select: (data) => {
      // Side-effect: update canvas
      setNodes(applyWorkflowStatus(BASE_NODES, data));
      setEdges(applyWorkflowEdges(BASE_EDGES, data));
      return data;
    },
  });

  const triggerMut = useMutation({
    mutationFn: () => triggerPost(cfg),
    onSuccess: () => {
      triggerNotification({ type: 'success', title: 'Pipeline triggered', message: 'Workflow run started.' });
      refetch();
    },
    onError: (err: any) => {
      triggerNotification({ type: 'warning', title: 'Trigger failed', message: err?.message || 'Could not start pipeline.' });
    },
  });

  const pauseMut = useMutation({
    mutationFn: () => pauseWorkflow(cfg),
    onSuccess: () => {
      triggerNotification({ type: 'info', title: 'Workflow paused' });
      refetch();
    },
    onError: (err: any) => {
      triggerNotification({ type: 'warning', title: 'Pause failed', message: err?.message || 'Could not pause workflow.' });
    },
  });

  const resumeMut = useMutation({
    mutationFn: () => resumeWorkflow(cfg),
    onSuccess: () => {
      triggerNotification({ type: 'success', title: 'Workflow resumed' });
      refetch();
    },
    onError: (err: any) => {
      triggerNotification({ type: 'warning', title: 'Resume failed', message: err?.message || 'Could not resume workflow.' });
    },
  });

  const isRunning = wfStatus?.status === 'running';
  const isPaused  = wfStatus?.status === 'paused';
  const isBusy = triggerMut.isPending || pauseMut.isPending || resumeMut.isPending;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center text-white">
            <GitBranch className="w-8 h-8 mr-3 text-brand-primary" />
            Workflow Studio
          </h1>
          <p className="text-brand-text-muted text-xs font-mono mt-1">
            {wfStatus
              ? `STATUS: ${wfStatus.status.toUpperCase()}${wfStatus.current_step ? ` — ${wfStatus.current_step}` : ''}`
              : wfError
                ? 'COULD NOT FETCH WORKFLOW STATUS'
                : 'LOADING WORKFLOW STATUS…'}
          </p>
        </div>

        {wfError && (
          <div className="flex items-center gap-2 text-brand-danger text-xs font-mono">
            <AlertCircle className="w-4 h-4" />
            {(wfErr as any)?.message || 'Backend error'}
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Run / Trigger */}
          {!isRunning && !isPaused && (
            <button
              onClick={() => triggerMut.mutate()}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider bg-brand-success/20 text-brand-success border border-brand-success/30 hover:bg-brand-success/30 disabled:opacity-50 transition-all"
            >
              <Play className="w-4 h-4" />
              {triggerMut.isPending ? 'Starting…' : 'Run Pipeline'}
            </button>
          )}

          {/* Pause */}
          {isRunning && (
            <button
              onClick={() => pauseMut.mutate()}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider bg-brand-warning/20 text-brand-warning border border-brand-warning/30 hover:bg-brand-warning/30 disabled:opacity-50 transition-all"
            >
              <Pause className="w-4 h-4" />
              {pauseMut.isPending ? 'Pausing…' : 'Pause'}
            </button>
          )}

          {/* Resume */}
          {isPaused && (
            <button
              onClick={() => resumeMut.mutate()}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider bg-brand-primary/20 text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/30 disabled:opacity-50 transition-all"
            >
              <Play className="w-4 h-4" />
              {resumeMut.isPending ? 'Resuming…' : 'Resume'}
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-2 bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-white transition-all"
            title="Refresh status"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 bg-brand-bg border border-brand-border rounded-2xl overflow-hidden relative shadow-2xl">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-brand-bg"
        >
          <Background color="#1E293B" gap={20} variant={BackgroundVariant.Dots} size={2} />
          <Controls className="bg-brand-surface border-brand-border fill-white text-white" />
          <MiniMap
            nodeColor={(n: any) => {
              if (n.type === 'trigger') return '#F59E0B';
              if (n.type === 'ai') return '#4F46E5';
              if (n.type === 'db') return '#06B6D4';
              return '#10B981';
            }}
            maskColor="rgba(5, 8, 22, 0.7)"
            className="bg-brand-surface border border-brand-border rounded-xl shadow-xl"
          />
        </ReactFlow>

        {/* Status overlay — shown only when there's real status */}
        {wfStatus && (
          <div className="absolute right-4 top-4 w-56 bg-brand-surface/90 backdrop-blur-md border border-brand-border rounded-xl shadow-2xl overflow-hidden font-mono z-10">
            <div className="p-3 border-b border-brand-border bg-brand-elevated/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3 h-3 text-brand-primary" /> Workflow Status
              </span>
              <span className={cn(
                "w-2 h-2 rounded-full",
                wfStatus.status === 'running' ? 'bg-brand-success animate-pulse' :
                wfStatus.status === 'paused'  ? 'bg-brand-warning' :
                wfStatus.status === 'error'   ? 'bg-brand-danger animate-pulse' :
                'bg-brand-text-muted'
              )} />
            </div>
            <div className="p-3 text-[10px] text-brand-text-muted space-y-1.5">
              <div className="flex justify-between">
                <span>Status</span>
                <span className={cn(
                  'font-bold uppercase',
                  wfStatus.status === 'running' ? 'text-brand-success' :
                  wfStatus.status === 'paused'  ? 'text-brand-warning' :
                  wfStatus.status === 'error'   ? 'text-brand-danger' :
                  'text-brand-text'
                )}>{wfStatus.status}</span>
              </div>
              {wfStatus.current_step && (
                <div className="flex justify-between">
                  <span>Step</span>
                  <span className="text-white truncate max-w-[120px]">{wfStatus.current_step}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Progress</span>
                <span className="text-brand-primary font-bold">{wfStatus.progress ?? 0}%</span>
              </div>
              {typeof wfStatus.progress === 'number' && (
                <div className="w-full bg-brand-elevated rounded-full h-1 mt-1">
                  <div
                    className="h-full bg-brand-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, wfStatus.progress)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
