import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Network, 
  Search, 
  Filter, 
  Server, 
  ArrowRightLeft, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Activity,
  Play
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore, PayloadLog } from '../store/useStore';

export default function PayloadInspector() {
  const { payloads, addPayload } = useStore();
  const [selectedReq, setSelectedReq] = useState<PayloadLog | null>(null);
  const [filter, setFilter] = useState('all'); // all, inbound, outbound, errors
  const [search, setSearch] = useState('');
  const [copiedReq, setCopiedReq] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);

  // Auto-select the first payload if none is selected
  useEffect(() => {
    if (payloads.length > 0 && !selectedReq) {
      setSelectedReq(payloads[0]);
    }
  }, [payloads, selectedReq]);

  // Keep selected request up to date if payloads change
  const currentReq = selectedReq 
    ? (payloads.find(p => p.id === selectedReq.id) || selectedReq)
    : (payloads[0] || null);

  // Filter payloads based on selected tab and search query
  const filteredPayloads = payloads.filter(p => {
    // 1. Tab Filter
    if (filter === 'errors' && p.status < 400) return false;
    if (filter === 'inbound' && p.type !== 'inbound') return false;
    if (filter === 'outbound' && p.type !== 'outbound') return false;

    // 2. Search Query
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchId = p.id.toLowerCase().includes(q);
      const matchEndpoint = p.endpoint.toLowerCase().includes(q);
      const matchMethod = p.method.toLowerCase().includes(q);
      const matchReq = JSON.stringify(p.request).toLowerCase().includes(q);
      const matchRes = JSON.stringify(p.response).toLowerCase().includes(q);
      return matchId || matchEndpoint || matchMethod || matchReq || matchRes;
    }

    return true;
  });

  // Copy to Clipboard Helpers
  const copyToClipboard = async (text: string, type: 'req' | 'res') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'req') {
        setCopiedReq(true);
        setTimeout(() => setCopiedReq(false), 2000);
      } else {
        setCopiedRes(true);
        setTimeout(() => setCopiedRes(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Simulate incoming webhook payloads for manual verification
  const handleSimulateWebhook = () => {
    const simulationTemplates = [
      {
        endpoint: '/api/v1/webhook/facebook',
        method: 'POST',
        type: 'inbound' as const,
        status: 200,
        latency: '34ms',
        request: {
          object: 'page',
          entry: [{
            id: '10493819203',
            time: Date.now(),
            messaging: [{
              sender: { id: '7483920193' },
              recipient: { id: '10493819203' },
              message: { text: 'Hello, how can I sign up for the premium plan?' }
            }]
          }]
        },
        response: {
          status: 'success',
          processed_at: new Date().toISOString()
        }
      },
      {
        endpoint: 'graph.facebook.com/v19.0/me/messages',
        method: 'POST',
        type: 'outbound' as const,
        status: 200,
        latency: '185ms',
        request: {
          messaging_type: 'RESPONSE',
          recipient: { id: '7483920193' },
          message: { text: 'You can sign up for the enterprise/premium plan directly inside Settings!' }
        },
        response: {
          recipient_id: '7483920193',
          message_id: `m_${Math.random().toString(36).substring(2, 15)}`
        }
      },
      {
        endpoint: 'generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        method: 'POST',
        type: 'outbound' as const,
        status: 200,
        latency: '0.9s',
        request: {
          contents: [{ role: 'user', parts: [{ text: 'Classify this message sentiment: "It does not work!"' }] }]
        },
        response: {
          candidates: [{
            content: { parts: [{ text: '{\n  "sentiment": "negative",\n  "urgency": "high"\n}' }] }
          }]
        }
      },
      {
        endpoint: '/api/v1/webhook/stripe',
        method: 'POST',
        type: 'inbound' as const,
        status: 201,
        latency: '56ms',
        request: {
          id: `evt_${Math.random().toString(36).substring(2, 10)}`,
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_live_abc123',
              amount_total: 4900,
              currency: 'usd',
              customer_details: { email: 'operator@kanyoza.com' }
            }
          }
        },
        response: {
          received: true
        }
      },
      {
        endpoint: '/api/v1/mwk-convert',
        method: 'GET',
        type: 'inbound' as const,
        status: 502,
        latency: '5.4s',
        request: {
          from: 'USD',
          to: 'MWK',
          amount: 150
        },
        response: {
          error: 'Bad Gateway',
          message: 'MWK rate provider service failed to respond in 5000ms.'
        }
      }
    ];

    const randomTemplate = simulationTemplates[Math.floor(Math.random() * simulationTemplates.length)];
    const simulatedLog: PayloadLog = {
      id: `sim_${Math.floor(Math.random() * 900000 + 100000)}`,
      time: new Date().toLocaleTimeString(),
      ...randomTemplate
    };

    addPayload(simulatedLog);
    setSelectedReq(simulatedLog);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto lg:h-[calc(100vh-10rem)] h-auto flex flex-col space-y-6"
    >
      {/* Header Section */}
      <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-brand-border pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center">
            <Network className="w-8 h-8 mr-3 text-brand-primary" />
            Live Payload Inspector
          </h1>
          <div className="flex items-center space-x-2 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-success"></span>
            </span>
            <p className="text-brand-text-muted text-xs font-mono uppercase tracking-wider">Listening for socket network traffic</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Simulation Trigger */}
          <button
            onClick={handleSimulateWebhook}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 rounded-xl text-brand-primary text-xs font-bold uppercase tracking-wider transition-all"
            title="Inject a live transaction payload to test real-time bindings"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Traffic</span>
          </button>

          {/* Tab Filters */}
          <div className="flex space-x-1 bg-brand-surface p-1 rounded-xl border border-brand-border">
            {['all', 'inbound', 'outbound', 'errors'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all",
                  filter === f 
                    ? "bg-brand-primary text-white shadow-md" 
                    : "text-brand-text-muted hover:text-brand-text"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:min-h-0 min-h-[600px]">
        
        {/* Left Column: Log Stream */}
        <div className="lg:col-span-1 bg-brand-surface border border-brand-border rounded-2xl flex flex-col overflow-hidden lg:h-full h-[500px]">
          {/* Search Header */}
          <div className="p-4 border-b border-brand-border flex items-center bg-brand-elevated/20">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-muted" />
              <input 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search endpoints, IDs, JSON..."
                className="w-full bg-brand-bg border border-brand-border rounded-xl pl-9 pr-4 py-2 text-sm text-brand-text placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-primary transition-colors font-mono"
              />
            </div>
          </div>
          
          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <AnimatePresence initial={false}>
              {filteredPayloads.map(req => (
                <motion.button
                  key={req.id}
                  layoutId={`req-card-${req.id}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedReq(req)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group flex flex-col justify-between",
                    currentReq?.id === req.id 
                      ? "bg-brand-elevated/80 border-brand-primary/50 shadow-lg" 
                      : "bg-brand-bg/60 border-brand-border hover:border-brand-primary/30 hover:bg-brand-elevated/40"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                      req.method === 'POST' ? "bg-brand-primary/10 text-brand-primary" : "bg-brand-accent/10 text-brand-accent"
                    )}>
                      {req.method}
                    </span>
                    <span className="text-[9px] font-mono text-brand-text-muted flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {req.time}
                    </span>
                  </div>
                  
                  <div className="font-mono text-xs text-brand-text truncate mb-3 group-hover:text-brand-primary transition-colors">
                    {req.endpoint}
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] font-mono border-t border-brand-border/40 pt-2">
                    <div className="flex items-center">
                      {req.status < 400 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-brand-success" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 mr-1 text-brand-danger" />
                      )}
                      <span className={req.status < 400 ? 'text-brand-success font-bold' : 'text-brand-danger font-bold'}>
                        {req.status}
                      </span>
                    </div>
                    <div className="flex items-center text-brand-text-muted">
                      <Zap className="w-3.5 h-3.5 mr-1 text-brand-accent" />
                      {req.latency}
                    </div>
                  </div>
                  
                  {currentReq?.id === req.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary" />
                  )}
                </motion.button>
              ))}
            </AnimatePresence>

            {filteredPayloads.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-brand-text-muted font-mono text-xs opacity-60">
                <Network className="w-8 h-8 mb-2 text-brand-border animate-pulse" />
                <span>NO CORRESPONDING PAYLOADS FOUND</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Inspection View */}
        <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-2xl flex flex-col overflow-hidden lg:h-full h-auto min-h-[500px]">
          {currentReq ? (
            <>
              {/* Inspection Header */}
              <div className="p-4 border-b border-brand-border flex flex-col sm:flex-row items-start sm:items-center justify-between bg-brand-elevated/40 gap-3">
                <div className="flex items-center space-x-3 min-w-0 w-full sm:w-auto">
                  <span className="text-xs font-mono font-bold text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-md border border-brand-primary/20 flex-shrink-0">
                    {currentReq.id}
                  </span>
                  <span className="text-sm font-mono text-brand-text truncate max-w-xs md:max-w-md" title={currentReq.endpoint}>
                    {currentReq.endpoint}
                  </span>
                </div>
                <div className="flex items-center space-x-3 ml-auto sm:ml-0">
                  <span className={cn(
                    "text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-md border",
                    currentReq.type === 'inbound' 
                      ? "bg-brand-success/10 text-brand-success border-brand-success/20" 
                      : "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                  )}>
                    {currentReq.type}
                  </span>
                  <ArrowRightLeft className="w-4 h-4 text-brand-text-muted" />
                </div>
              </div>
              
              {/* JSON Editor Layout */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Request Payload */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-brand-primary flex items-center">
                      <Server className="w-4 h-4 mr-2" /> Request Headers & Body
                    </h3>
                    <button 
                      onClick={() => copyToClipboard(JSON.stringify(currentReq.request, null, 2), 'req')}
                      className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider bg-brand-bg hover:bg-brand-elevated text-brand-text-muted hover:text-white px-2.5 py-1.5 rounded-lg border border-brand-border transition-all"
                    >
                      {copiedReq ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-brand-success" />
                          <span className="text-brand-success">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-brand-bg rounded-xl border border-brand-border p-5 overflow-x-auto relative shadow-inner">
                    <pre className="font-mono text-xs text-brand-text-secondary leading-relaxed select-all">
                      {JSON.stringify(currentReq.request, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Response Payload */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className={cn(
                      "text-xs font-bold uppercase tracking-widest flex items-center",
                      currentReq.status < 400 ? "text-brand-success" : "text-brand-danger"
                    )}>
                      {currentReq.status < 400 ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                      Response Object
                    </h3>
                    <button 
                      onClick={() => copyToClipboard(JSON.stringify(currentReq.response, null, 2), 'res')}
                      className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider bg-brand-bg hover:bg-brand-elevated text-brand-text-muted hover:text-white px-2.5 py-1.5 rounded-lg border border-brand-border transition-all"
                    >
                      {copiedRes ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-brand-success" />
                          <span className="text-brand-success">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-brand-bg rounded-xl border border-brand-border p-5 overflow-x-auto relative shadow-inner">
                    <pre className="font-mono text-xs text-brand-text-secondary leading-relaxed select-all">
                      {JSON.stringify(currentReq.response, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-brand-text-muted font-mono text-sm opacity-60">
              <Activity className="w-12 h-12 mb-3 text-brand-border animate-pulse" />
              <span>SELECT A SESSION REQUEST TO INSPECT PARAMETERS</span>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
