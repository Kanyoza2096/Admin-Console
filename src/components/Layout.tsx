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
  Database,
  BookOpen,
  Link,
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
  { to: '/',                    icon: LayoutDashboard, label: 'Dashboard',          group: 'observe' },
  { to: '/data-flow',           icon: Network,         label: 'Data Flow',           group: 'observe' },
  { to: '/system-architecture', icon: LayoutGrid,      label: 'System Architecture', group: 'observe' },
  { to: '/prometheus',          icon: BarChart3,       label: 'Prometheus',          group: 'observe' },
  { to: '/analytics',           icon: BarChart3,       label: 'Analytics',           group: 'observe' },
  { to: '/live-logs',           icon: TerminalIcon,    label: 'Live Logs',           group: 'observe' },
  { to: '/incident-center',     icon: AlertTriangle,   label: 'Incident Center',     group: 'investigate' },
  { to: '/audit-logs',          icon: FileClock,       label: 'Audit Logs',          group: 'investigate' },
  { to: '/security',            icon: ShieldAlert,     label: 'Security',            group: 'investigate' },
  { to: '/workflows',           icon: GitBranch,       label: 'Automation',          group: 'operate' },
  { to: '/workflow-runs',       icon: GitBranch,       label: 'Workflow Runs',       group: 'operate' },
  { to: '/scheduler',           icon: Calendar,        label: 'Scheduler',           group: 'operate' },
  { to: '/tasks',               icon: CheckSquare,     label: 'Tasks',               group: 'operate' },
  { to: '/api-manager',         icon: Key,             label: 'API Manager',         group: 'operate' },
  { to: '/posts',               icon: FileText,        label: 'Content Studio',      group: 'operate' },
  { to: '/messenger',           icon: MessageSquare,   label: 'Messenger',           group: 'operate' },
  { to: '/ai-brain',            icon: BrainCircuit,    label: 'AI Brain',            group: 'configure' },
  { to: '/knowledge-base',      icon: BookOpen,        label: 'Knowledge Base',      group: 'configure' },
  { to: '/integrations',        icon: Link,            label: 'Integrations',        group: 'configure' },
  { to: '/brands',              icon: Palette,         label: 'Brands',              group: 'configure' },
  { to: '/ai-profiles',         icon: Bot,             label: 'AI Profiles',         group: 'configure' },
  { to: '/social-accounts',     icon: Link,            label: 'Social Accounts',     group: 'configure' },
  { to: '/mis',                 icon: Database,        label: 'MIS Manager',         group: 'configure' },
  { to: '/users',               icon: Users,           label: 'Users',               group: 'govern' },
  { to: '/tenants',             icon: Building2,       label: 'Tenants',             group: 'govern' },
  { to: '/marketplace',         icon: Store,           label: 'Marketplace',         group: 'govern' },
  { to: '/features',            icon: ToggleLeft,      label: 'Feature Toggles',     group: 'govern' },
  { to: '/monitoring',          icon: Cpu,             label: 'Monitoring',          group: 'govern' },
  { to: '/ai-chat',             icon: MessageCircle,   label: 'AI Chat',             group: 'govern' },
  { to: '/settings',            icon: Settings,        label: 'Settings',            group: 'govern' },
];

const NAV_GROUPS = [
  { key: 'observe',     label: 'Observe' },
  { key: 'investigate', label: 'Investigate' },
  { key: 'operate',     label: 'Operate' },
  { key: 'configure',   label: 'Configure' },
  { key: 'govern',      label: 'Govern' },
];

