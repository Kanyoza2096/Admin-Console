import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Search, Monitor, Terminal, Shield, Activity, Settings, Globe, GitBranch, BrainCircuit, Network, BarChart3 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

interface CommandItem {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  action: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { toggleTerminal } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    { id: '1',  icon: Monitor,      title: 'Open Main Console',    subtitle: 'Go to Dashboard',                         action: () => navigate('/') },
    { id: '2',  icon: Terminal,     title: 'Launch Terminal',       subtitle: 'Toggle Command Line Interface',           action: toggleTerminal },
    { id: '3',  icon: Globe,        title: 'Broadcast Network',     subtitle: 'Manage Social Posts',                     action: () => navigate('/posts') },
    { id: '4',  icon: BrainCircuit, title: 'AI Engine',             subtitle: 'Manage Persona & Prompts',                action: () => navigate('/ai-brain') },                     
    { id: '5',  icon: Shield,       title: 'Guardian Logs',         subtitle: 'Security and Threat Analysis',            action: () => navigate('/guardian') },
    { id: '6',  icon: GitBranch,    title: 'Workflows',             subtitle: 'Automation Task Pipelines',               action: () => navigate('/workflows') },
    { id: '7',  icon: Network,      title: 'Prometheus Metrics',    subtitle: 'Live Infrastructure Telemetry',           action: () => navigate('/prometheus') },
    { id: '8',  icon: Activity,     title: 'API Analytics',         subtitle: 'View Latency & Request Metrics',          action: () => navigate('/api') },
    { id: '9',  icon: BarChart3,    title: 'Payload Inspector',     subtitle: 'Inspect live API payload traffic',         action: () => navigate('/payloads') },
    { id: '10', icon: Settings,     title: 'System Settings',       subtitle: 'Configure Platform & Credentials',        action: () => navigate('/settings') },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) || 
    cmd.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        selected.action();
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-[90]"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-0 md:bottom-auto md:top-[20%] left-0 md:left-1/2 md:-translate-x-1/2 w-full md:max-w-2xl bg-brand-surface md:bg-[#0A0E17] border-t md:border border-brand-border md:border-brand-primary/30 rounded-t-2xl md:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] md:shadow-[0_0_50px_rgba(79,70,229,0.15)] overflow-hidden z-[100] pb-[env(safe-area-inset-bottom)]"
          >
            {/* Drag Handle for Mobile */}
            <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-12 h-1.5 bg-brand-border rounded-full" />
            </div>

            <div className="flex items-center px-4 border-b border-brand-border md:pt-0 pt-2">
              <Search className="w-5 h-5 text-brand-text-muted mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent border-none py-5 outline-none text-brand-text placeholder-brand-text-muted font-mono"
              />
              <span className="text-[10px] font-mono text-brand-text-muted bg-brand-surface px-2 py-1 rounded border border-brand-border">ESC</span>
            </div>

            <div className="max-h-96 overflow-y-auto p-2 custom-scrollbar">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-brand-text-muted font-mono text-sm">
                  NO COMMANDS FOUND FOR "{query.toUpperCase()}"
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => (
                  <div
                    key={cmd.id}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => { cmd.action(); setIsOpen(false); }}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-xl cursor-pointer transition-colors",
                      selectedIndex === idx ? "bg-brand-primary/10 border-brand-primary/30 border text-brand-primary" : "border border-transparent text-brand-text hover:bg-brand-elevated"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg mr-4",
                      selectedIndex === idx ? "bg-brand-primary/20 text-brand-primary" : "bg-brand-elevated text-brand-text-muted"
                    )}>
                      <cmd.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold">{cmd.title}</h4>
                      <p className="text-xs text-brand-text-muted mt-0.5">{cmd.subtitle}</p>
                    </div>
                    {selectedIndex === idx && (
                      <span className="text-[10px] font-mono font-bold bg-brand-primary text-white px-2 py-1 rounded">ENTER</span>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="px-4 py-2 border-t border-brand-border bg-brand-surface text-[10px] font-mono text-brand-text-muted flex justify-between">
              <span><span className="text-brand-text font-bold">↑↓</span> to navigate</span>
              <span><span className="text-brand-text font-bold">Enter</span> to select</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
