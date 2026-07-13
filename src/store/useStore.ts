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

interface AppState {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;

  theme: 'dark' | 'light';
  toggleTheme: () => void;

  currentTenant: string;
  setCurrentTenant: (tenant: string) => void;

  selectedWorkspaceId: string | number | null;
  setSelectedWorkspaceId: (id: string | number | null) => void;
  selectedBrandId: string | number | null;
  setSelectedBrandId: (id: string | number | null) => void;
  
  wsEndpoint: string;
  restEndpoint: string;
  masterToken: string;
  setConnectionParams: (params: { wsEndpoint?: string; restEndpoint?: string; masterToken?: string }) => void;

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
  setServiceKeys: (keys: { supabaseUrl?: string; supabaseAnonKey?: string; geminiKey?: string; githubToken?: string; githubRepo?: string; githubBranch?: string; fbPageId?: string; fbVerifyToken?: string; fbPageAccessToken?: string; fbAppSecret?: string }) => void;

  socket: Socket | null;
  socketConnected: boolean;
  socketTransport: 'polling' | 'websocket' | null;
  socketError: string | null;
  socketReconnectAttempts: number;
  socketLastEventAt: number | null;
  connectSocket: () => void;
  disconnectSocket: () => void;

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

  lastNotification: LiveNotification | null;
  dismissNotification: () => void;
  triggerNotification: (n: TriggerNotificationInput) => void;

  stats: {
    messagesToday: number;
    postsPublished: number;
    activeUsers: number;
    apiCalls: number;
    guardianIssues: number;
    revenueMonthly: number;
  };
  updateStats: (partial: Partial<AppState['stats']>) => void;

  isTerminalOpen: boolean;
  toggleTerminal: () => void;
  pendingCommand: string | null;
  setPendingCommand: (cmd: string | null) => void;

  personaMood: 'analytical' | 'professional' | 'creative' | 'urgent';
  setPersonaMood: (mood: AppState['personaMood']) => void;

  latencyHistory: number[];
  pushLatency: (ms: number) => void;

  httpLogs: HttpLog[];
  addHttpLog: (log: HttpLog) => void;
  clearHttpLogs: () => void;

  fetchInitialData: () => Promise<void>;

  backendConfig: Record<string, any> | null;
  realtimeChannel: any;
  pollingTimer: ReturnType<typeof setInterval> | null;
  startRealtimeSubscriptions: () => void;
  stopRealtimeSubscriptions: () => void;
}

const INITIAL_HEALTH: SystemHealth[] = [];