const MOOD_META: Record<string, { label: string; color: string; dot: string }> = {
  analytical:   { label: 'Analytical',   color: 'bg-brand-accent/10 text-brand-accent border-brand-accent/20',     dot: 'bg-brand-accent' },
  professional: { label: 'Professional', color: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20', dot: 'bg-brand-primary' },
  creative:     { label: 'Creative',     color: 'bg-brand-warning/10 text-brand-warning border-brand-warning/20', dot: 'bg-brand-warning' },
  urgent:       { label: 'Urgent',       color: 'bg-brand-danger/10 text-brand-danger border-brand-danger/20',    dot: 'bg-brand-danger' },
};

// ── Breadcrumb builder ──────────────────────────────────────────────────────

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

// ── Sidebar nav tooltip ─────────────────────────────────────────────────────

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div className="relative group/tooltip">
      {children}
      <div
        className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3 py-1.5
                   bg-brand-elevated border border-brand-border rounded-lg text-xs
                   font-semibold text-brand-text shadow-2xl opacity-0 invisible
                   group-hover/tooltip:opacity-100 group-hover/tooltip:visible
                   transition-all duration-150 whitespace-nowrap z-50 pointer-events-none"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
      >
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
  const [clockTime,           setClockTime]           = useState(() =>
    new Date().toISOString().replace('T', ' ').substring(0, 19)
  );
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const navigate    = useNavigate();
  const location    = useLocation();
  const breadcrumbs = useBreadcrumbs();

  const isSidebarExpanded = isMobileMenuOpen || !isCollapsed;

  // Responsive collapse
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1280px)');
    if (!isMobileMenuOpen) setIsCollapsed(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      if (!isMobileMenuOpen) setIsCollapsed(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [isMobileMenuOpen]);

  // Theme
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Clock
  useEffect(() => {
    const tick = () =>
      setClockTime(new Date().toISOString().replace('T', ' ').substring(0, 19));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Socket + realtime
  useEffect(() => {
    connectSocket();
    fetchInitialData();
    startRealtimeSubscriptions();
    return () => { disconnectSocket(); stopRealtimeSubscriptions(); };
  }, [connectSocket, disconnectSocket, fetchInitialData, startRealtimeSubscriptions, stopRealtimeSubscriptions]);

  // Scroll-hide mobile bottom nav
  useEffect(() => {
    const handleScroll = () => {
      const cur = window.scrollY;
      setHidden(cur > lastScrollY.current && cur > 80);
      lastScrollY.current = cur;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // RTT measurement
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
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsAdminMenuOpen(false);
        setIsWorkspaceOpen(false);
      }
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
    queryFn:  () => fetchWorkspaces({ restEndpoint, masterToken }),
    retry:    1,
    staleTime: 60_000,
  });
  const workspaces: Workspace[] = workspacesData?.workspaces ?? [];
  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0) setSelectedWorkspaceId(workspaces[0].id);
  }, [workspaces, selectedWorkspaceId, setSelectedWorkspaceId]);
  const activeWorkspace = workspaces.find(w => String(w.id) === String(selectedWorkspaceId));

  const unreadAlerts  = guardianAlerts.filter(a => a.severity === 'CRITICAL').length;
  const criticalHealth = healthMatrix.filter((h: any) => h.status === 'offline').length;

  const searchResults = searchQuery.length > 1
    ? NAV_ITEMS.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Close mobile menu on route change
  useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-brand-text overflow-hidden">

      {/* ── TOP NAVIGATION BAR ─────────────────────────────────────────────── */}
      <header
        className="h-14 flex-shrink-0 flex items-center justify-between px-3 sm:px-4
                   bg-brand-surface border-b border-brand-border/60 z-50 gap-3"
        style={{ boxShadow: '0 1px 0 rgba(79,70,229,0.08)' }}
      >
        {/* Left: Sidebar toggle + Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => { setIsMobileMenuOpen(v => !v); vibrate(10); }}
            className="lg:hidden p-2 rounded-lg hover:bg-brand-elevated text-brand-text-muted transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setIsCollapsed(v => !v)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-brand-elevated text-brand-text-muted hover:text-brand-text transition-colors"
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            {isCollapsed
              ? <PanelLeft className="w-4 h-4" />
              : <PanelLeftClose className="w-4 h-4" />}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent
                           flex items-center justify-center flex-shrink-0"
                style={{ boxShadow: '0 0 16px rgba(79,70,229,0.4)' }}
              >
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-brand-success rounded-full border-2 border-brand-surface" />
            </div>
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="hidden sm:block overflow-hidden"
                >
                  <p className="text-sm font-bold leading-none tracking-wide whitespace-nowrap text-brand-text">
                    Kanyoza<span className="text-brand-primary">AI</span>
                  </p>
                  <p className="text-[9px] text-brand-text-muted font-mono leading-none mt-0.5 uppercase tracking-widest">
                    Enterprise v11
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-lg relative hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text-muted" />
            <input
              type="text"
              placeholder="Search pages & commands… (Ctrl+K)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => setTimeout(() => setIsSearchOpen(false), 150)}
              className="w-full pl-9 pr-12 py-2 bg-brand-elevated/40 border border-brand-border/60
                         rounded-xl text-sm text-brand-text placeholder-brand-text-muted/60
                         focus:outline-none focus:border-brand-primary/50 focus:ring-1
                         focus:ring-brand-primary/20 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px]
                            font-mono bg-brand-elevated border border-brand-border rounded
                            text-brand-text-muted select-none">
              ⌘K
            </kbd>
          </div>
          <AnimatePresence>
            {isSearchOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 right-0 mt-2 bg-brand-surface border
                           border-brand-border rounded-xl shadow-2xl overflow-hidden z-50"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,70,229,0.1)' }}
              >
                {searchResults.map(item => (
                  <button
                    key={item.to}
                    onMouseDown={() => { navigate(item.to); setSearchQuery(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-elevated
                               text-left transition-colors border-b border-brand-border/40 last:border-0"
                  >
                    <item.icon className="w-4 h-4 text-brand-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-brand-text">{item.label}</span>
                    <span className="ml-auto text-[10px] text-brand-text-muted font-mono opacity-60">{item.to}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">

          {/* Connection status pill */}
          <div className="hidden xl:flex items-center gap-1.5 mr-1">
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
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border
                              bg-brand-danger/10 text-brand-danger border-brand-danger/20
                              text-[11px] font-semibold animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {criticalHealth} critical
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border
                              bg-brand-success/10 text-brand-success border-brand-success/20
                              text-[11px] font-semibold">
                <CheckCircle className="w-3 h-3" />
                Operational
              </div>
            )}
          </div>

          {/* AI Mood */}
          {personaMood && MOOD_META[personaMood] && (
            <div className={cn(
              'hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold mr-1',
              MOOD_META[personaMood].color
            )}>
              <div className={cn('w-1.5 h-1.5 rounded-full', MOOD_META[personaMood].dot)} />
              {MOOD_META[personaMood].label}
            </div>
          )}

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
              onClick={() => { setIsNotificationsOpen(v => !v); setIsAdminMenuOpen(false); setIsWorkspaceOpen(false); }}
              className="p-2 rounded-lg hover:bg-brand-elevated transition-colors relative"
            >
              <Bell className="w-4 h-4 text-brand-text-muted" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-brand-danger rounded-full
                                 flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ boxShadow: '0 0 10px rgba(239,68,68,0.5)' }}>
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
                  className="absolute right-0 top-full mt-2 w-80 bg-brand-surface border
                             border-brand-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                  style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,70,229,0.08)' }}
                >
                  <div className="px-4 py-3.5 border-b border-brand-border flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-brand-text">Notifications</h3>
                      <p className="text-[10px] text-brand-text-muted mt-0.5">{guardianAlerts.length} total</p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full',
                      unreadAlerts > 0
                        ? 'bg-brand-danger/20 text-brand-danger'
                        : 'bg-brand-success/20 text-brand-success'
                    )}>
                      {unreadAlerts > 0 ? `${unreadAlerts} Critical` : 'All Clear'}
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {guardianAlerts.length === 0 ? (
                      <div className="py-10 text-center text-sm text-brand-text-muted">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-brand-success opacity-40" />
                        No active alerts
                      </div>
                    ) : guardianAlerts.slice(0, 8).map((alert: any) => (
                      <button
                        key={alert.id}
                        onClick={() => { navigate('/guardian'); setIsNotificationsOpen(false); }}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-brand-elevated
                                   transition-colors border-b border-brand-border/40 last:border-0 text-left"
                      >
                        <div className={cn(
                          'mt-1 w-2 h-2 rounded-full flex-shrink-0',
                          alert.severity === 'CRITICAL' ? 'bg-brand-danger' :
                          alert.severity === 'HIGH'     ? 'bg-brand-warning' : 'bg-brand-accent'
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-brand-text">{alert.title}</p>
                          <p className="text-[10px] text-brand-text-muted mt-0.5">
                            {alert.severity} · {new Date(alert.time).toLocaleTimeString()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-3 border-t border-brand-border">
                    <button
                      onClick={() => { navigate('/security'); setIsNotificationsOpen(false); }}
                      className="w-full py-2 text-xs font-semibold text-brand-primary
                                 hover:bg-brand-primary/10 rounded-lg transition-colors"
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
              onClick={() => { setIsWorkspaceOpen(v => !v); setIsAdminMenuOpen(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-brand-elevated
                         border border-brand-border/60 text-xs font-medium transition-colors"
            >
              <div className="w-4 h-4 rounded bg-brand-primary/20 text-brand-primary
                              flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                {activeWorkspace?.name?.[0]?.toUpperCase() || 'K'}
              </div>
              <span className="max-w-[5rem] truncate text-brand-text">
                {activeWorkspace?.name || 'Default'}
              </span>
              <ChevronDown className="w-3 h-3 text-brand-text-muted" />
            </button>
            <AnimatePresence>
              {isWorkspaceOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-56 bg-brand-surface border
                             border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden"
                  style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
                >
                  <div className="px-3 py-2.5 border-b border-brand-border">
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                      Workspace
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {workspaces.map((ws: Workspace) => (
                      <button
                        key={ws.id}
                        onClick={() => { setSelectedWorkspaceId(ws.id); setIsWorkspaceOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-brand-elevated transition-colors text-left',
                          String(selectedWorkspaceId) === String(ws.id) && 'bg-brand-primary/8 text-brand-primary'
                        )}
                      >
                        <div className="w-6 h-6 rounded-md bg-brand-primary/20 text-brand-primary
                                        flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {ws.name[0]?.toUpperCase()}
                        </div>
                        <span className="truncate font-medium">{ws.name}</span>
                        {String(selectedWorkspaceId) === String(ws.id) && (
                          <CheckCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-brand-primary" />
                        )}
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
              onClick={() => { setIsAdminMenuOpen(v => !v); setIsNotificationsOpen(false); setIsWorkspaceOpen(false); }}
              className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-brand-elevated transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent
                           flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ boxShadow: '0 0 12px rgba(79,70,229,0.3)' }}
              >
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
                  className="absolute right-0 top-full mt-2 w-52 bg-brand-surface border
                             border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden"
                  style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,70,229,0.08)' }}
                >
                  <div className="px-3 py-3 border-b border-brand-border">
                    <p className="text-sm font-bold text-brand-text">Administrator</p>
                    <p className="text-[10px] text-brand-text-muted">Level 5 Clearance</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {[
                      { to: '/settings', icon: Settings, label: 'Settings' },
                      { to: '/users',    icon: Users,    label: 'Manage Users' },
                    ].map(item => (
                      <button
                        key={item.to}
                        onClick={() => { navigate(item.to); setIsAdminMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg
                                   hover:bg-brand-elevated transition-colors text-brand-text"
                      >
                        <item.icon className="w-4 h-4 text-brand-text-muted flex-shrink-0" />
                        {item.label}
                      </button>
                    ))}
                    <button
                      onClick={() => { toggleTerminal(); setIsAdminMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg
                                 hover:bg-brand-elevated transition-colors text-brand-text"
                    >
                      <TerminalIcon className="w-4 h-4 text-brand-accent flex-shrink-0" />
                      Terminal
                    </button>
                  </div>
                  <div className="p-1.5 border-t border-brand-border">
                    <button
                      onClick={() => { handleLogout(); setIsAdminMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg
                                 hover:bg-brand-danger/10 text-brand-danger transition-colors font-semibold"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      Terminate Session
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── BODY (Sidebar + Content) ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <motion.nav
          animate={{ width: isMobileMenuOpen ? 256 : (isCollapsed ? 64 : 256) }}
          transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          className={cn(
            'fixed lg:relative top-14 lg:top-0 left-0 h-[calc(100vh-3.5rem)] lg:h-full z-40',
            'flex flex-col overflow-hidden flex-shrink-0',
            'border-r border-brand-border/60',
            // On mobile: translate in/out; on desktop always visible
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
          style={{ backgroundColor: 'var(--color-brand-surface)' }}
        >
          {/* Clock + Connection badge */}
          <div className={cn(
            'px-3 py-2.5 border-b border-brand-border/50 flex items-center gap-2 flex-shrink-0',
            isSidebarExpanded ? 'justify-between' : 'justify-center'
          )}>
            {isSidebarExpanded && (
              <span className="text-[10px] font-mono text-brand-text-muted tabular-nums whitespace-nowrap select-none">
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

          {/* Nav groups */}
          <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
            {NAV_GROUPS.map(group => {
              const items = NAV_ITEMS.filter(i => i.group === group.key);
              return (
                <div key={group.key}>
                  {isSidebarExpanded && (
                    <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-brand-text-muted/70 select-none">
                      {group.label}
                    </p>
                  )}
                  {!isSidebarExpanded && (
                    <div className="h-px bg-brand-border/50 mx-2 mb-2 mt-1" />
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
                            isCollapsed && !isMobileMenuOpen ? 'justify-center px-2.5' : '',
                            isActive
                              ? 'bg-brand-primary/12 text-brand-primary'
                              : 'text-brand-text-muted hover:bg-brand-elevated/60 hover:text-brand-text'
                          )}
                        >
                          {({ isActive }) => (
                            <>
                              <item.icon
                                className={cn(
                                  'w-[1.05rem] h-[1.05rem] flex-shrink-0 transition-colors',
                                  isActive ? 'text-brand-primary' : ''
                                )}
                              />
                              {isSidebarExpanded && (
                                <span className="truncate leading-none">{item.label}</span>
                              )}
                              {isActive && (
                                <motion.div
                                  layoutId="activeNav"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-primary rounded-r-full"
                                  transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                                />
                              )}
                            </>
                          )}
                        </NavLink>
                      );

                      return !isSidebarExpanded ? (
                        <Tooltip key={item.to} content={item.label}>{link}</Tooltip>
                      ) : (
                        <React.Fragment key={item.to}>{link}</React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar footer */}
          <div className="p-2 border-t border-brand-border/50 space-y-1 flex-shrink-0">
            <div className="flex items-center justify-center py-1.5">
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
                'flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium',
                'text-brand-text-muted hover:text-brand-danger hover:bg-brand-danger/8',
                'rounded-lg transition-colors',
                !isSidebarExpanded && 'justify-center px-2'
              )}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {isSidebarExpanded && <span>Sign Out</span>}
            </button>
          </div>
        </motion.nav>

        {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <SystemDiagnostics />

          {/* Breadcrumb bar */}
          <div className="h-9 flex-shrink-0 flex items-center px-4 bg-brand-bg/60
                          border-b border-brand-border/30 gap-1.5 overflow-x-auto scrollbar-none">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.to}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-brand-text-muted/50 flex-shrink-0" />}
                <button
                  onClick={() => navigate(crumb.to)}
                  className={cn(
                    'text-xs whitespace-nowrap transition-colors hover:text-brand-primary',
                    i === breadcrumbs.length - 1
                      ? 'font-semibold text-brand-text'
                      : 'text-brand-text-muted/70'
                  )}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Page content */}
          <div
            className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-bg p-4 md:p-6
                       pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── MOBILE OVERLAY ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/65 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── MOBILE BOTTOM NAV ───────────────────────────────────────────── */}
      <motion.div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          backgroundColor: 'var(--color-brand-surface)',
          borderTop: '1px solid var(--color-brand-border)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
        }}
        animate={{ y: hidden ? '100%' : '0%' }}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
      >
        {[
          { to: '/',          icon: Home,         label: 'Home' },
          { to: '/ai-brain',  icon: BrainCircuit, label: 'AI' },
          { to: '/workflows', icon: GitBranch,    label: 'Flows' },
          { to: '/analytics', icon: BarChart3,    label: 'Stats' },
          { to: '/settings',  icon: Settings,     label: 'Settings' },
        ].map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => vibrate(10)}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all',
              isActive ? 'text-brand-primary' : 'text-brand-text-muted'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => { vibrate(10); setIsMobileMenuOpen(v => !v); }}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-brand-text-muted"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wide">More</span>
        </button>
      </motion.div>

      {/* ── FAB (Floating Action Button) ────────────────────────────────── */}
      <div className="fixed bottom-[4.5rem] lg:bottom-6 right-5 z-50">
        <AnimatePresence>
          {isFabOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="absolute bottom-16 right-0 mb-1 flex flex-col items-end gap-2"
            >
              {[
                { label: 'Terminal',      icon: TerminalIcon, onClick: toggleTerminal },
                { label: 'Force Post',    icon: Zap,          onClick: () => handleFabCommand('/post', '/posts') },
                { label: 'Security Scan', icon: ShieldAlert,  onClick: () => handleFabCommand('/scan', '/security') },
                { label: 'Health Check',  icon: Activity,     onClick: () => handleFabCommand('/ping') },
              ].map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { action.onClick(); setIsFabOpen(false); }}
                  className="flex items-center gap-3 group"
                >
                  <span className="px-3 py-1.5 bg-brand-surface border border-brand-border rounded-xl
                                   text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100
                                   transition-opacity pointer-events-none whitespace-nowrap">
                    {action.label}
                  </span>
                  <div
                    className="w-10 h-10 rounded-full bg-brand-primary text-white
                               flex items-center justify-center transition-transform
                               hover:scale-105 active:scale-95"
                    style={{ boxShadow: '0 0 16px rgba(79,70,229,0.45)' }}
                  >
                    <action.icon className="w-[18px] h-[18px]" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsFabOpen(v => !v)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent
                     text-white flex items-center justify-center
                     hover:scale-105 active:scale-95 transition-transform"
          style={{ boxShadow: '0 0 24px rgba(79,70,229,0.5)' }}
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
