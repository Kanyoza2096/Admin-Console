import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import ReactFlow, { 
  Background, Controls, MiniMap, 
  applyNodeChanges, applyEdgeChanges, 
  addEdge, BackgroundVariant, Handle, Position,
  Node, Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  GitBranch, Play, Pause, RefreshCcw, Save, Activity,
  BrainCircuit, Database, Globe, Network, MessageSquare, Zap, Clock
} from 'lucide-react';
import { cn } from '../lib/utils';

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
      {data.stats && (
        <div className="mt-3 pt-2 border-t border-brand-border/50 flex justify-between text-[9px] font-mono">
          <span className="text-brand-text-muted">{data.stats.latency}ms</span>
          <span className="text-brand-primary">{data.stats.tokens} tokens</span>
        </div>
      )}
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

// --- INITIAL DATA ---

const initialNodes: Node[] = [
  { id: '1', type: 'trigger', position: { x: 50, y: 150 }, data: { label: 'CRON Trigger', subLabel: 'Runs every 4 hours', status: 'success' } },
  { id: '2', type: 'ai', position: { x: 350, y: 150 }, data: { label: 'Gemini 3.5 Pro', subLabel: 'Generate Industry News', status: 'running', stats: { latency: 1205, tokens: 450 } } },
  { id: '3', type: 'db', position: { x: 700, y: 50 }, data: { label: 'Supabase Sync', subLabel: 'Store generation history', status: 'idle' } },
  { id: '4', type: 'social', position: { x: 700, y: 250 }, data: { label: 'Publish to Facebook', subLabel: 'Kanyoza Official Page', status: 'idle' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#4F46E5', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', animated: false, style: { stroke: '#1E293B', strokeWidth: 2 } },
  { id: 'e2-4', source: '2', target: '4', animated: false, style: { stroke: '#1E293B', strokeWidth: 2 } },
];

export default function Workflows() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes as Node[]);
  const [edges, setEdges] = useState<Edge[]>(initialEdges as Edge[]);
  const [isRunning, setIsRunning] = useState(false);

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge({ ...params, style: { stroke: '#1E293B', strokeWidth: 2 } }, eds)), []);

  const simulateRun = () => {
    setIsRunning(true);
    // Visual simulation logic here if needed
    setTimeout(() => setIsRunning(false), 5000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center text-white">
            <GitBranch className="w-8 h-8 mr-3 text-brand-primary" />
            Workflow Studio
          </h1>
          <p className="text-brand-text-muted text-xs font-mono mt-1">N8N / LANGFLOW STYLE PIPELINE EDITOR</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={simulateRun}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all",
              isRunning ? "bg-brand-warning/20 text-brand-warning border border-brand-warning/30 animate-pulse" : "bg-brand-success/20 text-brand-success border border-brand-success/30 hover:bg-brand-success/30"
            )}
          >
            {isRunning ? <><Activity className="w-4 h-4" /> Executing...</> : <><Play className="w-4 h-4" /> Run Pipeline</>}
          </button>
          <button className="p-2 bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-white transition-all">
            <Save className="w-4 h-4" />
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

        {/* Live Debug Panel overlay */}
        <div className="absolute right-4 top-4 w-64 bg-brand-surface/90 backdrop-blur-md border border-brand-border rounded-xl shadow-2xl overflow-hidden font-mono z-10">
          <div className="p-3 border-b border-brand-border bg-brand-elevated/50 flex justify-between items-center">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3 h-3 text-brand-primary" /> Live Debug
            </span>
            <span className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
          </div>
          <div className="p-3 text-[10px] text-brand-text-muted space-y-2 max-h-48 overflow-y-auto">
            <div className="text-brand-success">[14:02:11] TRIGGER: CRON activated</div>
            <div className="text-white">[14:02:12] AI: Compiling prompt templates...</div>
            <div className="text-brand-warning">[14:02:13] AI: Generating content (stream)</div>
            <div className="text-brand-text-muted">[14:02:15] AI: Model response received (450 tokens)</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
