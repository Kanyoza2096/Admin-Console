import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { fetchWorkspaces, type Workspace } from '../lib/api';
import {
  LayoutDashboard,
  FileText,
  Activity,
  ShieldAlert,
  Settings,
  LogOut,
  Bell,
  Zap,
  Menu,
  Terminal as TerminalIcon,
  X,
  BrainCircuit,
  Network,
  GitBranch,
  BarChart3,
  Keyboard,
  Database,
  BookOpen,
  Link,
  Puzzle,
  MessageSquare,
  Calendar,
  CheckSquare,
  Key,
  Users,
  FileClock,
  Store,
  Building2,
  Cpu,
  MessageCircle,
  Search,
  Sun,
  Moon,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  LayoutGrid,
  Bot,
  Palette,
  ToggleLeft,
} from 'lucide-react';
import { cn, vibrate } from '../lib/utils';
import CommandTerminal from './CommandTerminal';
import CommandPalette from './CommandPalette';
import LiveEventToast from './LiveEventToast';
import SystemDiagnostics from './SystemDiagnostics';
import { ConnectionOrb, ConnectionBadge } from './ConnectionOrb';
import { supabase } from '../lib/supabase';

const TENANTS = [
  'Kanyoza Systems',
  'TechHub Malawi',
  'Ministry of Education',
  'Blantyre Diocese',
  'HealthPlus Hospital',
];

const NAV_ITEMS = [
  // Observe
  { to: '/',                 icon: LayoutDashboard, label: 'Dashboard',      group: 'observe' },
  { to: '/data-flow',        icon: Network,         label: 'Data Flow',       group: 'observe' },
  { to: '/system-architecture', icon: LayoutGrid,     label: 'System Architecture', group: 'observe' },
  { to: '/prometheus',       icon: BarChart3,       label: 'Prometheus Metrics', group: 'observe' },
  { to: '/analytics',        icon: BarChart3,       label: 'Analytics',       group: 'observe' },
  { to: '/live-logs',        icon: TerminalIcon,    label: 'Live Logs',       group: 'observe' },
  
  // Investigate
  { to: '/incident-center',  icon: AlertTriangle,   label: 'Incident Center', group: 'investigate' },
  { to: '/audit-logs',       icon: FileClock,       label: 'Audit Logs',      group: 'investigate' },
  { to: '/security',         icon: ShieldAlert,     label: 'Security',        group: 'investigate' },
  
  // Operate
  { to: '/workflows',        icon: GitBranch,       label: 'Automation',      group: 'operate' },
  { to: '/workflow-runs',    icon: GitBranch,       label: 'Workflow Runs',   group: 'operate' },
  { to: '/scheduler',        icon: Calendar,        label: 'Scheduler',       group: 'operate' },
  { to: '/tasks',            icon: CheckSquare,     label: 'Tasks',           group: 'operate' },
  { to: '/api-manager',      icon: Key,             label: 'API Manager',     group: 'operate' },
  { to: '/posts',            icon: FileText,        label: 'Content Studio',  group: 'operate' },
  { to: '/messenger',        icon: MessageSquare,   label: 'Messenger',       group: 'operate' },
  
  // Configure
  { to: '/ai-brain',         icon: BrainCircuit,    label: 'AI Brain',        group: 'configure' },
  { to: '/knowledge-base',   icon: BookOpen,        label: 'Knowledge Base',  group: 'configure' },
  { to: '/integrations',     icon: Link,            label: 'Integrations',    group: 'configure' },
  { to: '/brands',           icon: Palette,         label: 'Brands',          group: 'configure' },
  { to: '/ai-profiles',      icon: Bot,             label: 'AI Profiles',     group: 'configure' },
  { to: '/social-accounts',  icon: Link,            label: 'Social Accounts', group: 'configure' },
  { to: '/mis',              icon: Database,        label: 'MIS Manager',     group: 'configure' },
  
  // Govern
  { to: '/users',            icon: Users,           label: 'Users',           group: 'govern' },
  { to: '/tenants',          icon: Building2,       label: 'Tenants',         group: 'govern' },
  { to: '/marketplace',      icon: Store,           label: 'Marketplace',     group: 'govern' },
  { to: '/features',         icon: ToggleLeft,      label: 'Feature Toggles', group: 'govern' },
  { to: '/monitoring',       icon: Cpu,             label: 'Monitoring',      group: 'govern' },
  { to: '/ai-chat',          icon: MessageCircle,   label: 'AI Chat',         group: 'govern' },
  { to: '/settings',         icon: Settings,        label: 'Settings',        group: 'govern' },
];

