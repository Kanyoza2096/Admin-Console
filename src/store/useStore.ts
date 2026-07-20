import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { supabase, isSupabaseConfigured, refreshSupabaseClient } from '../lib/supabase';

export type ServiceStatus = 'online' | 'degraded' | 'offline';

export interface LiveNotification {
  id: string;
  type: 'alert' | 'post' | 'message' | 'payload';
  title: string;
  subtitle?: string;
  severity?: string;
}

export interface TriggerNotificationInput {
  type: 'alert' | 'post' | 'message' | 'payload' | 'success' | 'warning' | 'info';
  title: string;
  subtitle?: string;
  message?: string;
  severity?: string;
}

export interface HttpLog {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  error?: string;
  page?: string;
}

export interface SystemHealth {
  id: string;
  name: string;
  status: ServiceStatus;
  latency: number;
  lastChecked: number;
  uptime: number;
}

export interface LiveMessage {
  id: string;
  user: string;
  avatar: string;
  message: string;
  time: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface GuardianAlert {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  time: number;
}

export interface Post {
  id: string;
  title: string;
  platform: 'facebook' | 'twitter' | 'linkedin';
  time: number;
  engagement: number;
  thumbnail: string;
}

export interface PayloadLog {
  id: string;
  time: string;
  method: string;
  endpoint: string;
  status: number;
  latency: string;
  type: 'inbound' | 'outbound';
  request: any;
  response: any;
}

// ── Constants ──────────────────────────────────────────────────────────────

const POLLING_INTERVAL = import.meta.env.VITE_POLLING_INTERVAL
  ? parseInt(import.meta.env.VITE_POLLING_INTERVAL)
  : 120_000;

const MAX_MESSAGES = 20;
const MAX_POSTS = 20;
const MAX_ALERTS = 50;
const MAX_PAYLOADS = 50;
const MAX_LATENCY_HISTORY = 60;
const MAX_HTTP_LOGS = 50;
const MAX_HEALTH_MATRIX = 20;

// ── Store ──────────────────────────────────────────────────────────────────

interface AppState {
  // Auth
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Tenancy
  currentTenant: string;
  setCurrentTenant: (tenant: string) => void;
  selectedWorkspaceId: string | number | null;
  setSelectedWorkspaceId: (id: string | number | null) => void;
  selectedBrandId: string | number | null;
  setSelectedBrandId: (id: string | number | null) => void;

  // Connection
  wsEndpoint: string;
  restEndpoint: string;
  masterToken: string;
  setConnectionParams: (params: { wsEndpoint?: string; restEndpoint?: string; masterToken?: string }) => void;

  // Service Keys
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiKey: string;
  githubToken: string;
  githubRepo: string;
  githubBranch: string;
  fbPageId: string;
  fbVerifyToken: string;
  fbPageAccessToken: string;
  fbAppSecret: string;
  isUsingLiveBackendData: boolean;
  setServiceKeys: (keys: Record<string, string>) => void;

  // SocketIO
  socket: Socket | null;
  socketConnected: boolean;
  socketTransport: 'polling' | 'websocket' | null;
  socketError: string | null;
  socketReconnectAttempts: number;
  socketLastEventAt: number | null;
  connectSocket: () => void;
  disconnectSocket: () => void;

  // Live Data
  messages: LiveMessage[];
  addMessage: (msg: LiveMessage) => void;
  isStreamPaused: boolean;
  setStreamPaused: (paused: boolean) => void;
  healthMatrix: SystemHealth[];
  updateHealth: (health: SystemHealth[]) => void;
  guardianAlerts: GuardianAlert[];
  addAlert: (alert: GuardianAlert) => void;
  recentPosts: Post[];
  addPost: (post: Post) => void;
  payloads: PayloadLog[];
  addPayload: (payload: PayloadLog) => void;

  // Notifications
  lastNotification: LiveNotification | null;
  dismissNotification: () => void;
  triggerNotification: (n: TriggerNotificationInput) => void;

  // Stats
  stats: {
    messagesToday: number;
    postsPublished: number;
    activeUsers: number;
    apiCalls: number;
    guardianIssues: number;
    revenueMonthly: number;
  };
  updateStats: (partial: Partial<AppState['stats']>) => void;

