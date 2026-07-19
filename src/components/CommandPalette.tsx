import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Monitor, Terminal, Shield, Activity, Settings, Globe, 
  GitBranch, BrainCircuit, Network, BarChart3, Zap, FileText, 
  MessageSquare, Users, Key, Bell, BookOpen, Calendar, Database,
  Command, CornerDownLeft, ArrowUp, ArrowDown
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

interface CommandItem {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  keywords: string[];
  action: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { toggleTerminal } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    { id: 'dashboard',    icon: Monitor,      title: 'Dashboard',          subtitle: 'Command Center overview',              keywords: ['home', 'stats', 'kpi'],                     action: () => navigate('/') },
    { id: 'terminal',     icon: Terminal,     title: 'Terminal',           subtitle: 'Toggle command line interface',        keywords: ['cli', 'console', 'shell'],                   action: toggleTerminal },
    { id: 'posts',        icon: FileText,     title: 'Content Studio',     subtitle: 'Manage social posts',                  keywords: ['publish', 'draft', 'schedule'],               action: () => navigate('/posts') },
    { id: 'ai-brain',     icon: BrainCircuit, title: 'AI Brain',           subtitle: 'Persona & model configuration',        keywords: ['gemini', 'prompt', 'temperature', 'model'],  action: () => navigate('/ai-brain') },
    { id: 'ai-chat',      icon: MessageSquare,title: 'AI Chat',            subtitle: 'Test AI conversations',                keywords: ['chatbot', 'assistant', 'conversation'],      action: () => navigate('/ai-chat') },
    { id: 'workflows',    icon: GitBranch,    title: 'Workflows',          subtitle: 'Automation pipelines',                 keywords: ['automation', 'pipeline', 'trigger'],         action: () => navigate('/workflows') },
    { id: 'guardian',     icon: Shield,       title: 'Guardian',           subtitle: 'Security & threat analysis',           keywords: ['security', 'scan', 'vulnerability'],        action: () => navigate('/guardian') },
    { id: 'analytics',    icon: BarChart3,    title: 'Analytics',          subtitle: 'Performance intelligence',             keywords: ['charts', 'reports', 'engagement'],          action: () => navigate('/analytics') },
    { id: 'metrics',      icon: Activity,     title: 'Prometheus Metrics', subtitle: 'Infrastructure telemetry',            keywords: ['latency', 'cpu', 'memory', 'grafana'],      action: () => navigate('/prometheus') },
    { id: 'api',          icon: Key,          title: 'API Manager',        subtitle: 'Generate & manage API keys',           keywords: ['tokens', 'keys', 'access'],                 action: () => navigate('/api-manager') },
    { id: 'users',        icon: Users,        title: 'Users',              subtitle: 'User management',                      keywords: ['members', 'accounts', 'team'],              action: () => navigate('/users') },
    { id: 'knowledge',    icon: BookOpen,     title: 'Knowledge Base',     subtitle: 'RAG document sources',                 keywords: ['documents', 'kb', 'search'],                action: () => navigate('/knowledge-base') },
    { id: 'scheduler',    icon: Calendar,     title: 'Scheduler',          subtitle: 'Content posting schedule',             keywords: ['timing', 'cron', 'hours'],                  action: () => navigate('/scheduler') },
    { id: 'integrations', icon: Globe,        title: 'Integrations',       subtitle: 'Connected platforms',                  keywords: ['facebook', 'twitter', 'linkedin'],          action: () => navigate('/integrations') },
    { id: 'settings',     icon: Settings,     title: 'Settings',           subtitle: 'Platform configuration',               keywords: ['config', 'connection', 'token'],            action: () => navigate('/settings') },
  ];

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 8); // Show top 8 when no query
    const q = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(q) ||
      cmd.subtitle.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.includes(q))
    );
  }, [query, commands]);

  // Auto-scroll selected into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      if (selected) selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filteredCommands[selectedIndex]?.action();
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
            onClick={() => setIsOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-brand-surface/95 backdrop-blur-xl border border-brand-border/60 rounded-2xl shadow-[0_0_60px_rgba(79,70,229,0.12)] overflow-hidden z-[100]">

            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-brand-border/30">
              <Search className="w-4 h-4 text-brand-text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, commands..."
                className="flex-1 bg-transparent text-sm text-white placeholder-brand-text-muted font-mono outline-none"
              />
              <kbd className="px-2 py-0.5 text-[10px] font-mono text-brand-text-muted bg-brand-elevated border border-brand-border/50 rounded-md flex-shrink-0">
                <Command className="w-3 h-3 inline mr-0.5" />K
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="py-10 text-center text-brand-text-muted font-mono text-xs">
                  No results for "{query}"
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={cmd.id}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => { cmd.action(); setIsOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group',
                      selectedIndex === idx
                        ? 'bg-brand-primary/10 border border-brand-primary/20'
                        : 'border border-transparent hover:bg-brand-elevated/50'
                    )}>
                    {/* Icon */}
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                      selectedIndex === idx ? 'bg-brand-primary/20 text-brand-primary' : 'bg-brand-elevated text-brand-text-muted group-hover:text-white'
                    )}>
                      <cmd.icon className="w-4 h-4" />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-bold', selectedIndex === idx ? 'text-brand-primary' : 'text-white')}>
                          {cmd.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-brand-text-muted font-mono truncate">{cmd.subtitle}</p>
                    </div>

                    {/* Shortcut hint */}
                    {selectedIndex === idx && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-white bg-brand-primary rounded">↵</kbd>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-brand-border/30 bg-brand-elevated/10 text-[9px] font-mono text-brand-text-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /><ArrowDown className="w-3 h-3" /> Navigate</span>
                <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" /> Select</span>
              </div>
              <span>{filteredCommands.length} results</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