export const useStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  login: () => {
  // Fix corrupted restEndpoint in localStorage (remove duplicate /api/v1)
  const stored = localStorage.getItem('rest_endpoint');
  if (stored && stored.includes('/api/v1')) {
    localStorage.setItem('rest_endpoint', stored.replace(/\/api\/v1\/?$/, ''));
  }
  set({ isAuthenticated: true });
},
  logout: () => {
    get().disconnectSocket();
    get().stopRealtimeSubscriptions();
    
    // Security: Clear sensitive keys from localStorage on logout
    const keysToRemove = [
      'master_token', 'supabase_url', 'supabase_anon_key', 'gemini_key',
      'github_token', 'github_repo', 'github_branch', 'fb_page_id',
      'fb_verify_token', 'fb_page_access_token', 'fb_app_secret',
      'kanyoza_authenticated'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    set({ 
      isAuthenticated: false,
      masterToken: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
      geminiKey: '',
      githubToken: '',
      fbPageAccessToken: '',
      fbAppSecret: ''
    });
  },

  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    set({ theme: next });
  },

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

  wsEndpoint: localStorage.getItem('ws_endpoint') || import.meta.env.VITE_WS_ENDPOINT || 'wss://kanyoza-systems-bot.onrender.com',
  restEndpoint: localStorage.getItem('rest_endpoint') || import.meta.env.VITE_REST_ENDPOINT || 'https://kanyoza-systems-bot.onrender.com/api/v1',
  masterToken: localStorage.getItem('master_token') || import.meta.env.VITE_MASTER_TOKEN || '',
  setConnectionParams: (params) => {
  const previousWsEndpoint = get().wsEndpoint;

  if (params.wsEndpoint !== undefined) localStorage.setItem('ws_endpoint', params.wsEndpoint);
  if (params.restEndpoint !== undefined) localStorage.setItem('rest_endpoint', params.restEndpoint);
  if (params.masterToken !== undefined) localStorage.setItem('master_token', params.masterToken);

  set((state) => ({ ...state, ...params }));
  
  // Re-fetch all data with new credentials
  get().fetchInitialData();

  if (params.wsEndpoint && params.wsEndpoint !== previousWsEndpoint) {
    get().disconnectSocket();
    get().connectSocket();
  }
},

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
    if (keys.supabaseUrl !== undefined) localStorage.setItem('supabase_url', keys.supabaseUrl);
    if (keys.supabaseAnonKey !== undefined) localStorage.setItem('supabase_anon_key', keys.supabaseAnonKey);
    if (keys.geminiKey !== undefined) localStorage.setItem('gemini_key', keys.geminiKey);
    if (keys.githubToken !== undefined) localStorage.setItem('github_token', keys.githubToken);
    if (keys.githubRepo !== undefined) localStorage.setItem('github_repo', keys.githubRepo);
    if (keys.githubBranch !== undefined) localStorage.setItem('github_branch', keys.githubBranch);
    if (keys.fbPageId !== undefined) localStorage.setItem('fb_page_id', keys.fbPageId);
    if (keys.fbVerifyToken !== undefined) localStorage.setItem('fb_verify_token', keys.fbVerifyToken);
    if (keys.fbPageAccessToken !== undefined) localStorage.setItem('fb_page_access_token', keys.fbPageAccessToken);
    if (keys.fbAppSecret !== undefined) localStorage.setItem('fb_app_secret', keys.fbAppSecret);

    set((state) => ({ ...state, ...keys }));
    refreshSupabaseClient();
    get().fetchInitialData();
  },

  socket: null,
  socketConnected: false,
  socketTransport: null,
  socketError: null,
  socketReconnectAttempts: 0,
  socketLastEventAt: null,
  connectSocket: () => {
    if (get().socket) return;
    
    const rawBase = get().wsEndpoint.replace(/\/+$/, '');
    const base = rawBase
      .replace(/^wss:\/\//i, 'https://')
      .replace(/^ws:\/\//i,  'http://');
    const socket = io(`${base}/dashboard`, {
      transports: ['polling', 'websocket'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      auth: {
        token: get().masterToken
      }
    });

    socket.on('connect', () => {
      const transport = socket.io.engine?.transport?.name === 'websocket' ? 'websocket' : 'polling';
      set({
        socketConnected: true,
        socketError: null,
        socketReconnectAttempts: 0,
        socketTransport: transport,
        socketLastEventAt: Date.now(),
      });
    });

    socket.io.engine?.on?.('upgrade', (transport: any) => {
      set({ socketTransport: transport?.name === 'websocket' ? 'websocket' : 'polling' });
    });

    socket.on('disconnect', (reason: string) => {
      set({
        socketConnected: false,
        socketTransport: null,
        socketError: `Disconnected: ${reason}`,
        socketLastEventAt: Date.now(),
      });
    });

    socket.on('connect_error', (err: any) => {
      const message = err?.message || String(err) || 'Unknown connection error';
      set({
        socketConnected: false,
        socketError: message,
        socketLastEventAt: Date.now(),
      });
    });

    socket.io.on('reconnect_attempt', (attempt: number) => {
      set({ socketReconnectAttempts: attempt, socketLastEventAt: Date.now() });
    });

    socket.io.on('reconnect', (attempt: number) => {
      set({
        socketConnected: true,
        socketError: null,
        socketReconnectAttempts: 0,
        socketLastEventAt: Date.now(),
      });
    });

    socket.io.on('reconnect_error', (err: any) => {
      const message = err?.message || String(err) || 'Reconnect error';
      set({ socketError: message, socketLastEventAt: Date.now() });
    });

    socket.io.on('reconnect_failed', () => {
      set({
        socketError: 'Reconnection failed — max attempts reached. Backend may be unreachable or crashed.',
        socketLastEventAt: Date.now(),
      });
    });
    
    socket.on('stats', (data: any) => {
      if (!data || typeof data !== 'object') return;
      const c = data.counters || {};
      const a = data.analytics || {};
      get().updateStats({
        messagesToday:  data.messages_today   ?? a.messages_today  ?? c.messages_today  ?? get().stats.messagesToday,
        postsPublished: data.posts_published  ?? a.posts_published ?? c.posts_today      ?? get().stats.postsPublished,
        activeUsers:    data.active_users     ?? c.active_connections                    ?? get().stats.activeUsers,
        apiCalls:       data.api_calls_today  ?? c.events_emitted                        ?? get().stats.apiCalls,
        guardianIssues: data.guardian_issues  ?? get().stats.guardianIssues,
      });
      if (data.services && typeof data.services === 'object') {
        const matrix: SystemHealth[] = Object.entries(data.services).map(([name, svc]: [string, any]) => ({
          id:          name,
          name:        (svc as any).page_name || name.charAt(0).toUpperCase() + name.slice(1),
          status:      (svc as any).status === 'ok' ? 'online' : (svc as any).status === 'degraded' ? 'degraded' : 'offline',
          latency:     (svc as any).latency_ms ?? 0,
          lastChecked: Date.now(),
          uptime:      (svc as any).status === 'ok' ? 99.9 : (svc as any).status === 'degraded' ? 85.0 : 0,
        })) as SystemHealth[];
        get().updateHealth(matrix);
      }
    });

    socket.on('new_message', (msg: LiveMessage) => {
      if (!get().isStreamPaused) {
        get().addMessage(msg);
      }
      set(state => ({ stats: { ...state.stats, messagesToday: state.stats.messagesToday + 1 } }));
    });

    socket.on('post_published', (post: Post) => {
      get().addPost(post);
      set(state => ({ stats: { ...state.stats, postsPublished: state.stats.postsPublished + 1 } }));
    });

    const _handleApiPayload = (data?: any) => {
       set(state => ({ stats: { ...state.stats, apiCalls: state.stats.apiCalls + 1 } }));
       if (data && typeof data === 'object') {
         get().addPayload({
           id:       data.id       || `req_${Math.floor(Math.random() * 900000 + 100000)}`,
           time:     data.time     || new Date().toLocaleTimeString(),
           method:   data.method   || 'POST',
           endpoint: data.endpoint || data.path || '/api/v1/webhook',
           status:   data.status   || 200,
           latency:  data.latency  || `${Math.floor(Math.random() * 200 + 50)}ms`,
           type:     data.type     || 'inbound',
           request:  data.request  || {},
           response: data.response || {}
         });
       }
    };
    socket.on('api_payload', _handleApiPayload);
    socket.on('api_call',    _handleApiPayload);

    socket.on('payload_inbound', (data?: any) => {
      if (data && typeof data === 'object') {
        get().addPayload({
          id:       data.id       || `fb_${Math.floor(Math.random() * 900000 + 100000)}`,
          time:     data.time     || new Date().toLocaleTimeString(),
          method:   'POST',
          endpoint: data.endpoint || '/webhook/facebook',
          status:   data.status   || 200,
          latency:  data.latency  || '0ms',
          type:     'inbound',
          request:  data.payload  || data.request || data,
          response: data.response || {},
        });
      }
    });

    socket.on('payload', (data?: any) => {
       if (data && typeof data === 'object') {
         get().addPayload(data);
       }
    });

    socket.on('traffic', (data?: any) => {
       if (data && typeof data === 'object') {
         get().addPayload(data);
       }
    });

    socket.on('service_status', (healthUpdates: SystemHealth[]) => {
      get().updateHealth(healthUpdates);
    });

    socket.on('scan_complete', (data: any) => {
      const alert: GuardianAlert = {
        id:       data.id       || data.scan_id || `scan_${Date.now()}`,
        severity: data.severity || (data.critical > 0 ? 'CRITICAL' : data.high > 0 ? 'HIGH' : 'MEDIUM'),
        title:    data.title    || data.summary || `Scan complete — ${data.findings ?? 0} finding(s)`,
        time:     data.time     || Date.now(),
      };
      get().addAlert(alert);
      set(state => ({ stats: { ...state.stats, guardianIssues: state.stats.guardianIssues + 1 } }));
    });

    set({ socket });
  },
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({
        socket: null,
        socketConnected: false,
        socketTransport: null,
        socketError: null,
        socketReconnectAttempts: 0,
      });
    }
  },

  messages: [],
  addMessage: (msg) => set(state => ({ 
    messages: [msg, ...state.messages].slice(0, 20) 
  })),
  isStreamPaused: false,
  setStreamPaused: (paused) => set({ isStreamPaused: paused }),

  healthMatrix: INITIAL_HEALTH,
  updateHealth: (updates) => set(state => {
    const newHealth = [...state.healthMatrix];
    updates.forEach(u => {
      const idx = newHealth.findIndex(h => h.id === u.id);
      if (idx !== -1) newHealth[idx] = { ...newHealth[idx], ...u };
    });
    return { healthMatrix: newHealth };
  }),

  guardianAlerts: [],
  addAlert: (alert) => set(state => ({
    guardianAlerts: [alert, ...state.guardianAlerts].slice(0, 50),
    lastNotification: {
      id:       `n_${Date.now()}`,
      type:     'alert',
      title:    alert.title,
      subtitle: alert.severity,
      severity: alert.severity,
    },
  })),

  recentPosts: [],
  addPost: (post) => set(state => ({
    recentPosts: [post, ...state.recentPosts].slice(0, 20),
    lastNotification: {
      id:       `n_${Date.now()}`,
      type:     'post',
      title:    post.title,
      subtitle: post.platform,
    },
  })),

  payloads: [],
  addPayload: (payload) => set(state => ({
    payloads: [payload, ...state.payloads].slice(0, 50)
  })),

  lastNotification: null,
  dismissNotification: () => set({ lastNotification: null }),
  triggerNotification: (n) => {
    const mappedType = 
      n.type === 'success' || n.type === 'info' || n.type === 'warning'
        ? 'message'
        : n.type;
    const finalSubtitle = n.subtitle || n.message || '';
    set({
      lastNotification: {
        id: Math.random().toString(36).substring(7),
        type: mappedType as 'alert' | 'post' | 'message' | 'payload',
        title: n.title,
        subtitle: finalSubtitle,
        severity: n.severity,
      }
    });
  },

  stats: {
    messagesToday: 0,
    postsPublished: 0,
    activeUsers: 0,
    apiCalls: 0,
    guardianIssues: 0,
    revenueMonthly: 0,
  },
  updateStats: (partial) => set(state => ({ stats: { ...state.stats, ...partial } })),

  isTerminalOpen: false,
  toggleTerminal: () => set(state => ({ isTerminalOpen: !state.isTerminalOpen })),
  pendingCommand: null,
  setPendingCommand: (cmd) => set({ pendingCommand: cmd }),

  personaMood: (localStorage.getItem('persona_mood') as AppState['personaMood']) || 'analytical',
  setPersonaMood: (mood) => {
    localStorage.setItem('persona_mood', mood);
    set({ personaMood: mood });
  },

  latencyHistory: [],
  pushLatency: (ms) => set(state => ({
    latencyHistory: [...state.latencyHistory.slice(-59), ms],
  })),

  httpLogs: [],
  addHttpLog: (log) => set(state => ({
    httpLogs: [log, ...state.httpLogs].slice(0, 50)
  })),
  clearHttpLogs: () => set({ httpLogs: [] }),

  fetchInitialData: async () => {
    const { restEndpoint, masterToken } = get();
    let loadedLive = false;

    if (!masterToken) {
      // Missing token handled by UI
    }

    if (isSupabaseConfigured()) {
      try {
        const { data: supaMsgs } = await supabase.from('messages').select('*').limit(20);
        if (supaMsgs && supaMsgs.length > 0) {
          set({ messages: supaMsgs });
          loadedLive = true;
        }

        const { data: supaPosts } = await supabase.from('posts').select('*').limit(20);
        if (supaPosts && supaPosts.length > 0) {
          set({ recentPosts: supaPosts });
          loadedLive = true;
        }

        const { data: supaAlerts } = await supabase.from('alerts').select('*').limit(20);
        if (supaAlerts && supaAlerts.length > 0) {
          set({ guardianAlerts: supaAlerts });
          loadedLive = true;
        }

        const { data: supaPayloads } = await supabase.from('payloads').select('*').limit(20);
        if (supaPayloads && supaPayloads.length > 0) {
          set({ payloads: supaPayloads });
          loadedLive = true;
        }
      } catch (err) {
        // Suppress warning
      }
    }

    if (restEndpoint) {
      try {
        const baseUrl = restEndpoint.endsWith('/') ? restEndpoint.slice(0, -1) : restEndpoint;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (masterToken) {
          headers['Authorization'] = `Bearer ${masterToken}`;
          headers['X-API-Token'] = masterToken;
          headers['x-api-key'] = masterToken;
        }

        const statsRes = await fetch(`${baseUrl}/dashboard/live`, { headers }).catch(() => null);
        if (statsRes && statsRes.ok) {
          const d = await statsRes.json();
          if (d) {
            const c = d.counters || {};
            const a = d.analytics || {};
            get().updateStats({
              messagesToday:  d.messages_today  ?? a.messages_today  ?? c.messages_today   ?? 0,
              postsPublished: d.posts_published ?? a.posts_published ?? c.posts_today       ?? 0,
              activeUsers:    d.active_users    ?? c.active_connections                     ?? 0,
              apiCalls:       d.api_calls_today ?? c.events_emitted                         ?? 0,
              guardianIssues: d.guardian_issues                                             ?? 0,
            });
            loadedLive = true;
          }
        }

        const msgsRes = await fetch(`${baseUrl}/messages`, { headers }).catch(() => null);
        if (msgsRes && msgsRes.ok) {
          const msgsData = await msgsRes.json();
          const msgs = Array.isArray(msgsData)
            ? msgsData
            : Array.isArray(msgsData?.messages)
              ? msgsData.messages
              : null;
          if (msgs && msgs.length > 0) {
            set({ messages: msgs });
            loadedLive = true;
          }
        }

        const postsRes = await fetch(`${baseUrl}/posts`, { headers }).catch(() => null);
        if (postsRes && postsRes.ok) {
          const postsData = await postsRes.json();
          const posts = Array.isArray(postsData)
            ? postsData
            : Array.isArray(postsData?.posts)
              ? postsData.posts
              : null;
          if (posts && posts.length > 0) {
            set({ recentPosts: posts });
            loadedLive = true;
          }
        }

        const healthRes = await fetch(`${baseUrl}/health/deep`, { headers }).catch(() => null);
        if (healthRes && healthRes.ok) {
          const healthData = await healthRes.json();
          if (healthData?.services && typeof healthData.services === 'object') {
            const matrix: SystemHealth[] = Object.entries(healthData.services).map(([name, svc]: [string, any]) => ({
              id:           name,
              name:         svc.page_name || name.charAt(0).toUpperCase() + name.slice(1),
              status:       svc.status === 'ok' ? 'online' : svc.status === 'degraded' ? 'degraded' : 'offline',
              latency:      svc.latency_ms ?? 0,
              lastChecked:  Date.now(),
              uptime:       svc.status === 'ok' ? 99.9 : svc.status === 'degraded' ? 85.0 : 0,
            }));
            set({ healthMatrix: matrix });
            loadedLive = true;
          }
        }
      } catch (err) {
        // Suppress warning
      }
    }

    set({ isUsingLiveBackendData: loadedLive });
  },

  backendConfig: null,
  realtimeChannel: null,
  pollingTimer: null,

  startRealtimeSubscriptions: () => {
    get().stopRealtimeSubscriptions();

    const { restEndpoint, masterToken } = get();
    const base = restEndpoint.replace(/\/+$/, '');
    const headers: Record<string, string> = masterToken
      ? { Authorization: `Bearer ${masterToken}` }
      : {};

    fetch(`${base}/status`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) set({ backendConfig: data }); })
      .catch(() => {});

    const timer = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const [sr, hr] = await Promise.allSettled([
          fetch(`${base}/dashboard/live`, { headers }),
          fetch(`${base}/health/deep`,    { headers }),
        ]);
        if (sr.status === 'fulfilled' && sr.value.ok) {
          const d = await sr.value.json();
          get().updateStats({
            messagesToday:  d.messages_today  ?? get().stats.messagesToday,
            postsPublished: d.posts_published ?? get().stats.postsPublished,
            activeUsers:    d.active_users    ?? get().stats.activeUsers,
            apiCalls:       d.api_calls_today ?? get().stats.apiCalls,
            guardianIssues: d.guardian_issues ?? get().stats.guardianIssues,
          });
          set({ isUsingLiveBackendData: true });
        }
        if (hr.status === 'fulfilled' && hr.value.ok) {
          const hd = await hr.value.json();
          if (hd?.services && typeof hd.services === 'object') {
            const matrix: SystemHealth[] = Object.entries(hd.services).map(([name, svc]: [string, any]) => ({
              id:          name,
              name:        svc.page_name || name.charAt(0).toUpperCase() + name.slice(1),
              status:      svc.status === 'ok' ? 'online' : svc.status === 'degraded' ? 'degraded' : 'offline',
              latency:     svc.latency_ms ?? 0,
              lastChecked: Date.now(),
              uptime:      svc.status === 'ok' ? 99.9 : svc.status === 'degraded' ? 85.0 : 0,
            }));
            set({ healthMatrix: matrix });
          }
        }
      } catch { /* ignore */ }
    }, 120_000);

    set({ pollingTimer: timer });

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('kanyoza-live-v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: row }: any) => {
        if (!get().isStreamPaused) {
          get().addMessage({
            id:        String(row.id    || `msg_${Date.now()}`),
            user:      row.sender_id   || row.user     || 'Facebook User',
            avatar:    row.avatar      || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.sender_id || 'User')}&background=4F46E5&color=fff`,
            message:   row.content     || row.text     || row.message || '',
            time:      new Date(row.created_at || Date.now()).getTime(),
            sentiment: row.sentiment   || 'neutral',
          });
        }
        set(s => ({ stats: { ...s.stats, messagesToday: s.stats.messagesToday + 1 } }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, ({ new: row }: any) => {
        get().addPost({
          id:         String(row.id         || `p_${Date.now()}`),
          title:      row.title      || row.content || 'New Post',
          platform:   row.platform   || 'facebook',
          time:       new Date(row.created_at || Date.now()).getTime(),
          engagement: row.engagement || 0,
          thumbnail:  row.thumbnail  || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=150&q=80',
        });
        set(s => ({ stats: { ...s.stats, postsPublished: s.stats.postsPublished + 1 } }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, ({ new: row }: any) => {
        get().addAlert({
          id:       String(row.id       || `a_${Date.now()}`),
          severity: row.severity || 'MEDIUM',
          title:    row.title    || row.message || 'Security Alert',
          time:     new Date(row.created_at || Date.now()).getTime(),
        });
        set(s => ({ stats: { ...s.stats, guardianIssues: s.stats.guardianIssues + 1 } }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payloads' }, ({ new: row }: any) => {
        get().addPayload({
          id:       String(row.id       || `req_${Date.now()}`),
          time:     new Date(row.created_at || Date.now()).toLocaleTimeString(),
          method:   row.method   || 'POST',
          endpoint: row.endpoint || '/api/v1/webhook',
          status:   row.status   || 200,
          latency:  row.latency  || '100ms',
          type:     row.type     || 'inbound',
          request:  row.request  || {},
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

}));