  // UI State
  isTerminalOpen: boolean;
  toggleTerminal: () => void;
  pendingCommand: string | null;
  setPendingCommand: (cmd: string | null) => void;
  personaMood: 'analytical' | 'professional' | 'creative' | 'urgent';
  setPersonaMood: (mood: AppState['personaMood']) => void;

  // Latency
  latencyHistory: number[];
  pushLatency: (ms: number) => void;

  // HTTP Logs
  httpLogs: HttpLog[];
  addHttpLog: (log: HttpLog) => void;
  clearHttpLogs: () => void;

  // Data Fetching
  fetchInitialData: () => Promise<void>;
  backendConfig: Record<string, any> | null;
  realtimeChannel: any;
  pollingTimer: ReturnType<typeof setInterval> | null;
  startRealtimeSubscriptions: () => void;
  stopRealtimeSubscriptions: () => void;

  // Reset
  resetData: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildHealthMatrix(services: Record<string, any>): SystemHealth[] {
  return Object.entries(services).map(([name, svc]: [string, any]) => ({
    id: name,
    name: svc.page_name || name.charAt(0).toUpperCase() + name.slice(1),
    status: svc.status === 'ok' ? 'online' : svc.status === 'degraded' ? 'degraded' : 'offline',
    latency: svc.latency_ms ?? 0,
    lastChecked: Date.now(),
    uptime: svc.status === 'ok' ? 99.9 : svc.status === 'degraded' ? 85.0 : 0,
  }));
}

function getAuthHeaders(masterToken: string): Record<string, string> {
  return masterToken ? {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${masterToken}`,
  } : { 'Content-Type': 'application/json' };
}

// ═══════════════════════════════════════════════════════════════════════════

export const useStore = create<AppState>((set, get) => ({
  
  // ── Auth ─────────────────────────────────────────────────────────────────

  isAuthenticated: false,
  login: () => {
    const stored = localStorage.getItem('rest_endpoint');
    if (stored && !stored.includes('/api/v1')) {
      localStorage.setItem('rest_endpoint', stored.replace(/\/$/, '') + '/api/v1');
    }
    set({ isAuthenticated: true });
  },
  logout: () => {
    get().disconnectSocket();
    get().stopRealtimeSubscriptions();
    const keysToRemove = [
      'master_token', 'supabase_url', 'supabase_anon_key', 'gemini_key',
      'github_token', 'github_repo', 'github_branch', 'fb_page_id',
      'fb_verify_token', 'fb_page_access_token', 'fb_app_secret',
      'kanyoza_authenticated',
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    set({
      isAuthenticated: false, masterToken: '', supabaseUrl: '', supabaseAnonKey: '',
      geminiKey: '', githubToken: '', fbPageAccessToken: '', fbAppSecret: '',
    });
  },

  // ── Theme ────────────────────────────────────────────────────────────────

  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    set({ theme: next });
  },

  // ── Tenancy ──────────────────────────────────────────────────────────────

  currentTenant: localStorage.getItem('current_tenant') || 'Kanyoza Systems',
  setCurrentTenant: (tenant) => {
    localStorage.setItem('current_tenant', tenant);
    set({ currentTenant: tenant });
  },
  selectedWorkspaceId: localStorage.getItem('selected_workspace_id') || null,
  setSelectedWorkspaceId: (id) => {
    if (id === null) localStorage.removeItem('selected_workspace_id');
    else localStorage.setItem('selected_workspace_id', String(id));
    set({ selectedWorkspaceId: id, selectedBrandId: null });
    localStorage.removeItem('selected_brand_id');
  },
  selectedBrandId: localStorage.getItem('selected_brand_id') || null,
  setSelectedBrandId: (id) => {
    if (id === null) localStorage.removeItem('selected_brand_id');
    else localStorage.setItem('selected_brand_id', String(id));
    set({ selectedBrandId: id });
  },

  // ── Connection ───────────────────────────────────────────────────────────

  wsEndpoint: localStorage.getItem('ws_endpoint') || import.meta.env.VITE_WS_ENDPOINT || 'wss://kanyoza-systems-bot.onrender.com',
  restEndpoint: localStorage.getItem('rest_endpoint') || import.meta.env.VITE_REST_ENDPOINT || 'https://kanyoza-systems-bot.onrender.com/api/v1',
  masterToken: localStorage.getItem('master_token') || import.meta.env.VITE_MASTER_TOKEN || '',
  setConnectionParams: (params) => {
    const previousWsEndpoint = get().wsEndpoint;
    if (params.wsEndpoint !== undefined) localStorage.setItem('ws_endpoint', params.wsEndpoint);
    if (params.restEndpoint !== undefined) localStorage.setItem('rest_endpoint', params.restEndpoint);
    if (params.masterToken !== undefined) localStorage.setItem('master_token', params.masterToken);
    set((state) => ({ ...state, ...params }));
    get().fetchInitialData();
    if (params.wsEndpoint && params.wsEndpoint !== previousWsEndpoint) {
      get().disconnectSocket();
      get().connectSocket();
    }
  },

  // ── Service Keys ─────────────────────────────────────────────────────────

  supabaseUrl: localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  geminiKey: localStorage.getItem('gemini_key') || '',
  githubToken: localStorage.getItem('github_token') || '',
  githubRepo: localStorage.getItem('github_repo') || '',
  githubBranch: localStorage.getItem('github_branch') || 'main',
  fbPageId: localStorage.getItem('fb_page_id') || '',
  fbVerifyToken: localStorage.getItem('fb_verify_token') || '',
  fbPageAccessToken: localStorage.getItem('fb_page_access_token') || '',
  fbAppSecret: localStorage.getItem('fb_app_secret') || '',
  isUsingLiveBackendData: false,
  setServiceKeys: (keys) => {
    Object.entries(keys).forEach(([key, value]) => {
      if (value !== undefined) localStorage.setItem(key, String(value));
    });
    set((state) => ({ ...state, ...keys }));
    refreshSupabaseClient();
    get().fetchInitialData();
  },

  // ── SocketIO ─────────────────────────────────────────────────────────────

  socket: null,
  socketConnected: false,
  socketTransport: null,
  socketError: null,
  socketReconnectAttempts: 0,
  socketLastEventAt: null,

  connectSocket: () => {
    if (get().socket) return;
    const rawBase = get().wsEndpoint.replace(/\/+$/, '');
    // Don't attempt connection if no endpoint has been configured by the user
    if (!rawBase || rawBase === 'wss://kanyoza-systems-bot.onrender.com' && !get().masterToken) return;
    const base = rawBase.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://');
    const socket = io(`${base}/dashboard`, {
      transports: ['polling', 'websocket'],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      // Cap at 5 attempts to avoid flooding Chrome with failed requests
      // when the backend is unreachable. The user can reconnect manually.
      reconnectionAttempts: 5,
      timeout: 20000,
      auth: { token: get().masterToken },
    });

    socket.on('connect', () => {
      set({
        socketConnected: true, socketError: null,
        socketReconnectAttempts: 0, socketLastEventAt: Date.now(),
        socketTransport: socket.io.engine?.transport?.name === 'websocket' ? 'websocket' : 'polling',
      });
    });

    socket.io.engine?.on?.('upgrade', (transport: any) => {
      set({ socketTransport: transport?.name === 'websocket' ? 'websocket' : 'polling' });
    });

    socket.on('disconnect', (reason: string) => {
      set({ socketConnected: false, socketTransport: null, socketError: `Disconnected: ${reason}`, socketLastEventAt: Date.now() });
    });

    socket.on('connect_error', (err: any) => {
      set({ socketConnected: false, socketError: err?.message || String(err), socketLastEventAt: Date.now() });
    });

    socket.io.on('reconnect_attempt', (attempt: number) => set({ socketReconnectAttempts: attempt, socketLastEventAt: Date.now() }));
    socket.io.on('reconnect', () => set({ socketConnected: true, socketError: null, socketReconnectAttempts: 0, socketLastEventAt: Date.now() }));
    socket.io.on('reconnect_error', (err: any) => set({ socketError: err?.message || String(err), socketLastEventAt: Date.now() }));
    socket.io.on('reconnect_failed', () => set({ socketError: 'Reconnection failed — backend may be unreachable.', socketLastEventAt: Date.now() }));

    // ── Event Handlers ──────────────────────────────────────────────────
    socket.on('stats', (data: any) => {
      if (!data || typeof data !== 'object') return;
      get().updateStats({
        messagesToday: data.messages_today ?? data.counters?.messages_today ?? get().stats.messagesToday,
        postsPublished: data.posts_published ?? data.counters?.posts_today ?? get().stats.postsPublished,
        activeUsers: data.active_users ?? data.counters?.active_connections ?? get().stats.activeUsers,
        apiCalls: data.api_calls_today ?? data.counters?.events_emitted ?? get().stats.apiCalls,
        guardianIssues: data.guardian_issues ?? get().stats.guardianIssues,
      });
      if (data.services) get().updateHealth(buildHealthMatrix(data.services));
    });

    socket.on('new_message', (msg: LiveMessage) => {
      if (!get().isStreamPaused) get().addMessage(msg);
      set(s => ({ stats: { ...s.stats, messagesToday: s.stats.messagesToday + 1 } }));
    });

    socket.on('post_published', (post: Post) => {
      get().addPost(post);
      set(s => ({ stats: { ...s.stats, postsPublished: s.stats.postsPublished + 1 } }));
    });

    const handlePayload = (data?: any) => {
      set(s => ({ stats: { ...s.stats, apiCalls: s.stats.apiCalls + 1 } }));
      if (data && typeof data === 'object') {
        get().addPayload({
          id: data.id || `req_${Math.floor(Math.random() * 900000 + 100000)}`,
          time: data.time || new Date().toLocaleTimeString(),
          method: data.method || 'POST',
          endpoint: data.endpoint || data.path || '/api/v1/webhook',
          status: data.status || 200,
          latency: data.latency || `${Math.floor(Math.random() * 200 + 50)}ms`,
          type: data.type || 'inbound',
          request: data.request || data.payload || data,
          response: data.response || {},
        });
      }
    };
    socket.on('api_payload', handlePayload);
    socket.on('api_call', handlePayload);
    socket.on('payload', handlePayload);
    socket.on('traffic', handlePayload);

    socket.on('payload_inbound', (data?: any) => {
      if (data) handlePayload({ ...data, type: 'inbound', endpoint: data.endpoint || '/webhook/facebook' });
    });

    socket.on('service_status', (healthUpdates: SystemHealth[]) => get().updateHealth(healthUpdates));

    socket.on('scan_complete', (data: any) => {
      get().addAlert({
        id: data.id || `scan_${Date.now()}`,
        severity: data.severity || (data.critical > 0 ? 'CRITICAL' : 'HIGH'),
        title: data.title || `Scan complete — ${data.findings ?? 0} finding(s)`,
        time: data.time || Date.now(),
      });
      set(s => ({ stats: { ...s.stats, guardianIssues: s.stats.guardianIssues + 1 } }));
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, socketConnected: false, socketTransport: null, socketError: null, socketReconnectAttempts: 0 });
    }
  },

  // ── Live Data ────────────────────────────────────────────────────────────

  messages: [],
  addMessage: (msg) => set(state => ({ messages: [msg, ...state.messages].slice(0, MAX_MESSAGES) })),
  isStreamPaused: false,
  setStreamPaused: (paused) => set({ isStreamPaused: paused }),

  healthMatrix: [],
  updateHealth: (updates) => set(state => {
    const newHealth = [...state.healthMatrix];
    updates.forEach(u => {
      const idx = newHealth.findIndex(h => h.id === u.id);
      if (idx !== -1) newHealth[idx] = { ...newHealth[idx], ...u, lastChecked: Date.now() };
      else newHealth.push({ ...u, lastChecked: Date.now() });
    });
    return { healthMatrix: newHealth.slice(0, MAX_HEALTH_MATRIX) };
  }),

  guardianAlerts: [],
  addAlert: (alert) => set(state => ({
    guardianAlerts: [alert, ...state.guardianAlerts].slice(0, MAX_ALERTS),
    lastNotification: { id: `n_${Date.now()}`, type: 'alert', title: alert.title, subtitle: alert.severity, severity: alert.severity },
  })),

  recentPosts: [],
  addPost: (post) => set(state => ({
    recentPosts: [post, ...state.recentPosts].slice(0, MAX_POSTS),
    lastNotification: { id: `n_${Date.now()}`, type: 'post', title: post.title, subtitle: post.platform },
  })),

  payloads: [],
  addPayload: (payload) => set(state => ({ payloads: [payload, ...state.payloads].slice(0, MAX_PAYLOADS) })),

  // ── Notifications ────────────────────────────────────────────────────────

  lastNotification: null,
  dismissNotification: () => set({ lastNotification: null }),
  triggerNotification: (n) => {
    const mappedType = ['success', 'info', 'warning'].includes(n.type) ? 'message' : n.type;
    set({
      lastNotification: {
        id: Math.random().toString(36).substring(7),
        type: mappedType as 'alert' | 'post' | 'message' | 'payload',
        title: n.title,
        subtitle: n.subtitle || n.message || '',
        severity: n.severity,
      },
    });
  },

  // ── Stats ────────────────────────────────────────────────────────────────

  stats: { messagesToday: 0, postsPublished: 0, activeUsers: 0, apiCalls: 0, guardianIssues: 0, revenueMonthly: 0 },
  updateStats: (partial) => set(state => ({ stats: { ...state.stats, ...partial } })),

  // ── UI State ─────────────────────────────────────────────────────────────

  isTerminalOpen: false,
  toggleTerminal: () => set(state => ({ isTerminalOpen: !state.isTerminalOpen })),
  pendingCommand: null,
  setPendingCommand: (cmd) => set({ pendingCommand: cmd }),

  personaMood: (localStorage.getItem('persona_mood') as AppState['personaMood']) || 'analytical',
  setPersonaMood: (mood) => {
    localStorage.setItem('persona_mood', mood);
    set({ personaMood: mood });
  },

  // ── Latency ──────────────────────────────────────────────────────────────

  latencyHistory: [],
  pushLatency: (ms) => set(state => ({ latencyHistory: [...state.latencyHistory.slice(-(MAX_LATENCY_HISTORY - 1)), ms] })),

  // ── HTTP Logs ────────────────────────────────────────────────────────────

  httpLogs: [],
  addHttpLog: (log) => set(state => ({ httpLogs: [log, ...state.httpLogs].slice(0, MAX_HTTP_LOGS) })),
  clearHttpLogs: () => set({ httpLogs: [] }),

  // ── Data Fetching ────────────────────────────────────────────────────────

  fetchInitialData: async () => {
    const { restEndpoint, masterToken } = get();
    const baseUrl = restEndpoint.replace(/\/+$/, '');
    const headers = getAuthHeaders(masterToken);
    let loadedLive = false;

    // Supabase fallback
    if (isSupabaseConfigured()) {
      try {
        const tables = ['messages', 'posts', 'alerts', 'payloads'] as const;
        for (const table of tables) {
          const { data } = await supabase.from(table).select('*').limit(20);
          if (data?.length) {
            if (table === 'messages') set({ messages: data as any });
            if (table === 'posts') set({ recentPosts: data as any });
            if (table === 'alerts') set({ guardianAlerts: data as any });
            if (table === 'payloads') set({ payloads: data as any });
            loadedLive = true;
          }
        }
      } catch { /* silent */ }
    }

    // REST endpoints
    if (restEndpoint && masterToken) {
      try {
        const endpoints = [
          { path: '/dashboard/live', handler: (d: any) => get().updateStats({
            messagesToday: d.messages_today ?? d.counters?.messages_today ?? 0,
            postsPublished: d.posts_published ?? d.counters?.posts_today ?? 0,
            activeUsers: d.active_users ?? d.counters?.active_connections ?? 0,
            apiCalls: d.api_calls_today ?? d.counters?.events_emitted ?? 0,
          })},
          { path: '/messages', handler: (d: any) => { if (d?.messages?.length) set({ messages: d.messages }); }},
          { path: '/posts', handler: (d: any) => { if (d?.posts?.length) set({ recentPosts: d.posts }); }},
          { path: '/health/deep', handler: (d: any) => { if (d?.services) set({ healthMatrix: buildHealthMatrix(d.services) }); }},
        ];

        for (const ep of endpoints) {
          const res = await fetch(`${baseUrl}${ep.path}`, { headers }).catch(() => null);
          if (res?.ok) {
            const data = await res.json();
            ep.handler(data);
            loadedLive = true;
          }
        }
      } catch { /* silent */ }
    }

    set({ isUsingLiveBackendData: loadedLive });
  },

  backendConfig: null,
  realtimeChannel: null,
  pollingTimer: null,

  startRealtimeSubscriptions: () => {
    get().stopRealtimeSubscriptions();
    const { restEndpoint, masterToken } = get();
    const baseUrl = restEndpoint.replace(/\/+$/, '');
    const headers = getAuthHeaders(masterToken);

    // Initial status fetch
    fetch(`${baseUrl}/status`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) set({ backendConfig: data }); })
      .catch(() => {});

    // Polling
    const timer = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const [sr, hr] = await Promise.allSettled([
          fetch(`${baseUrl}/dashboard/live`, { headers }),
          fetch(`${baseUrl}/health/deep`, { headers }),
        ]);
        if (sr.status === 'fulfilled' && sr.value.ok) {
          const d = await sr.value.json();
          get().updateStats({
            messagesToday: d.messages_today ?? get().stats.messagesToday,
            postsPublished: d.posts_published ?? get().stats.postsPublished,
            activeUsers: d.active_users ?? get().stats.activeUsers,
            apiCalls: d.api_calls_today ?? get().stats.apiCalls,
          });
          set({ isUsingLiveBackendData: true });
        }
        if (hr.status === 'fulfilled' && hr.value.ok) {
          const hd = await hr.value.json();
          if (hd?.services) set({ healthMatrix: buildHealthMatrix(hd.services) });
        }
      } catch { /* ignore */ }
    }, POLLING_INTERVAL);
    set({ pollingTimer: timer });

    // Supabase realtime
    if (!isSupabaseConfigured()) return;
    const channel = supabase
      .channel('kanyoza-live-v3')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: row }: any) => {
        if (!get().isStreamPaused) {
          get().addMessage({
            id: String(row.id || `msg_${Date.now()}`),
            user: row.sender_id || row.user || 'User',
            avatar: row.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.sender_id || 'User')}&background=4F46E5&color=fff`,
            message: row.content || row.text || row.message || '',
            time: new Date(row.created_at || Date.now()).getTime(),
            sentiment: row.sentiment || 'neutral',
          });
        }
        set(s => ({ stats: { ...s.stats, messagesToday: s.stats.messagesToday + 1 } }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, ({ new: row }: any) => {
        get().addPost({
          id: String(row.id || `p_${Date.now()}`),
          title: row.title || row.content || 'New Post',
          platform: row.platform || 'facebook',
          time: new Date(row.created_at || Date.now()).getTime(),
          engagement: row.engagement || 0,
          thumbnail: row.thumbnail || '',
        });
        set(s => ({ stats: { ...s.stats, postsPublished: s.stats.postsPublished + 1 } }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, ({ new: row }: any) => {
        get().addAlert({
          id: String(row.id || `a_${Date.now()}`),
          severity: row.severity || 'MEDIUM',
          title: row.title || row.message || 'Security Alert',
          time: new Date(row.created_at || Date.now()).getTime(),
        });
        set(s => ({ stats: { ...s.stats, guardianIssues: s.stats.guardianIssues + 1 } }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payloads' }, ({ new: row }: any) => {
        get().addPayload({
          id: String(row.id || `req_${Date.now()}`),
          time: new Date(row.created_at || Date.now()).toLocaleTimeString(),
          method: row.method || 'POST',
          endpoint: row.endpoint || '/api/v1/webhook',
          status: row.status || 200,
          latency: row.latency || '100ms',
          type: row.type || 'inbound',
          request: row.request || {},
          response: row.response || {},
        });
      })
      .subscribe();
    set({ realtimeChannel: channel });
  },

  stopRealtimeSubscriptions: () => {
    const { realtimeChannel, pollingTimer } = get();
    if (pollingTimer) { clearInterval(pollingTimer); set({ pollingTimer: null }); }
    if (realtimeChannel) { supabase.removeChannel(realtimeChannel); set({ realtimeChannel: null }); }
  },

  // ── Reset ────────────────────────────────────────────────────────────────

  resetData: () => set({
    messages: [], recentPosts: [], guardianAlerts: [], payloads: [],
    healthMatrix: [],
    stats: { messagesToday: 0, postsPublished: 0, activeUsers: 0, apiCalls: 0, guardianIssues: 0, revenueMonthly: 0 },
    latencyHistory: [], httpLogs: [],
    lastNotification: null,
  }),
}));
