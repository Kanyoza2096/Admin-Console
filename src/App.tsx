import React, { lazy, Suspense, useEffect, useState, useCallback, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import Login from './pages/Login';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SkeletonPage } from './components/Skeleton';
import { Toaster } from 'sonner';
import { CommandPalette } from './components/CommandPalette';

// Route-level code splitting — each page is its own chunk loaded on demand.
const Dashboard         = lazy(() => import('./pages/Dashboard'));
const Posts             = lazy(() => import('./pages/Posts'));
const ApiAnalytics      = lazy(() => import('./pages/ApiAnalytics'));
const Guardian          = lazy(() => import('./pages/Guardian'));
const Settings          = lazy(() => import('./pages/Settings'));
const AIEngine          = lazy(() => import('./pages/AIEngine'));
const PayloadInspector  = lazy(() => import('./pages/PayloadInspector'));
const Workflows         = lazy(() => import('./pages/Workflows'));
const PrometheusMetrics = lazy(() => import('./pages/PrometheusMetrics'));
const AIBrain           = lazy(() => import('./pages/AIBrain'));
const KnowledgeBase     = lazy(() => import('./pages/KnowledgeBase'));
const Integrations      = lazy(() => import('./pages/Integrations'));
const MISManager        = lazy(() => import('./pages/MISManager'));
const Messenger         = lazy(() => import('./pages/Messenger'));
const Analytics         = lazy(() => import('./pages/Analytics'));
const Scheduler         = lazy(() => import('./pages/Scheduler'));
const Tasks             = lazy(() => import('./pages/Tasks'));
const APIManager        = lazy(() => import('./pages/APIManager'));
const Security          = lazy(() => import('./pages/Security'));
const Users             = lazy(() => import('./pages/Users'));
const AuditLogs         = lazy(() => import('./pages/AuditLogs'));
const Marketplace       = lazy(() => import('./pages/Marketplace'));
const Tenants           = lazy(() => import('./pages/Tenants'));
const Monitoring        = lazy(() => import('./pages/Monitoring'));
const AIChat            = lazy(() => import('./pages/AIChat'));
const Brands            = lazy(() => import('./pages/Brands'));
const AIProfiles        = lazy(() => import('./pages/AIProfiles'));
const Features          = lazy(() => import('./pages/Features'));
const SocialAccounts    = lazy(() => import('./pages/SocialAccounts'));
const Notifications     = lazy(() => import('./pages/Notifications'));
const DataFlowVisualizer = lazy(() => import('./pages/DataFlowVisualizer'));
const SystemArchitecture = lazy(() => import('./pages/SystemArchitecture'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const IncidentCenter = lazy(() => import('./pages/IncidentCenter'));
const LiveLogs = lazy(() => import('./pages/LiveLogs'));
const WorkflowRuns = lazy(() => import('./pages/WorkflowRuns'));

// ── Route metadata for command palette search ──────────────────────────────

const ROUTE_META: Record<string, { title: string; keywords: string[] }> = {
  '/':                  { title: 'Dashboard',         keywords: ['home', 'overview', 'stats'] },
  '/ai-brain':          { title: 'AI Brain',          keywords: ['ai', 'brain', 'orchestrator', 'providers'] },
  '/workflows':         { title: 'Workflows',         keywords: ['automation', 'pipeline', 'post'] },
  '/posts':             { title: 'Posts',             keywords: ['content', 'social', 'published'] },
  '/knowledge-base':    { title: 'Knowledge Base',    keywords: ['kb', 'documents', 'search'] },
  '/integrations':      { title: 'Integrations',      keywords: ['connect', 'facebook', 'twitter', 'linkedin'] },
  '/mis':               { title: 'MIS Manager',       keywords: ['church', 'school', 'hospital', 'crm'] },
  '/messenger':         { title: 'Messenger',         keywords: ['chat', 'messages', 'conversation'] },
  '/analytics':         { title: 'Analytics',         keywords: ['charts', 'reports', 'engagement'] },
  '/scheduler':         { title: 'Scheduler',         keywords: ['schedule', 'timing', 'posts'] },
  '/tasks':             { title: 'Tasks',             keywords: ['queue', 'jobs', 'workers'] },
  '/api-manager':       { title: 'API Manager',       keywords: ['keys', 'tokens', 'rate limit'] },
  '/security':          { title: 'Security',          keywords: ['auth', 'roles', 'permissions'] },
  '/users':             { title: 'Users',             keywords: ['members', 'team', 'accounts'] },
  '/audit-logs':        { title: 'Audit Logs',        keywords: ['history', 'trail', 'compliance'] },
  '/marketplace':       { title: 'Marketplace',       keywords: ['plugins', 'addons', 'install'] },
  '/tenants':           { title: 'Tenants',           keywords: ['multi-tenant', 'workspaces', 'organizations'] },
  '/brands':            { title: 'Brands',            keywords: ['branding', 'identity', 'logo'] },
  '/ai-profiles':       { title: 'AI Profiles',       keywords: ['persona', 'tone', 'voice'] },
  '/features':          { title: 'Features',          keywords: ['flags', 'toggle', 'beta'] },
  '/monitoring':        { title: 'Monitoring',        keywords: ['health', 'status', 'uptime'] },
  '/ai-chat':           { title: 'AI Chat',           keywords: ['chatbot', 'conversation', 'assistant'] },
  '/engine':            { title: 'AI Engine',         keywords: ['config', 'model', 'temperature'] },
  '/payloads':          { title: 'Payload Inspector', keywords: ['debug', 'request', 'response'] },
  '/api':               { title: 'API Analytics',     keywords: ['usage', 'calls', 'tokens'] },
  '/prometheus':        { title: 'Prometheus',        keywords: ['metrics', 'monitoring', 'grafana'] },
  '/social-accounts':   { title: 'Social Accounts',   keywords: ['facebook', 'twitter', 'instagram'] },
  '/guardian':          { title: 'Guardian',          keywords: ['code', 'scan', 'github', 'security'] },
  '/notifications':     { title: 'Notifications',     keywords: ['alerts', 'inbox'] },
  '/data-flow':         { title: 'Data Flow',         keywords: ['visualizer', 'pipeline', 'nodes'] },
  '/system-architecture': { title: 'System Architecture', keywords: ['diagram', 'services', 'infra'] },
  '/incident-center':   { title: 'Incident Center',   keywords: ['alerts', 'downtime', 'outage'] },
  '/live-logs':         { title: 'Live Logs',         keywords: ['streaming', 'tail', 'debug'] },
  '/workflow-runs':     { title: 'Workflow Runs',     keywords: ['history', 'executions', 'runs'] },
  '/settings':          { title: 'Settings',          keywords: ['config', 'preferences', 'account'] },
};

// ── Animated page wrapper ──────────────────────────────────────────────────

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Route wrapper with ErrorBoundary + Suspense + Animation ────────────────

function Page({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ErrorBoundary name={name}>
      <Suspense fallback={<SkeletonPage />}>
        <PageTransition>
          {children}
        </PageTransition>
      </Suspense>
    </ErrorBoundary>
  );
}

// ── Auth gate with loading state ───────────────────────────────────────────

function AuthGate({ children }: { children: ReactNode }) {
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const [checking, setChecking] = useState(true);
  const login  = useStore(state => state.login);
  const logout = useStore(state => state.logout);

  useEffect(() => {
    // Synchronous check first — no flicker
    if (localStorage.getItem('kanyoza_authenticated') === 'true') {
      login();
    }

    if (!isSupabaseConfigured()) {
      setChecking(false);
      return;
    }

    // Async Supabase session check
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          login();
          localStorage.setItem('kanyoza_authenticated', 'true');
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        login();
        localStorage.setItem('kanyoza_authenticated', 'true');
      } else if (event === 'SIGNED_OUT') {
        if (localStorage.getItem('kanyoza_authenticated') !== 'true') {
          logout();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [login, logout]);

  // Show nothing while checking — prevents login flash
  if (checking && isSupabaseConfigured()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <>{children}</>;
}

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #27272a',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        routes={ROUTE_META}
      />

      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index            element={<Page name="Dashboard">        <Dashboard />        </Page>} />
              <Route path="ai-brain"  element={<Page name="AI Brain">         <AIBrain />          </Page>} />
              <Route path="workflows" element={<Page name="Workflows">        <Workflows />        </Page>} />
              <Route path="posts"     element={<Page name="Posts">            <Posts />            </Page>} />
              <Route path="knowledge-base" element={<Page name="Knowledge Base"><KnowledgeBase />    </Page>} />
              <Route path="integrations" element={<Page name="Integrations"><Integrations />        </Page>} />
              <Route path="mis"       element={<Page name="MIS Manager">     <MISManager />        </Page>} />
              <Route path="messenger" element={<Page name="Messenger">       <Messenger />        </Page>} />
              <Route path="analytics" element={<Page name="Analytics">       <Analytics />        </Page>} />
              <Route path="scheduler" element={<Page name="Scheduler">       <Scheduler />        </Page>} />
              <Route path="tasks"     element={<Page name="Tasks">           <Tasks />            </Page>} />
              <Route path="api-manager" element={<Page name="API Manager"> <APIManager />        </Page>} />
              <Route path="security"  element={<Page name="Security">        <Security />         </Page>} />
              <Route path="users"     element={<Page name="Users">           <Users />            </Page>} />
              <Route path="audit-logs" element={<Page name="Audit Logs">    <AuditLogs />        </Page>} />
              <Route path="marketplace" element={<Page name="Marketplace"> <Marketplace />        </Page>} />
              <Route path="tenants"   element={<Page name="Tenants">         <Tenants />          </Page>} />
              <Route path="brands"    element={<Page name="Brands">          <Brands />           </Page>} />
              <Route path="ai-profiles" element={<Page name="AI Profiles"> <AIProfiles />        </Page>} />
              <Route path="features"  element={<Page name="Features">        <Features />         </Page>} />
              <Route path="monitoring" element={<Page name="Monitoring">    <Monitoring />        </Page>} />
              <Route path="ai-chat"   element={<Page name="AI Chat">         <AIChat />          </Page>} />
              <Route path="engine"    element={<Page name="AI Engine">        <AIEngine />         </Page>} />
              <Route path="payloads"  element={<Page name="Payload Inspector"><PayloadInspector /> </Page>} />
              <Route path="api"       element={<Page name="API Analytics">    <ApiAnalytics />     </Page>} />
              <Route path="prometheus"element={<Page name="Prometheus">       <PrometheusMetrics /></Page>} />
              <Route path="social-accounts" element={<Page name="Social Accounts"><SocialAccounts /></Page>} />
              <Route path="guardian"  element={<Page name="Guardian">         <Guardian />         </Page>} />
              <Route path="notifications" element={<Page name="Notifications"><Notifications />    </Page>} />
              <Route path="data-flow" element={<Page name="Data Flow"><DataFlowVisualizer /></Page>} />
              <Route path="system-architecture" element={<Page name="System Architecture"><SystemArchitecture /></Page>} />
              <Route path="services/:serviceId" element={<Page name="Service Detail"><ServiceDetail /></Page>} />
              <Route path="incident-center" element={<Page name="Incident Center"><IncidentCenter /></Page>} />
              <Route path="live-logs" element={<Page name="Live Logs"><LiveLogs /></Page>} />
              <Route path="workflow-runs" element={<Page name="Workflow Runs"><WorkflowRuns /></Page>} />
              <Route path="settings"  element={<Page name="Settings"><Settings /></Page>} />
              <Route path="*"         element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </>
  );
}
