import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  Link, Plus, Trash2, RefreshCw, CheckCircle, XCircle, 
  AlertTriangle, Eye, EyeOff, Globe, Copy, Settings,
  Facebook, Twitter, Linkedin, Instagram, MessageCircle, Send,
  Palette, Bot
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SocialAccount {
  id: string;
  workspace_id: string;
  platform: 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'whatsapp' | 'telegram';
  account_name: string;
  timezone: string;
  enabled: boolean;
  health_status: string;
  last_checked: string | null;
  brand_id?: string;
  access_token?: string;
  refresh_token?: string;
  client_id?: string;
  client_secret?: string;
  page_id?: string;
  page_access_token?: string;
  verify_token?: string;
  app_secret?: string;
  person_urn?: string;
  phone_number_id?: string;
  bot_token?: string;
  platform_config?: Record<string, any>;
  created_at?: string;
}

interface Workspace { id: string; name: string; slug?: string; }
interface Brand { id: string; name: string; }

interface VerifyResult {
  ready_to_publish: boolean;
  summary: string;
  checks: Record<string, { ok: boolean; detail: string }>;
  checked_at: string;
}

const PLATFORM_COLORS: Record<string, { text: string; bg: string; border: string; accent: string }> = {
  facebook: { text: 'text-[#1877F2]', bg: 'bg-[#1877F2]/10', border: 'border-[#1877F2]/20', accent: '#1877F2' },
  twitter: { text: 'text-zinc-200', bg: 'bg-zinc-800/80', border: 'border-zinc-700', accent: '#1DA1F2' },
  linkedin: { text: 'text-[#0A66C2]', bg: 'bg-[#0A66C2]/10', border: 'border-[#0A66C2]/20', accent: '#0A66C2' },
  instagram: { text: 'text-[#E4405F]', bg: 'bg-[#E4405F]/10', border: 'border-[#E4405F]/20', accent: '#E4405F' },
  whatsapp: { text: 'text-[#25D366]', bg: 'bg-[#25D366]/10', border: 'border-[#25D366]/20', accent: '#25D366' },
  telegram: { text: 'text-[#229ED9]', bg: 'bg-[#229ED9]/10', border: 'border-[#229ED9]/20', accent: '#229ED9' },
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook Page', twitter: 'X (Twitter)', linkedin: 'LinkedIn Profile',
  instagram: 'Instagram Business', whatsapp: 'WhatsApp Cloud API', telegram: 'Telegram Bot',
};

const TIMEZONES = ['UTC', 'Africa/Blantyre', 'Africa/Johannesburg', 'Africa/Nairobi', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Dubai'];

const PLATFORM_FIELDS: Record<string, { key: string; label: string; secret: boolean; placeholder: string }[]> = {
  facebook: [
    { key: 'page_id', label: 'Page ID', secret: false, placeholder: 'e.g. 104857291048' },
    { key: 'page_access_token', label: 'Page Access Token', secret: true, placeholder: 'EAArx...' },
    { key: 'verify_token', label: 'Verify Token', secret: true, placeholder: 'Custom verification string' },
    { key: 'app_secret', label: 'App Secret', secret: true, placeholder: 'App secret key' },
  ],
  twitter: [
    { key: 'access_token', label: 'Access Token', secret: true, placeholder: 'OAuth access token' },
    { key: 'refresh_token', label: 'Refresh Token', secret: true, placeholder: 'OAuth refresh token' },
    { key: 'client_id', label: 'Client ID', secret: false, placeholder: 'Twitter Client ID' },
    { key: 'client_secret', label: 'Client Secret', secret: true, placeholder: 'Twitter Client Secret' },
  ],
  linkedin: [
    { key: 'access_token', label: 'Access Token', secret: true, placeholder: 'LinkedIn access token' },
    { key: 'person_urn', label: 'Person URN', secret: false, placeholder: 'urn:li:person:XXXXX' },
  ],
  instagram: [
    { key: 'page_id', label: 'Page ID (via Facebook)', secret: false, placeholder: 'e.g. 1092837492' },
    { key: 'access_token', label: 'Access Token', secret: true, placeholder: 'Graph API Token' },
  ],
  whatsapp: [
    { key: 'phone_number_id', label: 'Phone Number ID', secret: false, placeholder: 'e.g. 265999123456' },
    { key: 'access_token', label: 'Access Token', secret: true, placeholder: 'Permanent Access Token' },
  ],
  telegram: [
    { key: 'bot_token', label: 'Bot Token', secret: true, placeholder: 'e.g. 123456:ABC-def1234ghIkl' },
  ],
};

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook, twitter: Twitter, linkedin: Linkedin,
  instagram: Instagram, whatsapp: MessageCircle, telegram: Send,
};

