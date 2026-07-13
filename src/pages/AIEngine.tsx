import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  BrainCircuit, SlidersHorizontal, Activity, Zap, MessageSquareText, 
  Wifi, Cpu, HardDrive, List, LayoutDashboard, Search, Settings2,
  Clock, Share2, Play
} from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchStatus, chatWithAI } from '../lib/api';

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary" />;

export default function AIEngine() {
  const { restEndpoint, masterToken, payloads, messages, healthMatrix } = useStore();
  const cfg = { restEndpoint, masterToken };

  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'ai'; text: string; tokens?: number; latency?: number }[]>([]);
  const [activePrompt, setActivePrompt] = useState<any>(null);

  // Fetch backend status
  const { data: statusData } = useQuery({
    queryKey: ['backend-status', restEndpoint],
    queryFn:  () => fetchStatus(cfg),
    retry: 1,
    staleTime: 60_000,
  });

  const chatMut = useMutation({
    mutationFn: (msg: string) => chatWithAI(cfg, msg),
    onSuccess: (d: any) => {
      const reply = d?.response || d?.reply || 'No response received.';
      setChatLog(prev => [...prev, { role: 'ai', text: reply }]);
    },
    onError: (err: any) => {
      setChatLog(prev => [...prev, { role: 'ai', text: `⚠ ${err?.message || 'Chat request failed.'}` }]);
    },
  });

  const handleSendChat = () => {
    const msg = chatInput.trim();
    if (!msg || chatMut.isPending) return;
    setChatLog(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    chatMut.mutate(msg);
  };

  const aiService = healthMatrix.find(h => h.id === 'gemini');
  const aiLatency = aiService?.latency || 0;
  const backendModel = statusData?.config?.gemini_model || 'gemini-1.5-pro';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col pb-20 md:pb-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center text-white">
            <BrainCircuit className="w-8 h-8 mr-3 text-brand-primary" />
            AI Engine
          </h1>
          <p className="text-brand-text-muted text-xs font-mono mt-1">ORCHESTRATION & INFERENCE CONTROL</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-brand-text-muted uppercase tracking-wider">Active Model</span>
            <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20">
              {backendModel}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-brand-text-muted uppercase tracking-wider">Provider Ping</span>
            <span className={cn("text-xs font-bold font-mono", aiLatency < 500 ? "text-brand-success" : "text-brand-warning")}>
              {aiLatency}ms
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Queue & Memory */}
        <div className="flex flex-col gap-6 overflow-hidden">
          {/* Context Memory */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl flex flex-col h-1/2 overflow-hidden shadow-xl">
            <div className="p-3 border-b border-brand-border bg-brand-elevated/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-3 h-3 text-brand-accent" /> Context Memory
              </span>
              <span className="text-[9px] font-mono bg-brand-elevated px-1.5 py-0.5 rounded">Context Window</span>
            </div>
            <div className="p-3 overflow-y-auto space-y-2 font-mono text-[10px]">
              <div className="p-2 bg-brand-elevated/40 border border-brand-border rounded">
                <div className="text-brand-text-muted mb-1">System Prompt Context</div>
                <div className="text-white truncate">You are an enterprise AI Orchestrator...</div>
              </div>
              <div className="p-2 bg-brand-elevated/40 border border-brand-border rounded">
                <div className="text-brand-text-muted mb-1">Active Model</div>
                <div className="text-brand-primary truncate">{statusData?.config?.gemini_model || '—'}</div>
              </div>
              <div className="p-4 text-center text-brand-text-muted opacity-60">
                No additional context fragments available.
              </div>
            </div>
          </div>

          {/* Prompt Queue */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl flex flex-col h-1/2 overflow-hidden shadow-xl">
            <div className="p-3 border-b border-brand-border bg-brand-elevated/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <List className="w-3 h-3 text-brand-warning" /> Inference Queue
              </span>
              <span className="text-[9px] font-mono bg-brand-warning/20 text-brand-warning px-1.5 py-0.5 rounded border border-brand-warning/30">
                {payloads.length} Pending
              </span>
            </div>
            <div className="p-0 overflow-y-auto font-mono text-[10px]">
              {payloads.length === 0 ? (
                <div className="p-4 text-center text-brand-text-muted">Queue empty</div>
              ) : (
                payloads.slice(0, 10).map((p, i) => (
                  <div 
                    key={p.id} 
                    className="p-3 border-b border-brand-border/50 hover:bg-brand-elevated/50 cursor-pointer transition-colors"
                    onClick={() => setActivePrompt(p)}
                  >
                    <div className="flex justify-between mb-1">
                      <span className="text-brand-accent uppercase tracking-wider">{p.method}</span>
                      <span className="text-brand-text-muted">{new Date(p.time).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-white truncate">{p.endpoint}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Inspector & Playground */}
        <div className="flex flex-col gap-6 overflow-hidden">
          {/* Inspector */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl flex flex-col h-1/3 overflow-hidden shadow-xl">
            <div className="p-3 border-b border-brand-border bg-brand-elevated/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Search className="w-3 h-3 text-brand-success" /> Prompt Inspector
              </span>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-[10px] bg-black/40 text-brand-success leading-relaxed">
              {activePrompt ? (
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(activePrompt.request || activePrompt, null, 2)}
                </pre>
              ) : (
                <span className="text-brand-text-muted">Select a prompt from the queue to inspect...</span>
              )}
            </div>
          </div>

          {/* Playground / Chat */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl flex flex-col flex-1 overflow-hidden shadow-xl">
            <div className="p-3 border-b border-brand-border bg-brand-elevated/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <MessageSquareText className="w-3 h-3 text-brand-primary" /> Live Test Console
              </span>
              {chatMut.isPending && <Activity className="w-3 h-3 text-brand-primary animate-pulse" />}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono">
              {chatLog.map((msg, i) => (
                <div key={i} className={cn("flex flex-col max-w-[85%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                  <div className={cn(
                    "p-3 rounded-xl text-xs",
                    msg.role === 'user' ? "bg-brand-primary/20 text-white border border-brand-primary/30" : "bg-brand-elevated text-brand-text border border-brand-border"
                  )}>
                    {msg.text}
                  </div>
                  {msg.role === 'ai' && (
                    <div className="flex gap-2 mt-1 text-[9px] text-brand-text-muted">
                      <span>{msg.tokens} tokens</span>
                      <span>{msg.latency}ms</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-brand-border bg-brand-bg">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                  placeholder="Test a prompt against the live engine..."
                  className="flex-1 bg-brand-elevated border border-brand-border rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-brand-primary transition-colors"
                />
                <button 
                  onClick={handleSendChat}
                  disabled={chatMut.isPending || !chatInput.trim()}
                  className="p-2.5 rounded-xl bg-brand-primary text-white hover:bg-brand-primary/80 disabled:opacity-50 transition-colors"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Controls & Observability */}
        <div className="flex flex-col gap-6 overflow-hidden">
          {/* Temperature & Params */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl flex flex-col overflow-hidden shadow-xl shrink-0">
            <div className="p-3 border-b border-brand-border bg-brand-elevated/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-3 h-3 text-brand-text" /> Engine Controls
              </span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-mono text-brand-text-muted mb-1.5 uppercase">
                  <span>Temperature</span><span>0.7</span>
                </div>
                <div className="h-1.5 bg-brand-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-brand-primary w-[70%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-mono text-brand-text-muted mb-1.5 uppercase">
                  <span>Top P</span><span>0.9</span>
                </div>
                <div className="h-1.5 bg-brand-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-brand-accent w-[90%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-mono text-brand-text-muted mb-1.5 uppercase">
                  <span>Provider Failover</span><span className="text-brand-success">Enabled</span>
                </div>
                <div className="text-[9px] font-mono text-brand-text-muted">Primary: Google Vertex AI</div>
                <div className="text-[9px] font-mono text-brand-text-muted">Fallback: Anthropic Claude</div>
              </div>
            </div>
          </div>

          {/* Token Usage & Telemetry */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl flex flex-col flex-1 overflow-hidden shadow-xl">
            <div className="p-3 border-b border-brand-border bg-brand-elevated/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3 h-3 text-brand-text" /> Token Telemetry
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-center gap-4">
              <div className="flex justify-between items-end border-b border-brand-border/50 pb-2">
                <div className="text-[10px] font-mono text-brand-text-muted uppercase">Chat Temp.</div>
                <div className="text-lg font-mono font-bold text-white">
                  {statusData ? '—' : '—'}
                </div>
              </div>
              <div className="flex justify-between items-end border-b border-brand-border/50 pb-2">
                <div className="text-[10px] font-mono text-brand-text-muted uppercase">Post Temp.</div>
                <div className="text-lg font-mono font-bold text-brand-primary">
                  {statusData ? '—' : '—'}
                </div>
              </div>

              {/* No historical token data available from backend */}
              <div className="mt-4 flex-1 flex flex-col items-center justify-center text-center text-brand-text-muted font-mono text-[10px] opacity-60 border border-dashed border-brand-border/40 rounded-xl p-4">
                <Activity className="w-5 h-5 mb-2 text-brand-border" />
                <span>No historical token data available</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
