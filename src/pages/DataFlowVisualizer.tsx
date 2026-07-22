/**
 * DataFlowVisualizer page — uses the shared component with the page-specific
 * node/edge layout (Render Queue + Browser Manager topology).
 */
import React from 'react';
import { Cpu, Zap, Activity, MessageCircle, Send, Globe, Server, Database } from 'lucide-react';
import DFVComponent, { type DataFlowVisualizerProps } from '../components/DataFlowVisualizer';

// ── Page-specific topology ─────────────────────────────────────────────────

const NODE_LAYOUT: DataFlowVisualizerProps['nodeLayout'] = [
  { id: 'frontend',   label: 'Frontend',         icon: Globe,         x: 50,  y: 4  },
  { id: 'gemini',     label: 'Gemini AI',        icon: Cpu,           x: 50,  y: 16 },
  { id: 'pipeline',   label: 'Pipeline',         icon: Zap,           x: 50,  y: 28 },
  { id: 'render',     label: 'Render Queue',     icon: Activity,      x: 82,  y: 28 },
  { id: 'command',    label: 'Command Executor', icon: MessageCircle, x: 15,  y: 42 },
  { id: 'scheduler',  label: 'Scheduler',        icon: Send,          x: 50,  y: 42 },
  { id: 'browser',    label: 'Browser Manager',  icon: Globe,         x: 82,  y: 42 },
  { id: 'connectors', label: 'Connectors',       icon: Server,        x: 50,  y: 56 },
  { id: 'supabase',   label: 'Supabase',         icon: Database,      x: 30,  y: 72 },
  { id: 'redis',      label: 'Redis',            icon: Database,      x: 70,  y: 72 },
  { id: 'socketio',   label: 'Socket.IO',        icon: Activity,      x: 50,  y: 86 },
  { id: 'facebook',   label: 'Facebook',         icon: Globe,         x: 15,  y: 56 },
];

const EDGE_LIST: DataFlowVisualizerProps['edgeList'] = [
  ['frontend',  'gemini'],
  ['frontend',  'scheduler'],
  ['frontend',  'supabase'],
  ['frontend',  'connectors'],
  ['frontend',  'command'],
  ['frontend',  'socketio'],
  ['gemini',    'pipeline'],
  ['pipeline',  'render'],
  ['pipeline',  'scheduler'],
  ['render',    'browser'],
  ['browser',   'connectors'],
  ['command',   'connectors'],
  ['scheduler', 'connectors'],
  ['facebook',  'connectors'],
  ['connectors','supabase'],
  ['connectors','redis'],
  ['connectors','socketio'],
  ['supabase',  'socketio'],
  ['redis',     'socketio'],
];

// ── Page wrapper ───────────────────────────────────────────────────────────

export default function DataFlowVisualizerPage() {
  return (
    <div className="p-4 md:p-6">
      <DFVComponent nodeLayout={NODE_LAYOUT} edgeList={EDGE_LIST} />
    </div>
  );
}