// Helper to extract credential value from account (top-level field or platform_config)
function getCredential(account: SocialAccount, key: string): string {
  const topLevel = (account as any)[key];
  if (topLevel) return topLevel;
  const pc = account.platform_config || {};
  return pc[key] || '';
}

export default function SocialAccounts() {
  const { restEndpoint, masterToken, socket } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SocialAccount | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SocialAccount | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [modalPlatform, setModalPlatform] = useState<SocialAccount['platform']>('facebook');
  const [modalAccountName, setModalAccountName] = useState('');
  const [modalTimezone, setModalTimezone] = useState('Africa/Blantyre');
  const [modalEnabled, setModalEnabled] = useState(true);
  const [modalBrandId, setModalBrandId] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, VerifyResult>>({});

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const base = restEndpoint.replace(/\/+$/, '');

  const apiFetch = async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
    const token = masterToken || localStorage.getItem('master_token') || '';
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(body || `HTTP ${res.status}`);
    }
    return res.json();
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wsRes = await apiFetch<{ ok: boolean; workspaces: Workspace[] }>('/workspaces');
      const wsList = wsRes.workspaces || [];
      setWorkspaces(wsList);
      if (wsList.length > 0) {
        const activeId = selectedWorkspaceId && wsList.find(w => w.id === selectedWorkspaceId) ? selectedWorkspaceId : wsList[0].id;
        setSelectedWorkspaceId(activeId);
        const [accRes, brRes] = await Promise.all([
          apiFetch<{ ok: boolean; social_accounts: SocialAccount[] }>(`/workspaces/${activeId}/social-accounts`),
          apiFetch<{ ok: boolean; brands: Brand[] }>(`/workspaces/${activeId}/brands`),
        ]);
        setAccounts(accRes.social_accounts || []);
        setBrands(brRes.brands || []);
      } else {
        setAccounts([]);
        setBrands([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [restEndpoint, selectedWorkspaceId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!socket) return;
    const handleVerifyResult = (data: { account_id: string; ready_to_publish: boolean; summary: string; checks: Record<string, { ok: boolean; detail: string }> }) => {
      setVerifyResults(prev => ({ ...prev, [data.account_id]: { ready_to_publish: data.ready_to_publish, summary: data.summary, checks: data.checks, checked_at: new Date().toISOString() } }));
      setVerifyingId(null);
    };
    socket.on('verify_publish_result', handleVerifyResult);
    return () => { socket.off('verify_publish_result', handleVerifyResult); };
  }, [socket]);

  const openNew = () => {
    setEditingAccount(null); setModalPlatform('facebook'); setModalAccountName('');
    setModalTimezone('Africa/Blantyre'); setModalEnabled(true); setModalBrandId('');
    setCredentials({}); setVisibleFields({}); setTestResult(null); setIsModalOpen(true);
  };

  const openEdit = (account: SocialAccount) => {
    setEditingAccount(account);
    setModalPlatform(account.platform);
    setModalAccountName(account.account_name);
    setModalTimezone(account.timezone);
    setModalEnabled(account.enabled);
    setModalBrandId(account.brand_id || '');
    const creds: Record<string, string> = {};
    for (const field of PLATFORM_FIELDS[account.platform]) {
      creds[field.key] = getCredential(account, field.key);
    }
    setCredentials(creds);
    setVisibleFields({});
    setTestResult(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAccountName.trim()) { showToast('error', 'Account name is required'); return; }
    setSaving(true);
    try {
      const payload = { 
        platform: modalPlatform, account_name: modalAccountName.trim(), 
        timezone: modalTimezone, enabled: modalEnabled,
        brand_id: modalBrandId || null,
        ...credentials 
      };
      if (editingAccount) {
        await apiFetch(`/social-accounts/${editingAccount.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/workspaces/${selectedWorkspaceId}/social-accounts`, { method: 'POST', body: JSON.stringify(payload) });
      }
      showToast('success', editingAccount ? 'Account updated' : 'Account connected');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) { showToast('error', err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (account: SocialAccount) => {
    try {
      const creds: Record<string, string> = {};
      for (const field of PLATFORM_FIELDS[account.platform]) {
        creds[field.key] = getCredential(account, field.key);
      }
      const payload = { 
        platform: account.platform, account_name: account.account_name, 
        timezone: account.timezone, enabled: !account.enabled, 
        brand_id: account.brand_id, ...creds 
      };
      await apiFetch(`/social-accounts/${account.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('success', account.enabled ? 'Account disabled' : 'Account enabled');
      loadData();
    } catch (err: any) { showToast('error', err.message || 'Toggle failed'); }
  };

  const handleHealthCheck = async (account: SocialAccount) => {
    setTestingId(account.id);
    try {
      await apiFetch(`/social-accounts/${account.id}/health-check`, { method: 'POST' });
      showToast('success', 'Connection healthy');
      loadData();
    } catch (err: any) { showToast('error', err.message || 'Health check failed'); }
    finally { setTestingId(null); }
  };

  const handleVerifyPublish = async (account: SocialAccount) => {
    setVerifyingId(account.id);
    try {
      const res = await apiFetch<{ ok: boolean; verified: boolean; page_name?: string; summary: string; ready_to_publish: boolean; checks: Record<string, { ok: boolean; detail: string }> }>(`/social-accounts/${account.id}/verify-publish`, { method: 'POST', signal: AbortSignal.timeout(8000) });
      setVerifyResults(prev => ({ ...prev, [account.id]: { ready_to_publish: res.ready_to_publish, summary: res.summary, checks: res.checks, checked_at: new Date().toISOString() } }));
      showToast(res.ready_to_publish ? 'success' : 'error', `${account.account_name}: ${res.summary}`);
    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        showToast('error', 'Verification timed out. Retry or check backend logs.');
      } else {
        showToast('error', err.message || 'Verification failed');
      }
    } finally { setVerifyingId(null); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiFetch(`/social-accounts/${confirmDelete.id}`, { method: 'DELETE' });
      showToast('success', 'Account disconnected');
      setVerifyResults(prev => { const next = { ...prev }; delete next[confirmDelete.id]; return next; });
      setConfirmDelete(null);
      loadData();
    } catch (err: any) { showToast('error', err.message || 'Delete failed'); }
  };

  const handleTestConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      if (editingAccount?.id) {
        await apiFetch(`/social-accounts/${editingAccount.id}/health-check`, { method: 'POST' });
      }
      setTestResult({ status: 'success', message: 'Connection verified' });
    } catch (err: any) { setTestResult({ status: 'error', message: err.message || 'Connection failed' }); }
    finally { setTesting(false); }
  };

  const workspaceAccounts = accounts.filter(a => a.workspace_id === selectedWorkspaceId);
  const getLinkedBrandName = (brandId?: string) => brands.find(b => b.id === brandId)?.name;

  return (
    <div className="relative pb-24 min-h-[calc(100vh-80px)] px-4 md:px-8 pt-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-20 right-6 z-50 px-5 py-3 rounded-xl border text-sm font-bold font-mono shadow-lg", toast.type === 'success' ? "bg-brand-success/10 text-brand-success border-brand-success/30" : "bg-brand-danger/10 text-brand-danger border-brand-danger/30")}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertTriangle className="w-4 h-4 inline mr-2" />}{toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight flex items-center gap-3">
            <Link className="w-8 h-8 text-brand-primary" /> Social Accounts
            <span className="ml-2 text-xs font-mono font-bold bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-2.5 py-1 rounded-full uppercase">{workspaceAccounts.length} Connected</span>
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">OMNICHANNEL OUTBOUND DISTRIBUTION</p>
        </div>
        <div className="flex flex-col min-w-[240px]">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-1.5">Active Workspace</label>
          {loading && workspaces.length === 0 ? (
            <div className="h-10 bg-brand-surface animate-pulse border border-brand-border rounded-xl w-full" />
          ) : (
            <select value={selectedWorkspaceId} onChange={e => setSelectedWorkspaceId(e.target.value)}
              className="bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text font-bold uppercase tracking-wider focus:outline-none focus:border-brand-primary cursor-pointer w-full">
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (<div key={i} className="bg-brand-surface border border-brand-border rounded-2xl p-6 animate-pulse space-y-4">
            <div className="flex justify-between"><div className="w-12 h-12 bg-brand-elevated rounded-xl" /><div className="w-20 h-6 bg-brand-elevated rounded-md" /></div>
            <div className="h-5 bg-brand-elevated rounded w-2/3" /><div className="h-4 bg-brand-elevated rounded w-1/2" />
            <div className="pt-4 border-t border-brand-border/40 space-y-2"><div className="h-3 bg-brand-elevated rounded w-3/4" /><div className="h-3 bg-brand-elevated rounded w-1/2" /></div>
          </div>))}
        </div>
      ) : error ? (
        <div className="py-16 text-center border border-brand-border rounded-2xl bg-brand-surface space-y-4">
          <AlertTriangle className="w-12 h-12 text-brand-danger mx-auto" />
          <h3 className="text-lg font-bold text-brand-text">Connection Failed</h3>
          <p className="text-brand-text-muted text-xs font-mono max-w-md mx-auto">{error}</p>
          <button onClick={loadData} className="px-5 py-2.5 bg-brand-elevated border border-brand-border text-brand-text text-xs font-bold uppercase rounded-xl hover:bg-brand-surface transition-all">Retry</button>
        </div>
      ) : workspaceAccounts.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-brand-border rounded-2xl bg-brand-surface">
          <Link className="w-14 h-14 text-brand-border mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-bold text-brand-text mb-2">No Connected Channels</h3>
          <p className="text-brand-text-muted text-sm max-w-md mx-auto mb-8">No social accounts connected to this workspace. Connect your first account to start publishing.</p>
          <button onClick={openNew} className="px-6 py-3 bg-brand-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-glow-primary hover:bg-brand-primary/90 transition-all">Connect First Account</button>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {workspaceAccounts.map(account => {
              const Icon = PLATFORM_ICONS[account.platform];
              const colors = PLATFORM_COLORS[account.platform];
              const linkedBrand = getLinkedBrandName(account.brand_id);
              const verifyResult = verifyResults[account.id];
              return (
                <motion.div key={account.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className={cn("bg-brand-surface border border-brand-border rounded-2xl p-6 hover:border-brand-primary/30 transition-all", !account.enabled && "opacity-60")}>
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className={cn("p-3 rounded-xl", colors.bg, colors.text)}><Icon className="w-6 h-6" /></div>
                    <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-md font-mono",
                      account.health_status === 'healthy' && "bg-brand-success/15 text-brand-success border-brand-success/30",
                      account.health_status === 'unhealthy' && "bg-brand-danger/15 text-brand-danger border-brand-danger/30",
                      (!account.health_status || account.health_status === 'unknown') && "bg-brand-border text-brand-text-muted")}>{account.health_status || 'Unknown'}</span>
                  </div>
                  <h3 className="font-bold text-lg text-brand-text truncate">{account.account_name}</h3>
                  <p className="text-xs text-brand-text-muted font-bold font-mono uppercase mb-1">{PLATFORM_LABELS[account.platform]}</p>
                  {linkedBrand && (
                    <p className="text-xs text-brand-primary font-mono flex items-center gap-1 mb-3">
                      <Palette className="w-3 h-3" /> {linkedBrand}
                    </p>
                  )}
                  <div className="space-y-2 pt-4 border-t border-brand-border/50 text-xs font-mono text-brand-text-muted">
                    <div className="flex justify-between"><span className="uppercase text-[10px]">Timezone:</span><span className="text-brand-text font-bold">{account.timezone}</span></div>
                    <div className="flex justify-between"><span className="uppercase text-[10px]">Checked:</span><span className="text-brand-text">{account.last_checked ? new Date(account.last_checked).toLocaleTimeString() : 'Never'}</span></div>
                    <div className="flex justify-between"><span className="uppercase text-[10px]">Auth:</span><span className="text-brand-text">****</span></div>
                  </div>

                  {verifyResult && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className={cn("mt-4 p-3 rounded-xl border text-xs font-mono space-y-1.5", verifyResult.ready_to_publish ? "bg-brand-success/5 border-brand-success/20" : "bg-brand-danger/5 border-brand-danger/20")}>
                      <div className="flex items-center justify-between">
                        <p className={cn("font-bold uppercase tracking-wider", verifyResult.ready_to_publish ? "text-brand-success" : "text-brand-danger")}>
                          {verifyResult.ready_to_publish ? '✅ Publish Ready' : '❌ Needs Attention'}
                        </p>
                        <span className="text-[10px] text-brand-text-muted">{new Date(verifyResult.checked_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-brand-text-muted text-[11px]">{verifyResult.summary}</p>
                      <div className="space-y-1 pt-1">
                        {Object.entries(verifyResult.checks).map(([key, check]) => (
                          <div key={key} className="flex items-start gap-2">
                            <span className={cn("mt-0.5", check.ok ? 'text-brand-success' : 'text-brand-danger')}>{check.ok ? '✓' : '✗'}</span>
                            <span className="text-brand-text-muted">{check.detail}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="pt-6 mt-6 border-t border-brand-border/50 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono uppercase font-bold text-brand-text-muted">Publishing</span>
                      <button onClick={() => handleToggle(account)} className={cn("w-11 h-6 rounded-full flex items-center px-1 transition-all border", account.enabled ? "bg-brand-primary border-brand-primary justify-end" : "bg-brand-elevated border-brand-border justify-start")}>
                        <motion.div layout className="w-4 h-4 bg-white rounded-full shadow" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleVerifyPublish(account)} disabled={verifyingId === account.id}
                        className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-brand-primary/10 border border-brand-primary/30 rounded-xl text-brand-primary hover:bg-brand-primary/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                        {verifyingId === account.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        {verifyingId === account.id ? 'Checking' : 'Verify'}
                      </button>
                      <button onClick={() => handleHealthCheck(account)} disabled={testingId === account.id} className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-text transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                        <RefreshCw className={cn("w-3.5 h-3.5", testingId === account.id && "animate-spin text-brand-primary")} /> Test
                      </button>
                      <button onClick={() => openEdit(account)} className="flex-1 py-2 text-xs font-mono font-bold uppercase bg-brand-elevated border border-brand-border rounded-xl text-brand-text-muted hover:text-brand-text transition-all flex items-center justify-center gap-1.5">
                        <Settings className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(account)} className="py-2 px-3 bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <button onClick={openNew} className="fixed bottom-8 right-8 bg-brand-primary text-white p-4 rounded-full shadow-glow-primary hover:bg-brand-primary/90 transition-all z-30 flex items-center justify-center group">
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold whitespace-nowrap text-xs uppercase">Connect Channel</span>
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-brand-surface border border-brand-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-elevated">
                <h2 className="text-lg font-bold uppercase tracking-wider text-brand-text flex items-center gap-2">
                  {editingAccount ? <Settings className="w-5 h-5 text-brand-primary" /> : <Plus className="w-5 h-5 text-brand-primary" />}
                  {editingAccount ? 'Edit Channel' : 'Connect Channel'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-brand-text-muted hover:text-brand-text transition-all font-bold text-xs">✕</button>
              </div>
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-1.5">Platform</label>
                    <select disabled={!!editingAccount} value={modalPlatform} onChange={e => { setModalPlatform(e.target.value as SocialAccount['platform']); setCredentials({}); setVisibleFields({}); }}
                      className="w-full bg-brand-elevated border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text font-bold uppercase focus:outline-none focus:border-brand-primary cursor-pointer">
                      <option value="facebook">Facebook Page</option>
                      <option value="twitter">X (Twitter)</option>
                      <option value="linkedin">LinkedIn Profile</option>
                      <option value="instagram">Instagram Business</option>
                      <option value="whatsapp">WhatsApp Cloud API</option>
                      <option value="telegram">Telegram Bot</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-1.5">Account Name</label>
                    <input type="text" required placeholder="e.g. Kanyoza Marketing" value={modalAccountName} onChange={e => setModalAccountName(e.target.value)}
                      className="w-full bg-brand-elevated border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-1.5">Timezone</label>
                    <select value={modalTimezone} onChange={e => setModalTimezone(e.target.value)}
                      className="w-full bg-brand-elevated border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer">
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-1.5 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" /> Linked Brand
                    </label>
                    <select value={modalBrandId} onChange={e => setModalBrandId(e.target.value)}
                      className="w-full bg-brand-elevated border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-primary cursor-pointer">
                      <option value="">None (unassigned)</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-brand-elevated border border-brand-border rounded-xl">
                  <span className="text-xs font-mono font-bold text-brand-text-muted uppercase">Publishing Enabled</span>
                  <button type="button" onClick={() => setModalEnabled(!modalEnabled)}
                    className={cn("w-11 h-6 rounded-full flex items-center px-1 transition-all border", modalEnabled ? "bg-brand-primary border-brand-primary justify-end" : "bg-brand-surface border-brand-border justify-start")}>
                    <motion.div layout className="w-4 h-4 bg-white rounded-full shadow" />
                  </button>
                </div>
                <div className="pt-4 border-t border-brand-border/60">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary mb-4">API Credentials</h3>
                  <div className="space-y-4">
                    {PLATFORM_FIELDS[modalPlatform].map(field => (
                      <div key={field.key} className="space-y-1.5">
                        <label className="flex justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted">
                          <span>{field.label} {field.secret && <span className="text-brand-warning">(Secret)</span>}</span>
                          {credentials[field.key] && (
                            <button type="button" onClick={() => navigator.clipboard.writeText(credentials[field.key])} className="text-brand-primary hover:underline flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
                          )}
                        </label>
                        <div className="relative">
                          <input type={field.secret && !visibleFields[field.key] ? 'password' : 'text'} required value={credentials[field.key] || ''}
                            onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder}
                            className="w-full bg-brand-elevated border border-brand-border rounded-xl pl-4 pr-12 py-2.5 text-xs text-brand-text font-mono focus:outline-none focus:border-brand-primary" />
                          {field.secret && (
                            <button type="button" onClick={() => setVisibleFields(prev => ({ ...prev, [field.key]: !prev[field.key] }))} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-brand-text-muted hover:text-brand-text">
                              {visibleFields[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-brand-surface border border-brand-border rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div><h4 className="text-xs font-mono font-bold uppercase text-brand-text">Test Connection</h4><p className="text-[11px] text-brand-text-muted">Verify credentials before saving</p></div>
                    <button type="button" disabled={testing} onClick={handleTestConnection} className="px-4 py-2 bg-brand-elevated border border-brand-border text-brand-text text-xs font-bold uppercase rounded-xl hover:bg-brand-surface transition-all flex items-center gap-1.5">
                      <RefreshCw className={cn("w-3.5 h-3.5", testing && "animate-spin")} /> {testing ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                  <AnimatePresence>
                    {testResult && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className={cn("p-3 rounded-lg border text-xs font-mono flex items-start gap-2", testResult.status === 'success' ? "bg-brand-success/10 text-brand-success border-brand-success/20" : "bg-brand-danger/10 text-brand-danger border-brand-danger/20")}>
                        {testResult.status === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}{testResult.message}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </form>
              <div className="p-6 border-t border-brand-border bg-brand-elevated flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-brand-surface border border-brand-border text-brand-text-muted text-xs font-bold uppercase rounded-xl hover:bg-brand-elevated transition-all">Cancel</button>
                <button type="button" onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-brand-primary text-white text-xs font-bold uppercase rounded-xl shadow-glow-primary hover:bg-brand-primary/90 transition-all">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDelete(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-start gap-3"><div className="p-3 bg-brand-danger/10 text-brand-danger rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
                <div><h3 className="text-base font-bold text-brand-text uppercase">Disconnect "{confirmDelete.account_name}"?</h3><p className="text-xs text-brand-text-muted mt-1 font-mono">Posts to this account will stop. Credentials will be discarded.</p></div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-brand-elevated border border-brand-border text-brand-text-muted text-xs font-bold uppercase rounded-xl hover:bg-brand-surface transition-all">Cancel</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-brand-danger text-white text-xs font-bold uppercase rounded-xl hover:bg-brand-danger/90 transition-all">Disconnect</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
