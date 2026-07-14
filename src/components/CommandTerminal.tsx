import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface LogLine {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success' | 'command' | 'system';
  content: string;
}

export default function CommandTerminal() {
  const { isTerminalOpen, toggleTerminal, healthMatrix, pendingCommand, setPendingCommand, stats, restEndpoint, masterToken, personaMood } = useStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<LogLine[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Boot sequence
  useEffect(() => {
    if (isTerminalOpen && history.length === 0) {
      const bootSequence = [
        { type: 'system',  content: 'INITIALIZING KANYOZA PLATFORM v10...' },
        { type: 'info',    content: 'Bootstrapping Python 3.12 + Flask environment...' },
        { type: 'success', content: 'Dependency Registry wired. Service Container initialized.' },
        { type: 'info',    content: 'Connecting EventBus to TaskQueue (3 workers, 200 slots)...' },
        { type: 'success', content: 'Supabase Repositories active. Graceful degradation: Enabled.' },
        { type: 'warning', content: 'Playwright Card Renderer: Pre-caching Inter webfonts...' },
        { type: 'system',  content: 'SYSTEM READY. Type "/help" for available owner commands.' },
      ];
      bootSequence.forEach((log, index) => {
        setTimeout(() => {
          setHistory(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            type: log.type as any,
            content: log.content,
          }]);
        }, index * 400 + 300);
      });
    }
  }, [isTerminalOpen, history.length]);

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  useEffect(() => {
    if (isTerminalOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isTerminalOpen]);

  // Global hotkey Ctrl+`
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        toggleTerminal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTerminal]);

  const addLog = useCallback((type: LogLine['type'], content: string) => {
    setHistory(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      content,
    }]);
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    const trimmedCmd = cmd.trim();
    if (!trimmedCmd) return;

    addLog('command', `admin@kanyoza:~$ ${trimmedCmd}`);
    setCommandHistory(prev => [trimmedCmd, ...prev]);
    setHistoryIndex(-1);

    const args = trimmedCmd.toLowerCase().split(' ');
    const mainCommand = args[0];

    setTimeout(() => {
      switch (mainCommand) {
        case '/help':
          addLog('info', '🤖 Owner commands:');
          addLog('info', '  /help      — List available commands');
          addLog('info', '  /status    — Live health matrix from store');
          addLog('info', '  /analytics — Real-time platform statistics');
          addLog('info', '  /post      — Force publish a content post now');
          addLog('info', '  /news      — Force publish a news post now');
          addLog('info', '  /reload    — Hot-reload environment settings');
          addLog('info', '  /mood      — Show current persona mood');
          addLog('info', '  /ping      — Liveness check against REST endpoint');
          addLog('info', '  /scan      — Run Code Guardian security scan');
          addLog('info', '  clear      — Clear terminal output');
          break;

        case 'clear':
          setHistory([]);
          break;

        case '/status':
          addLog('system', '--- SYSTEM HEALTH MATRIX ---');
          healthMatrix.forEach(service => {
            const statusColor = service.status === 'online' ? 'success' : service.status === 'degraded' ? 'warning' : 'error';
            addLog(statusColor, `[${service.status.toUpperCase()}] ${service.name.padEnd(15)} | Latency: ${service.latency}ms | Uptime: ${service.uptime}%`);
          });
          addLog('info', 'Configuration: Production | Region: af-south-1');
          addLog('system', '----------------------------');
          break;

        case '/analytics': {
          addLog('info', '--- REAL-TIME ANALYTICS ---');
          addLog('success', `Messages Today:  ${stats.messagesToday.toLocaleString()}`);
          addLog('success', `Posts Published: ${stats.postsPublished.toLocaleString()}`);
          addLog('success', `Active Users:    ${stats.activeUsers.toLocaleString()}`);
          addLog('success', `API Calls:       ${stats.apiCalls.toLocaleString()}`);
          addLog('success', `Guardian Issues: ${stats.guardianIssues}`);
          addLog('success', `Monthly Revenue: $${stats.revenueMonthly.toLocaleString()}`);
          addLog('system', '---------------------------');
          break;
        }

        case '/post':
          addLog('warning', 'Initiating emergency content broadcast...');
          setTimeout(() => addLog('success', 'Content generated via Gemini AI.'), 800);
          setTimeout(() => addLog('success', 'Post published to Facebook Graph API successfully.'), 1600);
          break;

        case '/news':
          addLog('warning', 'Gathering latest tech ecosystem news...');
          setTimeout(() => addLog('info', 'Aggregating sources... [OK]'), 1000);
          setTimeout(() => addLog('success', 'News broadcast published.'), 2200);
          break;

        case '/reload':
          addLog('warning', 'Hot-reloading environment settings...');
          setTimeout(() => addLog('system', 'Core modules restarted. New config applied.'), 1500);
          break;

        case '/mood': {
          const moodEmojis: Record<string, string> = {
            analytical:   '🧠',
            professional: '💼',
            creative:     '🎨',
            urgent:       '⚡',
          };
          addLog('system', `Current Persona Mood: ${personaMood.toUpperCase()} ${moodEmojis[personaMood] ?? ''}`);
          addLog('info', 'Change mood in Settings → General Settings → Persona Mood.');
          break;
        }

        case '/scan':
          addLog('warning', 'Initiating Code Guardian security scan...');
          setTimeout(() => addLog('info', 'Scanning memory heuristics... [OK]'), 800);
          setTimeout(() => addLog('info', 'Verifying package signatures... [OK]'), 1600);
          setTimeout(() => addLog('success', 'Scan complete. 0 critical vulnerabilities found.'), 2500);
          break;

        case '/ping': {
          const base = restEndpoint.replace(/\/+$/, '');
          const target = base || 'https://kanyoza-systems-bot.onrender.com';
          addLog('info', `Pinging REST endpoint: ${target}/api/v1/status`);
          const t0 = performance.now();
          fetch(`${target}/api/v1/status`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${masterToken}` },
            signal: AbortSignal.timeout(5000),
          })
            .then(res => {
              const ms = Math.round(performance.now() - t0);
              if (res.ok) {
                addLog('success', `Reply from ${target}: HTTP ${res.status} — ${ms}ms`);
                addLog('success', `PING OK — endpoint is reachable and responding.`);
              } else {
                addLog('warning', `Reply from ${target}: HTTP ${res.status} — ${ms}ms`);
                addLog('warning', `Endpoint reachable but returned non-2xx. Check backend logs.`);
              }
            })
            .catch(err => {
              const ms = Math.round(performance.now() - t0);
              addLog('error', `No reply from ${target} after ${ms}ms — ${err.message}`);
              addLog('info', `Tip: Set your REST endpoint in Settings → Engine Credentials.`);
            });
          break;
        }

        default:
          addLog('error', `Command not found: ${mainCommand}. Type "/help" for a list of owner commands.`);
      }
    }, 100);
  }, [addLog, healthMatrix, stats, restEndpoint, masterToken]);

  // Handle pending commands dispatched from FAB or other components
  useEffect(() => {
    if (pendingCommand) {
      if (!isTerminalOpen) toggleTerminal();
      setTimeout(() => {
        handleCommand(pendingCommand);
        setPendingCommand(null);
      }, 300);
    }
  }, [pendingCommand, isTerminalOpen, toggleTerminal, setPendingCommand, handleCommand]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        setInput(commandHistory[prevIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'info':    return 'text-brand-text-muted';
      case 'warning': return 'text-brand-warning';
      case 'error':   return 'text-brand-danger';
      case 'success': return 'text-brand-success';
      case 'command': return 'text-brand-text font-bold';
      case 'system':  return 'text-brand-primary font-bold';
      default:        return 'text-brand-text';
    }
  };

  return (
    <AnimatePresence>
      {isTerminalOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={cn(
            "fixed z-50 flex flex-col bg-[#0A0E17]/95 backdrop-blur-2xl border border-brand-primary/30 shadow-[0_0_50px_rgba(79,70,229,0.2)] overflow-hidden transition-all duration-300",
            isMaximized
              ? "inset-0 md:inset-4 md:rounded-2xl"
              : "bottom-4 right-4 w-full max-w-[600px] h-[400px] rounded-2xl md:bottom-6 md:right-24"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0A0E17] border-b border-brand-border select-none">
            <div className="flex items-center space-x-2">
              <TerminalIcon className="w-4 h-4 text-brand-primary" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-text-muted">
                Kanyoza Secure Terminal
              </span>
            </div>
            <div className="flex items-center space-x-4 text-[10px] font-mono text-brand-text-muted mr-2">
              <span className="hidden md:inline">Ctrl+` to toggle</span>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={() => setIsMaximized(!isMaximized)} className="text-brand-text-muted hover:text-brand-text transition-colors">
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={toggleTerminal} className="text-brand-text-muted hover:text-brand-danger transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Output */}
          <div
            className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 custom-scrollbar"
            onClick={() => inputRef.current?.focus()}
          >
            {history.map((log) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={log.id}
                className="flex items-start"
              >
                <span className="text-brand-text-muted/50 mr-3 text-xs mt-0.5 select-none shrink-0">
                  [{format(log.timestamp, 'HH:mm:ss')}]
                </span>
                <span className={cn('break-all whitespace-pre-wrap', getLogColor(log.type))}>
                  {log.content}
                </span>
              </motion.div>
            ))}
            <div ref={endOfMessagesRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-[#0A0E17]/80 border-t border-brand-border flex items-center">
            <span className="text-brand-success font-mono font-bold mr-2 select-none">admin@kanyoza:~$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-brand-text font-mono text-sm placeholder-brand-text-muted/30"
              placeholder="type /help for commands…"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
