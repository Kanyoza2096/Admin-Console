import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Home,
} from 'lucide-react';
import { cn, vibrate } from '../lib/utils';
import CommandTerminal from './CommandTerminal';
import CommandPalette from './CommandPalette';
import LiveEventToast from './LiveEventToast';
import SystemDiagnostics from './SystemDiagnostics';
import { ConnectionOrb, ConnectionBadge } from './ConnectionOrb';
import { supabase } from '../lib/supabase';

// ── Navigation ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/',                 icon: LayoutDashboard, label: 'Dashboard',      group: 'observe' },
  { to: '/data-flow',        icon: Network,         label: 'Data Flow',       group: 'observe' },
  { to: '/system-architecture', icon: LayoutGrid,     label: 'System Architecture', group: 'observe' },
  { to: '/prometheus',       icon: BarChart3,       label: 'Prometheus Metrics', group: 'observe' },
  { to: '/analytics',        icon: BarChart3,       label: 'Analytics',       group: 'observe' },
  { to: '/live-logs',        icon: TerminalIcon,    label: 'Live Logs',       group: 'observe' },
  { to: '/incident-center',  icon: AlertTriangle,   label: 'Incident Center', group: 'investigate' },
  { to: '/audit-logs',       icon: FileClock,       label: 'Audit Logs',      group: 'investigate' },
  { to: '/security',         icon: ShieldAlert,     label: 'Security',        group: 'investigate' },
  { to: '/workflows',        icon: GitBranch,       label: 'Automation',      group: 'operate' },
  { to: '/workflow-runs',    icon: GitBranch,       label: 'Workflow Runs',   group: 'operate' },
  { to: '/scheduler',        icon: Calendar,        label: 'Scheduler',       group: 'operate' },
  { to: '/tasks',            icon: CheckSquare,     label: 'Tasks',           group: 'operate' },
  { to: '/api-manager',      icon: Key,             label: 'API Manager',     group: 'operate' },
  { to: '/posts',            icon: FileText,        label: 'Content Studio',  group: 'operate' },
  { to: '/messenger',        icon: MessageSquare,   label: 'Messenger',       group: 'operate' },
  { to: '/ai-brain',         icon: BrainCircuit,    label: 'AI Brain',        group: 'configure' },
  { to: '/knowledge-base',   icon: BookOpen,        label: 'Knowledge Base',  group: 'configure' },
  { to: '/integrations',     icon: Link,            label: 'Integrations',    group: 'configure' },
  { to: '/brands',           icon: Palette,         label: 'Brands',          group: 'configure' },
  { to: '/ai-profiles',      icon: Bot,             label: 'AI Profiles',     group: 'configure' },
  { to: '/social-accounts',  icon: Link,            label: 'Social Accounts', group: 'configure' },
  { to: '/mis',              icon: Database,        label: 'MIS Manager',     group: 'configure' },
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

// ── Breadcrumb builder ─────────────────────────────────────────────────────

function useBreadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [{ label: 'Dashboard', to: '/' }];
  return [
    { label: 'Home', to: '/' },
    ...segments.map((seg, i) => {
      const item = NAV_ITEMS.find(n => n.to === '/' + segments.slice(0, i + 1).join('/'));
      return {
        label: item?.label || seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        to: '/' + segments.slice(0, i + 1).join('/'),
      };
    }),
  ];
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div className="relative group/tooltip">
      {children}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-xs font-medium text-brand-text shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none">
        {content}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export default function Layout() {
  const {
    logout, socketConnected, connectSocket, disconnectSocket,
    guardianAlerts, toggleTerminal, setPendingCommand, fetchInitialData, isUsingLiveBackendData,
    personaMood, restEndpoint, masterToken, latencyHistory, pushLatency,
    startRealtimeSubscriptions, stopRealtimeSubscriptions,
    socketError, socketReconnectAttempts, socketTransport,
    theme, toggleTheme,
    selectedWorkspaceId, setSelectedWorkspaceId,
    healthMatrix,
  } = useStore();

  const [isMobileMenuOpen,    setIsMobileMenuOpen]    = useState(false);
  const [isCollapsed,         setIsCollapsed]         = useState(false);
  const [isFabOpen,           setIsFabOpen]           = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminMenuOpen,     setIsAdminMenuOpen]     = useState(false);
  const [isWorkspaceOpen,     setIsWorkspaceOpen]     = useState(false);
  const [isSearchOpen,        setIsSearchOpen]        = useState(false);
  const [searchQuery,         setSearchQuery]         = useState('');
  const [clockTime,           setClockTime]           = useState(() => new Date().toISOString().replace('T', ' ').substring(0, 19));
  const [hidden,              setHidden]              = useState(false);
  const lastScrollY = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const breadcrumbs = useBreadcrumbs();

  // ── isSidebarExpanded: true on mobile when menu open, or on desktop when not collapsed ──
  const isSidebarExpanded = isMobileMenuOpen || !isCollapsed;

  // Collapse sidebar on smaller screens by default (only when menu is not open)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1280px)');
    if (!isMobileMenuOpen) setIsCollapsed(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      if (!isMobileMenuOpen) setIsCollapsed(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [isMobileMenuOpen]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
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
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) setHidden(true);
      else setHidden(false);
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); setIsCollapsed(v => !v); }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); toggleTerminal(); }
      if (e.key === 'Escape') { setIsSearchOpen(false); setIsNotificationsOpen(false); setIsAdminMenuOpen(false); }
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

  const searchResults = searchQuery.length > 1
    ? NAV_ITEMS.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-brand-text overflow-hidden">

      {/* ── TOP NAVIGATION BAR ── */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 bg-brand-surface/80 backdrop-blur-xl border-b border-brand-border/50 z-50 gap-4">

        {/* Left: Collapse + Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => { setIsMobileMenuOpen(!isMobileMenuOpen); vibrate(10); }}
            className="lg:hidden p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors"
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-glow-primary">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-brand-success rounded-full border-2 border-brand-surface" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="hidden sm:block overflow-hidden"
                >
                  <p className="text-sm font-bold leading-none tracking-wide whitespace-nowrap">Kanyoza AI</p>
                  <p className="text-[10px] text-brand-text-muted font-mono leading-none mt-0.5">Enterprise v11</p>
                </motion.div>
              )}
            </AnimatePresence>
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
              className="w-full pl-9 pr-12 py-2 bg-brand-elevated/50 border border-brand-border/50 rounded-lg text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono bg-brand-bg border border-brand-border rounded text-brand-text-muted">
              ⌘K
            </kbd>
          </div>
          <AnimatePresence>
            {isSearchOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1 bg-brand-surface/95 backdrop-blur-xl border border-brand-border rounded-xl shadow-2xl overflow-hidden z-50"
              >
                {searchResults.map((item, i) => (
                  <button
                    key={item.to}
                    onMouseDown={() => { navigate(item.to); setSearchQuery(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-elevated text-left transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <item.icon className="w-4 h-4 text-brand-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="ml-auto text-[10px] text-brand-text-muted font-mono">{item.to}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Status + Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* System status pill */}
          <div className="hidden xl:flex items-center gap-2 mr-2">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors',
              socketConnected
                ? 'bg-brand-success/10 text-brand-success border-brand-success/20'
                : 'bg-brand-danger/10 text-brand-danger border-brand-danger/20'
            )}>
              {socketConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {socketConnected ? 'Live' : 'Offline'}
            </div>
            {criticalHealth > 0 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-brand-danger/10 text-brand-danger border-brand-danger/20 text-[11px] font-semibold animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {criticalHealth}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-brand-success/10 text-brand-success border-brand-success/20 text-[11px] font-semibold">
                <CheckCircle className="w-3 h-3" />
                Operational
              </div>
            )}
          </div>

          {/* AI Mood */}
          <div className={cn(
            'hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold mr-1',
            MOOD_META[personaMood]?.color
          )}>
            <div className={cn('w-1.5 h-1.5 rounded-full', MOOD_META[personaMood]?.dot)} />
            <span>{MOOD_META[personaMood]?.label}</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-brand-elevated transition-colors text-brand-text-muted hover:text-brand-text"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsAdminMenuOpen(false); }}
              className="p-2 rounded-lg hover:bg-brand-elevated transition-colors relative"
            >
              <Bell className="w-4 h-4 text-brand-text-muted" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-danger rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-glow-danger">
                  {unreadAlerts > 9 ? '9+' : unreadAlerts}
                </span>
              )}
            </button>
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-80 bg-brand-surface/95 backdrop-blur-xl border border-brand-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-brand-border flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Notifications</h3>
                      <p className="text-[11px] text-brand-text-muted mt-0.5">{guardianAlerts.length} total</p>
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
                      View Security Center →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Workspace switcher */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-brand-elevated border border-brand-border/50 text-xs font-medium transition-colors"
            >
              <div className="w-4 h-4 rounded bg-brand-primary/20 text-brand-primary flex items-center justify-center text-[8px] font-bold">
                {activeWorkspace?.name?.[0] || 'K'}
              </div>
              <span className="max-w-24 truncate">{activeWorkspace?.name || 'Select'}</span>
              <ChevronDown className="w-3 h-3 text-brand-text-muted" />
            </button>
            <AnimatePresence>
              {isWorkspaceOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-56 bg-brand-surface/95 backdrop-blur-xl border border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-brand-border">
                    <p className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">Workspace</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
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

          {/* User menu */}
          <div className="relative border-l border-brand-border/50 ml-1 pl-2">
            <button
              onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-brand-elevated transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-brand-primary/20">
                A
              </div>
              <ChevronDown className="w-3 h-3 text-brand-text-muted hidden sm:block" />
            </button>
            <AnimatePresence>
              {isAdminMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-52 bg-brand-surface/95 backdrop-blur-xl border border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-brand-border">
                    <p className="text-sm font-bold">Administrator</p>
                    <p className="text-xs text-brand-text-muted">Level 5 Clearance</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {[
                      { to: '/settings', icon: Settings, label: 'Settings' },
                      { to: '/users', icon: Users, label: 'Manage Users' },
                    ].map(item => (
                      <button
                        key={item.to}
                        onClick={() => { navigate(item.to); setIsAdminMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-brand-elevated transition-colors"
                      >
                        <item.icon className="w-4 h-4 text-brand-text-muted" /> {item.label}
                      </button>
                    ))}
                    <button
                      onClick={() => { toggleTerminal(); setIsAdminMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-brand-elevated transition-colors"
                    >
                      <TerminalIcon className="w-4 h-4 text-brand-accent" /> Terminal
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
        
        {/* ── SIDEBAR ── */}
        <motion.nav
          animate={{ width: isMobileMenuOpen ? 256 : (isCollapsed ? 64 : 256) }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className={cn(
            'fixed lg:relative top-14 lg:top-0 left-0 h-[calc(100vh-3.5rem)] lg:h-full bg-brand-surface/80 backdrop-blur-xl border-r border-brand-border/50 z-40',
            'flex flex-col overflow-hidden',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Clock + Status */}
          <div className={cn(
            'px-3 py-3 border-b border-brand-border/50 flex items-center gap-2',
            isSidebarExpanded ? 'justify-between' : 'justify-center'
          )}>
            {isSidebarExpanded && (
              <span className="text-[11px] font-mono text-brand-text-muted tabular-nums whitespace-nowrap">
                {clockTime} UTC
              </span>
            )}
            <ConnectionBadge
              socketConnected={socketConnected}
              isUsingLiveBackendData={isUsingLiveBackendData}
              socketError={socketError}
              socketReconnectAttempts={socketReconnectAttempts}
              socketTransport={socketTransport}
            />
          </div>

          {/* Nav items */}
          <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
            {NAV_GROUPS.map(group => {
              const items = NAV_ITEMS.filter(i => i.group === group.key);
              return (
                <div key={group.key}>
                  {isSidebarExpanded && (
                    <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-text-muted">
                      {group.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {items.map(item => {
                      const link = (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === '/'}
                          onClick={() => { setIsMobileMenuOpen(false); vibrate(5); }}
                          className={({ isActive }) => cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium group relative',
                            isCollapsed && !isMobileMenuOpen && 'justify-center px-2',
                            isActive
                              ? 'bg-brand-primary/10 text-brand-primary'
                              : 'text-brand-text-muted hover:bg-brand-elevated hover:text-brand-text'
                          )}
                        >
                          {({ isActive }) => (
                            <>
                              <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-brand-primary')} />
                              {isSidebarExpanded && <span className="truncate">{item.label}</span>}
                              {isActive && (
                                <motion.div
                                  layoutId="activeNav"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-brand-primary rounded-r-full"
                                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                                />
                              )}
                            </>
                          )}
                        </NavLink>
                      );

                      if (!isSidebarExpanded) {
                        return (
                          <Tooltip key={item.to} content={item.label}>
                            {link}
                          </Tooltip>
                        );
                      }
                      return link;
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom section */}
          <div className="p-2 border-t border-brand-border/50 space-y-1">
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
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium text-brand-text-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors',
                !isSidebarExpanded && 'justify-center px-2'
              )}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {isSidebarExpanded && <span>Sign Out</span>}
            </button>
          </div>
        </motion.nav>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <SystemDiagnostics />

          {/* Breadcrumb */}
          <div className="h-9 flex-shrink-0 flex items-center px-4 bg-brand-bg/50 border-b border-brand-border/30 gap-1.5 overflow-x-auto">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.to}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-brand-text-muted flex-shrink-0" />}
                <button
                  onClick={() => navigate(crumb.to)}
                  className={cn(
                    'text-xs whitespace-nowrap transition-colors hover:text-brand-primary',
                    i === breadcrumbs.length - 1 ? 'font-semibold text-brand-text' : 'text-brand-text-muted'
                  )}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Page content */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-bg p-4 md:p-6 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <motion.div
        className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-brand-surface/90 backdrop-blur-xl border-t border-brand-border/50 z-50 flex items-center justify-around px-2"
        animate={{ y: hidden ? '100%' : '0%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {[
          { to: '/',          icon: Home,            label: 'Home' },
          { to: '/ai-brain',  icon: BrainCircuit,    label: 'AI' },
          { to: '/workflows', icon: GitBranch,       label: 'Flows' },
          { to: '/analytics', icon: BarChart3,       label: 'Stats' },
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
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── FAB ── */}
      <div className="fixed bottom-20 lg:bottom-6 right-6 z-50">
        <AnimatePresence>
          {isFabOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-16 right-0 mb-2 flex flex-col items-end gap-2"
            >
              {[
                { label: 'Terminal',       icon: TerminalIcon, onClick: toggleTerminal },
                { label: 'Force Post',     icon: Zap,          onClick: () => handleFabCommand('/post', '/posts') },
                { label: 'Security Scan',  icon: ShieldAlert,  onClick: () => handleFabCommand('/scan', '/security') },
                { label: 'Health Check',   icon: Activity,     onClick: () => handleFabCommand('/ping') },
              ].map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { action.onClick(); setIsFabOpen(false); }}
                  className="flex items-center gap-3 group"
                >
                  <span className="px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {action.label}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-glow-primary">
                    <action.icon className="w-[18px] h-[18px]" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent text-white flex items-center justify-center shadow-glow-primary hover:scale-105 active:scale-95 transition-all"
        >
          <motion.div animate={{ rotate: isFabOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
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
