import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  Settings, Link, Key, Globe, Eye, EyeOff, Save, CheckCircle, 
  AlertTriangle, Wifi, WifiOff, Server, Shield, Zap, Copy, RotateCw 
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const {
    wsEndpoint, restEndpoint, masterToken, setConnectionParams,
    socketConnected, socketTransport, isUsingLiveBackendData, backendConfig,
  } = useStore();

  const [localWsEndpoint, setLocalWsEndpoint] = useState(wsEndpoint);
  const [localRestEndpoint, setLocalRestEndpoint] = useState(restEndpoint);
  const [localMasterToken, setLocalMasterToken] = useState(masterToken);
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleSave = () => {
    setConnectionParams({
      wsEndpoint: localWsEndpoint,
      restEndpoint: localRestEndpoint,
      masterToken: localMasterToken,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult('idle');
    setTestMessage('');
    try {
      const base = localRestEndpoint.replace(/\/+$/, '');
      const res = await fetch(`${base}/health/deep`, {
        headers: { Authorization: `Bearer ${localMasterToken}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTestResult('success');
      setTestMessage(`Connected — v${data.version || '?'} — ${Object.keys(data.services || {}).length} services`);
    } catch (err: any) {
      setTestResult('error');
      setTestMessage(err.message || 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-brand-primary/10 rounded-lg"><Settings className="w-6 h-6 text-brand-primary" /></div>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight">System Config</h1>
          </div>
          <p className="text-brand-text-muted text-sm font-mono mt-1">SECURE CONNECTION PARAMETERS</p>
        </div>
        <div className={cn("px-4 py-2 rounded-full flex items-center border", socketConnected ? "bg-brand-success/10 border-brand-success/30 text-brand-success" : "bg-brand-danger/10 border-brand-danger/30 text-brand-danger")}>
          {socketConnected ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
          <span className="text-xs font-bold uppercase tracking-widest">{socketConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-brand-surface border border-brand-border rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center mb-1"><Server className="w-4 h-4 mr-2 text-brand-primary" /> Backend Engine Connection</h2>
        <p className="text-xs text-brand-text-muted mb-6">Point the dashboard to your backend API and real-time engine</p>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2">WebSocket Endpoint URL</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Globe className="w-4 h-4 text-brand-text-muted" /></div>
              <input type="text" value={localWsEndpoint} onChange={e => setLocalWsEndpoint(e.target.value)}
                className="w-full bg-brand-bg/50 border border-brand-border rounded-xl pl-10 pr-4 py-3 text-brand-text placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-mono text-sm"
                placeholder="wss://api.example.com/socket" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2">REST API Base URL</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Link className="w-4 h-4 text-brand-text-muted" /></div>
              <input type="text" value={localRestEndpoint} onChange={e => setLocalRestEndpoint(e.target.value)}
                className="w-full bg-brand-bg/50 border border-brand-border rounded-xl pl-10 pr-4 py-3 text-brand-text placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-mono text-sm"
                placeholder="https://api.example.com/v1" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2">Master API Token</label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Key className="w-4 h-4 text-brand-text-muted" /></div>
              <input type={showToken ? "text" : "password"} value={localMasterToken} onChange={e => setLocalMasterToken(e.target.value)}
                className="w-full bg-brand-bg/50 border border-brand-border rounded-xl pl-10 pr-24 py-3 text-brand-text placeholder-brand-text-muted/50 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-mono text-sm"
                placeholder="sk_live_..." />
              <div className="absolute right-2 flex items-center space-x-1">
                <button type="button" onClick={() => setShowToken(!showToken)} className="p-1.5 text-brand-text-muted hover:text-brand-text transition-colors">
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button type="button" onClick={() => navigator.clipboard.writeText(localMasterToken)} className="p-1.5 text-brand-text-muted hover:text-brand-text transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-brand-warning mt-2 font-mono flex items-start">
              <AlertTriangle className="w-3.5 h-3.5 mr-1 flex-shrink-0 mt-0.5" />
              This token authenticates all API requests. Set it as MASTER_API_TOKEN in your backend's .env file. Never share it.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button onClick={handleTestConnection} disabled={testing}
            className="flex-1 py-3 px-4 rounded-xl border border-brand-border bg-brand-bg hover:bg-brand-elevated text-brand-text text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center disabled:opacity-50">
            {testing ? <RotateCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2 text-brand-accent" />} Test Connection
          </button>
          <button onClick={handleSave}
            className={cn("flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center shadow-glow-primary",
              saved ? "bg-brand-success text-white" : "bg-brand-primary hover:bg-brand-primary/90 text-white")}>
            {saved ? <><CheckCircle className="w-4 h-4 mr-2" /> Saved</> : <><Save className="w-4 h-4 mr-2" /> Save Connection Params</>}
          </button>
        </div>
        <AnimatePresence>
          {testResult !== 'idle' && (
            <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 16 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
              <div className={cn("p-4 rounded-xl border flex items-start", testResult === 'success' ? "bg-brand-success/10 border-brand-success/30" : "bg-brand-danger/10 border-brand-danger/30")}>
                {testResult === 'success' ? <CheckCircle className="w-5 h-5 text-brand-success mr-3 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-brand-danger mr-3 flex-shrink-0" />}
                <div>
                  <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-1", testResult === 'success' ? "text-brand-success" : "text-brand-danger")}>
                    {testResult === 'success' ? "Connection Successful" : "Connection Failed"}
                  </h4>
                  <p className="text-xs text-brand-text-muted font-mono">{testMessage}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-brand-surface border border-brand-border rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 text-brand-text">Connection Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-brand-bg/50 border border-brand-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-text-muted">WebSocket</span>
              <div className="flex items-center">
                <span className={cn("w-2 h-2 rounded-full mr-2", socketConnected ? "bg-brand-success animate-pulse" : "bg-brand-danger")} />
                <span className="text-[10px] font-mono text-brand-text">{socketConnected ? "CONNECTED" : "DISCONNECTED"}</span>
              </div>
            </div>
            <div className="text-[10px] text-brand-text-muted font-mono mt-2 space-y-1">
              <p>Transport: {socketTransport || 'none'}</p>
              <p>Live Data: {isUsingLiveBackendData ? 'ACTIVE' : 'WAITING'}</p>
            </div>
          </div>
          <div className="bg-brand-bg/50 border border-brand-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-text-muted">REST API</span>
              <div className="flex items-center">
                <span className={cn("w-2 h-2 rounded-full mr-2", backendConfig ? "bg-brand-success animate-pulse" : "bg-brand-warning")} />
                <span className="text-[10px] font-mono text-brand-text">{backendConfig ? "RESPONDING" : "NO DATA"}</span>
              </div>
            </div>
            {backendConfig && (
              <div className="text-[10px] text-brand-text-muted font-mono mt-2 space-y-1">
                <p>Version: {(backendConfig as any).version || '?'}</p>
                <p>Env: {(backendConfig as any).config?.environment || '?'}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-brand-warning/5 border border-brand-warning/30 rounded-2xl p-5 flex items-start">
        <Shield className="w-5 h-5 text-brand-warning mr-4 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-brand-warning leading-relaxed">
          Service credentials (Gemini API keys, Facebook tokens, GitHub tokens) are managed server-side in your backend's environment variables and Supabase database. They are never exposed to the frontend. Only connection parameters are stored in this browser session.
        </p>
      </motion.div>
    </div>
  );
}
