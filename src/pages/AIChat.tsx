import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  MessageSquare, Send, Bot, User, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Sparkles, Trash2, Copy, Terminal,
  ChevronDown, Zap, Shield, Wifi, WifiOff
} from 'lucide-react';
import { cn } from '../lib/utils';

const quickActions = [
  { icon: Zap, label: "System health", message: "What's the system health?" },
  { icon: Shield, label: "List workspaces", message: "Show all workspaces" },
  { icon: Sparkles, label: "Add member", message: "Add member John Doe phone 0888123456" },
  { icon: Terminal, label: "Get stats", message: "Show me today's stats" },
];

export default function AIChat() {
  const { restEndpoint, masterToken, socket } = useStore();
  const base = restEndpoint.replace(/\/+$/, '');

  const [messages, setMessages] = useState<{ 
    id: number; 
    role: 'user' | 'assistant' | 'error' | 'system'; 
    content: string;
    timestamp: number;
    commandResult?: any;
  }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auth headers
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (masterToken) {
    headers['Authorization'] = `Bearer ${masterToken}`;
  }

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Connection monitoring
  useEffect(() => {
    if (!socket) return;
    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: 'Hello! I\'m the Kanyoza AI. I can manage your platform, execute commands, and help with church management. Try typing a command or select a quick action below.',
        timestamp: Date.now(),
      }]);
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = { 
      id: Date.now(), 
      role: 'user' as const, 
      content: input.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);
    setShowQuickActions(false);

    try {
      if (!masterToken) {
        throw new Error('API token not configured. Go to Settings to set your master token.');
      }
      const res = await fetch(`${base}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMsg.content }),
      });

      const d = await res.json();

      if (!res.ok) {
        throw new Error(d.error || d.message || `Server error (HTTP ${res.status})`);
      }

      // Check for prompt injection block
      if (d.model === 'guard') {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'error',
          content: '⚠️ ' + d.reply,
          timestamp: Date.now(),
        }]);
        return;
      }

      // Check for failed command
      if (d.command_result && !d.command_result.ok) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'error',
          content: `❌ Command failed: ${d.command_result.message || d.command_result.error || 'Unknown error'}`,
          timestamp: Date.now(),
          commandResult: d.command_result,
        }]);
        return;
      }

      // Success
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: d.reply || d.response || d.command_result?.message || 'Command processed.',
        timestamp: Date.now(),
        commandResult: d.command_result,
      }]);

      setError(null);
    } catch (err: any) {
      const errorMsg = err.message || 'AI service unavailable. Please try again.';
      setError(errorMsg);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'error',
        content: `❌ ${errorMsg}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickAction = (message: string) => {
    setInput(message);
    inputRef.current?.focus();
    // Auto-send quick actions
    setTimeout(() => {
      setInput(message);
    }, 0);
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: 'Chat cleared. How can I help you?',
      timestamp: Date.now(),
    }]);
    setError(null);
    setShowQuickActions(true);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-brand-border flex justify-between items-center bg-brand-elevated/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30"
            animate={{ boxShadow: loading ? ['0 0 0px #6366f1', '0 0 20px #6366f140', '0 0 0px #6366f1'] : 'none' }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 text-brand-primary animate-spin" />
            ) : (
              <Bot className="w-5 h-5 text-brand-primary" />
            )}
          </motion.div>
          <div>
            <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
              AI Command Center
              {loading && (
                <span className="text-[10px] font-mono text-brand-primary animate-pulse">processing...</span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-brand-text-muted uppercase">
                {connectionStatus === 'connected' ? (
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-brand-success" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <WifiOff className="w-3 h-3 text-brand-danger" /> Disconnected
                  </span>
                )}
              </span>
              {!masterToken && (
                <span className="text-[10px] font-mono text-brand-danger animate-pulse">
                  ⚠️ No API token
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="p-2 rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-elevated transition-all"
            title="Toggle quick actions"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", showQuickActions ? "rotate-0" : "rotate-180")} />
          </button>
          <button
            onClick={clearChat}
            className="p-2 rounded-lg text-brand-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4" ref={scrollRef}>
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: 0, duration: 0.3 }}
              className={cn(
                "flex gap-3",
                msg.role === 'user' ? "ml-auto flex-row-reverse max-w-[80%] md:max-w-[65%]" : "max-w-[90%] md:max-w-[75%]"
              )}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                {msg.role === 'user' ? (
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-brand-elevated border border-brand-border flex items-center justify-center">
                    <User className="w-4 h-4 text-brand-text-muted" />
                  </div>
                ) : msg.role === 'error' ? (
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-brand-primary" />
                  </div>
                )}
              </div>

              {/* Message bubble */}
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed group relative",
                  msg.role === 'user' 
                    ? "bg-brand-primary text-white rounded-tr-sm" 
                    : msg.role === 'error'
                      ? "bg-red-500/10 border border-red-500/30 text-red-300 rounded-tl-sm"
                      : "bg-brand-elevated border border-brand-border text-brand-text rounded-tl-sm"
                )}>
                  {/* Copy button */}
                  {msg.role !== 'user' && (
                    <button
                      onClick={() => copyMessage(msg.content)}
                      className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-brand-text-muted hover:text-brand-text"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                  
                  <div className="whitespace-pre-wrap break-words pr-4">{msg.content}</div>
                  
                  {/* Command result details */}
                  {msg.commandResult && msg.commandResult.ok && msg.commandResult.data && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 pt-2 border-t border-brand-border/50"
                    >
                      <div className="text-[10px] font-mono text-brand-text-muted uppercase mb-1">Details</div>
                      <pre className="text-[10px] font-mono text-brand-primary/80 overflow-x-auto">
                        {JSON.stringify(msg.commandResult.data, null, 1)}
                      </pre>
                    </motion.div>
                  )}
                </div>
                
                {/* Timestamp */}
                <span className="text-[9px] font-mono text-brand-text-muted/50 mt-1 block px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 max-w-[85%]"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-brand-primary animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-brand-elevated border border-brand-border rounded-tl-sm">
              <div className="flex items-center gap-2">
                <span className="flex gap-1">
                  <motion.span className="w-1.5 h-1.5 rounded-full bg-brand-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                  <motion.span className="w-1.5 h-1.5 rounded-full bg-brand-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                  <motion.span className="w-1.5 h-1.5 rounded-full bg-brand-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                </span>
                <span className="text-xs text-brand-text-muted font-mono">AI thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mx-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-xs text-red-400 font-mono">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-2">
              <XCircle className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions */}
      <AnimatePresence>
        {showQuickActions && messages.length <= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2"
          >
            <div className="flex flex-wrap gap-2">
              {quickActions.map(action => (
                <button
                  key={action.label}
                  onClick={() => { setInput(action.message); inputRef.current?.focus(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-elevated border border-brand-border hover:border-brand-primary/50 hover:text-brand-primary text-[11px] font-mono text-brand-text-muted rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-4 border-t border-brand-border bg-brand-elevated/30">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleSend(); 
              } 
            }}
            placeholder={masterToken ? "Type a command or ask a question..." : "⚠️ Configure your API token in Settings first"}
            disabled={!masterToken}
            className="flex-1 bg-brand-surface border border-brand-border rounded-xl px-4 py-3 min-h-[48px] max-h-32 text-sm text-brand-text resize-none focus:outline-none focus:border-brand-primary disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-brand-text-muted/50"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim() || !masterToken}
            className="h-[48px] px-5 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-primary/20"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </button>
        </div>
        
        {/* Input hints */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-[9px] font-mono text-brand-text-muted/50">
            Press Enter to send • Shift+Enter for new line
          </span>
          <span className="text-[9px] font-mono text-brand-text-muted/50">
            {input.length > 0 ? `${input.length} chars` : 'Ready'}
          </span>
        </div>
      </div>
    </div>
  );
}