const NAV_GROUPS = [
  { key: 'observe',     label: 'Observe' },
  { key: 'investigate', label: 'Investigate' },
  { key: 'operate',     label: 'Operate' },
  { key: 'configure',   label: 'Configure' },
  { key: 'govern',      label: 'Govern' },
];

const MOOD_META: Record<string, { label: string; color: string; dot: string }> = {
  analytical:   { label: 'Analytical',   color: 'bg-brand-accent/10 text-brand-accent border-brand-accent/30',     dot: 'bg-brand-accent' },
  professional: { label: 'Professional', color: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30', dot: 'bg-brand-primary' },
  creative:     { label: 'Creative',     color: 'bg-brand-warning/10 text-brand-warning border-brand-warning/30', dot: 'bg-brand-warning' },
  urgent:       { label: 'Urgent',       color: 'bg-brand-danger/10 text-brand-danger border-brand-danger/30',    dot: 'bg-brand-danger' },
};

export default function Layout() {
  const {
    logout, socketConnected, connectSocket, disconnectSocket,
    guardianAlerts, toggleTerminal, setPendingCommand, fetchInitialData, isUsingLiveBackendData,
    personaMood, restEndpoint, masterToken, latencyHistory, pushLatency,
    startRealtimeSubscriptions, stopRealtimeSubscriptions,
    socketError, socketReconnectAttempts, socketTransport,
    theme, toggleTheme, currentTenant, setCurrentTenant,
    selectedWorkspaceId, setSelectedWorkspaceId,
    stats, healthMatrix,
  } = useStore();

  const [isMobileMenuOpen,    setIsMobileMenuOpen]    = useState(false);
  const [isFabOpen,           setIsFabOpen]           = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminMenuOpen,     setIsAdminMenuOpen]     = useState(false);
  const [isTenantOpen,        setIsTenantOpen]        = useState(false);
  const [isWorkspaceOpen,     setIsWorkspaceOpen]     = useState(false);
  const [isSearchOpen,        setIsSearchOpen]        = useState(false);
  const [searchQuery,         setSearchQuery]         = useState('');
  const [clockTime,           setClockTime]           = useState(() => new Date().toISOString().replace('T', ' ').substring(0, 19));
  const [hidden,              setHidden]              = useState(false);
  const lastScrollY = React.useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Apply theme to root element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  // Live UTC clock
  useEffect(() => {
    const tick = () => setClockTime(new Date().toISOString().replace('T', ' ').substring(0, 19));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    connectSocket();
    fetchInitialData();
    startRealtimeSubscriptions();
    return () => { disconnectSocket(); stopRealtimeSubscriptions(); };
  }, [connectSocket, disconnectSocket, fetchInitialData, startRealtimeSubscriptions, stopRealtimeSubscriptions]);

  // Scroll-based auto-hide for mobile bottom nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Periodic RTT measurement
  useEffect(() => {
    if (!socketConnected) return;
    const measure = async () => {
      const url = restEndpoint
        ? `${restEndpoint.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')}/api/v1/status`
        : null;
      if (!url) return;
      const t0 = performance.now();
      try {
        const headers: Record<string, string> = {};
        if (masterToken) headers['Authorization'] = `Bearer ${masterToken}`;
        const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(4000) });
        if (res.ok) pushLatency(Math.round(performance.now() - t0));
      } catch { /* ignore */ }
    };
    measure();
    const id = setInterval(measure, 30_000);
    return () => clearInterval(id);
  }, [socketConnected, restEndpoint, masterToken, pushLatency]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setIsSearchOpen(v => !v); }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); toggleTerminal(); }
      if (e.key === 'Escape') { setIsSearchOpen(false); setIsNotificationsOpen(false); setIsAdminMenuOpen(false); setIsTenantOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleTerminal]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/');
  };

  const handleFabCommand = (cmd: string, path?: string) => {
    setPendingCommand(cmd);
    if (!useStore.getState().isTerminalOpen) toggleTerminal();
    if (path) navigate(path);
  };

  const { data: workspacesData } = useQuery({
    queryKey: ['workspaces', restEndpoint],
    queryFn: () => fetchWorkspaces({ restEndpoint, masterToken }),
    retry: 1,
    staleTime: 60_000,
  });
  const workspaces: Workspace[] = workspacesData?.workspaces ?? [];
  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0) setSelectedWorkspaceId(workspaces[0].id);
  }, [workspaces, selectedWorkspaceId, setSelectedWorkspaceId]);
  const activeWorkspace = workspaces.find(w => String(w.id) === String(selectedWorkspaceId));

  const unreadAlerts = guardianAlerts.filter(a => a.severity === 'CRITICAL').length;
  const criticalHealth = healthMatrix.filter(h => h.status === 'offline').length;
  const degradedHealth = healthMatrix.filter(h => h.status === 'degraded').length;

  const currentPage = NAV_ITEMS.find(item =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  );

  // Search filter
  const searchResults = searchQuery.length > 1
    ? NAV_ITEMS.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-brand-text overflow-hidden">

      {/* ── TOP NAVIGATION BAR ── */}
      <header className="h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] flex-shrink-0 flex items-center justify-between px-4 bg-brand-surface border-b border-brand-border z-50 gap-4">

        {/* Left: Logo + Mobile Menu */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shadow-glow-primary">
                <Zap className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none tracking-wide">Kanyoza AI</p>
              <p className="text-[10px] text-brand-text-muted font-mono leading-none mt-0.5">Enterprise Platform</p>
            </div>
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-xl relative hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
            <input
              type="text"
              placeholder="Search pages, commands... (Ctrl+K)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => setTimeout(() => setIsSearchOpen(false), 150)}
              className="w-full pl-9 pr-4 py-2 bg-brand-elevated border border-brand-border rounded-lg text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-primary transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono bg-brand-bg border border-brand-border rounded text-brand-text-muted">
              Ctrl+K
            </kbd>
          </div>
          <AnimatePresence>
            {isSearchOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute top-full left-0 right-0 mt-1 bg-brand-surface border border-brand-border rounded-xl shadow-2xl overflow-hidden z-50"
              >
                {searchResults.map(item => (
                  <button
                    key={item.to}
                    onMouseDown={() => { navigate(item.to); setSearchQuery(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-elevated text-left transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-brand-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Status indicators + controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="hidden xl:flex items-center gap-2 mr-2 text-xs font-mono">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold',
              socketConnected
                ? 'bg-brand-success/10 text-brand-success border-brand-success/20'
                : 'bg-brand-danger/10 text-brand-danger border-brand-danger/20'
            )}>
              {socketConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {socketConnected ? 'Online' : 'Offline'}
            </div>
            {criticalHealth > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-brand-danger/10 text-brand-danger border-brand-danger/20 text-[11px] font-semibold">
                <AlertTriangle className="w-3 h-3" />
                {criticalHealth} Critical
              </div>
            )}
            {criticalHealth === 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-brand-success/10 text-brand-success border-brand-success/20 text-[11px] font-semibold">
                <CheckCircle className="w-3 h-3" />
                All Systems OK
              </div>
            )}
          </div>
          <div className={cn(
            'hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold mr-1',
            MOOD_META[personaMood]?.color
          )}>
            <Bot className="w-3 h-3" />
            <span>{MOOD_META[personaMood]?.label}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-brand-elevated transition-colors text-brand-text-muted hover:text-brand-text"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="relative">
            <button
              onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsAdminMenuOpen(false); setIsTenantOpen(false); }}
              className="p-2 rounded-lg hover:bg-brand-elevated transition-colors relative"
            >
              <Bell className="w-4 h-4 text-brand-text-muted hover:text-brand-text transition-colors" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-brand-danger rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-glow-danger">
                  {unreadAlerts}
                </span>
              )}
            </button>
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-brand-border flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Notifications</h3>
                      <p className="text-[11px] text-brand-text-muted mt-0.5">{guardianAlerts.length} total alerts</p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full',
                      unreadAlerts > 0 ? 'bg-brand-danger/20 text-brand-danger' : 'bg-brand-success/20 text-brand-success'
                    )}>
                      {unreadAlerts > 0 ? `${unreadAlerts} Critical` : 'Clear'}
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {guardianAlerts.length === 0 ? (
                      <div className="py-8 text-center text-sm text-brand-text-muted">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-brand-success opacity-50" />
                        No active alerts
                      </div>
                    ) : guardianAlerts.slice(0, 8).map(alert => (
                      <button
                        key={alert.id}
                        onClick={() => { navigate('/guardian'); setIsNotificationsOpen(false); }}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-brand-elevated transition-colors border-b border-brand-border/50 last:border-0 text-left"
                      >
                        <div className={cn(
                          'mt-0.5 w-2 h-2 rounded-full flex-shrink-0',
                          alert.severity === 'CRITICAL' ? 'bg-brand-danger' : alert.severity === 'HIGH' ? 'bg-brand-warning' : 'bg-brand-accent'
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{alert.title}</p>
                          <p className="text-[10px] text-brand-text-muted mt-0.5">{alert.severity} · {new Date(alert.time).toLocaleTimeString()}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-3 border-t border-brand-border">
                    <button
                      onClick={() => { navigate('/security'); setIsNotificationsOpen(false); }}
                      className="w-full py-2 text-xs font-semibold text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                    >
                      View all in Security Center
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative hidden lg:block">
            <button
              onClick={() => { setIsWorkspaceOpen(!isWorkspaceOpen); setIsAdminMenuOpen(false); setIsNotificationsOpen(false); setIsTenantOpen(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-brand-elevated border border-brand-border text-xs font-medium transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-brand-primary" />
              <span className="max-w-28 truncate">{activeWorkspace?.name || (workspaces.length === 0 ? 'No workspaces' : 'Select workspace')}</span>
              <ChevronDown className="w-3 h-3 text-brand-text-muted" />
            </button>
            <AnimatePresence>
              {isWorkspaceOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-56 bg-brand-surface border border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-brand-border">
                    <p className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">Active Workspace</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {workspaces.length === 0 && (
                      <p className="px-3 py-4 text-xs text-brand-text-muted font-mono">No workspaces yet.</p>
                    )}
                    {workspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => { setSelectedWorkspaceId(ws.id); setIsWorkspaceOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-brand-elevated transition-colors text-left',
                          String(selectedWorkspaceId) === String(ws.id) && 'bg-brand-primary/10 text-brand-primary'
                        )}
                      >
                        <div className="w-6 h-6 rounded-md bg-brand-primary/20 text-brand-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {ws.name[0]?.toUpperCase()}
                        </div>
                        <span className="truncate font-medium">{ws.name}</span>
                        {String(selectedWorkspaceId) === String(ws.id) && <CheckCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative hidden md:block">
            <button
              onClick={() => { setIsTenantOpen(!isTenantOpen); setIsAdminMenuOpen(false); setIsNotificationsOpen(false); setIsWorkspaceOpen(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-brand-elevated border border-brand-border text-xs font-medium transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-brand-text-muted" />
              <span className="max-w-24 truncate">{activeWorkspace?.name || currentTenant}</span>
              <ChevronDown className="w-3 h-3 text-brand-text-muted" />
            </button>
            <AnimatePresence>
              {isTenantOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-brand-surface border border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-brand-border">
                    <p className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">Switch Workspace</p>
                  </div>
                  {workspaces.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-brand-text-muted font-mono">No workspaces yet.</p>
                  ) : (
                    workspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => { 
                          setCurrentTenant(ws.name); 
                          setSelectedWorkspaceId(ws.id); 
                          setIsTenantOpen(false); 
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-brand-elevated transition-colors text-left',
                          String(selectedWorkspaceId) === String(ws.id) && 'bg-brand-primary/10 text-brand-primary'
                        )}
                      >
                        <div className="w-6 h-6 rounded-md bg-brand-primary/20 text-brand-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {ws.name[0]?.toUpperCase()}
                        </div>
                        <span className="truncate font-medium">{ws.name}</span>
                        {String(selectedWorkspaceId) === String(ws.id) && <CheckCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                      </button>
                    ))
                  )}
                  <div className="p-1.5 border-t border-brand-border">
                    <button
                      onClick={() => { navigate('/tenants'); setIsTenantOpen(false); }}
                      className="w-full py-2 text-xs font-semibold text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                    >
                      Manage Workspaces
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative border-l border-brand-border ml-1 pl-2">
            <button
              onClick={() => { setIsAdminMenuOpen(!isAdminMenuOpen); setIsNotificationsOpen(false); setIsTenantOpen(false); }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-brand-elevated transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                A
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold leading-none">Admin</p>
                <p className="text-[10px] text-brand-text-muted leading-none mt-0.5">Level 5</p>
              </div>
              <ChevronDown className="w-3 h-3 text-brand-text-muted hidden sm:block" />
            </button>
            <AnimatePresence>
              {isAdminMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-brand-surface border border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-brand-border">
                    <p className="text-sm font-bold">Administrator</p>
                    <p className="text-xs text-brand-text-muted">Level 5 Clearance</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <button onClick={() => { navigate('/settings'); setIsAdminMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-brand-elevated transition-colors">
                      <Settings className="w-4 h-4 text-brand-text-muted" /> Settings
                    </button>
                    <button onClick={() => { toggleTerminal(); setIsAdminMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-brand-elevated transition-colors">
                      <TerminalIcon className="w-4 h-4 text-brand-accent" /> Terminal
                    </button>
                    <button onClick={() => { navigate('/users'); setIsAdminMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-brand-elevated transition-colors">
                      <Users className="w-4 h-4 text-brand-text-muted" /> Manage Users
                    </button>
                  </div>
                  <div className="p-1.5 border-t border-brand-border">
                    <button
                      onClick={() => { handleLogout(); setIsAdminMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-brand-danger/10 text-brand-danger transition-colors font-semibold"
                    >
                      <LogOut className="w-4 h-4" /> Terminate Session
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── BODY (Sidebar + Content) ── */}
      <div className="flex flex-1 overflow-hidden">
        <nav className={cn(
          'fixed lg:relative top-14 lg:top-0 left-0 h-[calc(100vh-3.5rem)] lg:h-full w-64 bg-brand-surface border-r border-brand-border z-40',
          'flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
            <span className="text-[11px] font-mono text-brand-text-muted tabular-nums">{clockTime} UTC</span>
            <ConnectionBadge
              socketConnected={socketConnected}
              isUsingLiveBackendData={isUsingLiveBackendData}
              socketError={socketError}
              socketReconnectAttempts={socketReconnectAttempts}
              socketTransport={socketTransport}
            />
          </div>
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
            {NAV_GROUPS.map(group => {
              const items = NAV_ITEMS.filter(i => i.group === group.key);
              return (
                <div key={group.key}>
                  <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">{group.label}</p>
                  <div className="space-y-0.5">
                    {items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium group',
                          isActive
                            ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                            : 'text-brand-text-muted hover:bg-brand-elevated hover:text-brand-text'
                        )}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0 group-[.active]:text-brand-primary" />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-brand-border space-y-2">
            <div className="flex items-center justify-center py-2">
              <ConnectionOrb
                socketConnected={socketConnected}
                isUsingLiveBackendData={isUsingLiveBackendData}
                latencyHistory={latencyHistory}
                socketError={socketError}
                socketReconnectAttempts={socketReconnectAttempts}
              />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium text-brand-text-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>
        <main className="flex-1 flex flex-col overflow-hidden">
          <SystemDiagnostics />
          <div className="h-10 flex-shrink-0 flex items-center px-6 bg-brand-bg/50 border-b border-brand-border/50 gap-3">
            <LayoutGrid className="w-3.5 h-3.5 text-brand-text-muted" />
            <span className="text-xs text-brand-text-muted">/</span>
            <span className="text-xs font-semibold text-brand-text">{currentPage?.label || 'Dashboard'}</span>
          </div>
          <div className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-bg p-4 md:p-6 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV — Auto-hide on scroll ── */}
      <motion.div
        className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-brand-surface border-t border-brand-border z-50 flex items-center justify-around px-2"
        animate={{ y: hidden ? '100%' : '0%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {[
          { to: '/',          icon: LayoutDashboard, label: 'Home' },
          { to: '/ai-brain',  icon: BrainCircuit,    label: 'AI' },
          { to: '/workflows', icon: GitBranch,       label: 'Flows' },
          { to: '/analytics', icon: BarChart3,       label: 'Analytics' },
          { to: '/settings',  icon: Settings,        label: 'Settings' },
        ].map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => vibrate(10)}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all',
              isActive ? 'text-brand-primary' : 'text-brand-text-muted'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-semibold">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => { vibrate(10); setIsMobileMenuOpen(!isMobileMenuOpen); }}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-brand-text-muted"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-semibold">More</span>
        </button>
      </motion.div>

      {/* ── MOBILE OVERLAY ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── FAB ── */}
      <div className="fixed bottom-20 lg:bottom-6 right-6 z-50">
        <AnimatePresence>
          {isFabOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-16 right-0 mb-2 flex flex-col items-end gap-2"
            >
              {[
                { label: 'Terminal',       icon: TerminalIcon, color: 'bg-brand-elevated border border-brand-border', onClick: toggleTerminal },
                { label: 'Force Post',     icon: Zap,          color: 'bg-brand-primary',  onClick: () => handleFabCommand('/post', '/posts') },
                { label: 'Security Scan',  icon: ShieldAlert,  color: 'bg-brand-danger',   onClick: () => handleFabCommand('/scan', '/security') },
                { label: 'Health Check',   icon: Activity,     color: 'bg-brand-accent',   onClick: () => handleFabCommand('/ping') },
              ].map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { action.onClick(); setIsFabOpen(false); }}
                  className="flex items-center gap-3 group"
                >
                  <span className="px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    {action.label}
                  </span>
                  <div className={cn('w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg', action.color)}>
                    <action.icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-glow-primary hover:scale-105 active:scale-95 transition-all"
        >
          <motion.div animate={{ rotate: isFabOpen ? 45 : 0 }}>
            <Zap className="w-5 h-5" />
          </motion.div>
        </button>
      </div>

      <CommandPalette />
      <CommandTerminal />
      <LiveEventToast />
    </div>
  );
}
