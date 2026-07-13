import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import { MessageSquare, Send, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConversationSummary {
  sender_id: string;
  name?: string;
  last_message?: string;
  time?: string;
  unread?: number;
}

interface MessageEntry {
  id?: string | number;
  text?: string;
  message?: string;
  time?: string;
  is_me?: boolean;
  sender_id?: string;
  created_at?: string;
}

export default function Messenger() {
  const { restEndpoint, masterToken } = useStore();
  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchConversations = async () => {
    setConvLoading(true);
    setConvError(false);
    try {
      const res = await fetch(`${base}/messages?limit=50`, { headers });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.messages || data.conversations || []);
      } else throw new Error('Failed');
    } catch { setConvError(true); }
    finally { setConvLoading(false); }
  };

  const fetchMessages = async (senderId: string) => {
    setMsgLoading(true);
    setMsgError(false);
    try {
      const res = await fetch(`${base}/messages/${senderId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else throw new Error('Failed');
    } catch { setMsgError(true); }
    finally { setMsgLoading(false); }
  };

  useEffect(() => { fetchConversations(); }, [restEndpoint]);

  const activeId = selectedId ?? conversations[0]?.sender_id ?? null;
  const selectedConversation = conversations.find(c => c.sender_id === activeId) || null;

  useEffect(() => {
    if (activeId) fetchMessages(activeId);
  }, [activeId, restEndpoint]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = messageInput.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${base}/messages/reply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ recipient_id: activeId, text }),
      });
      if (res.ok) {
        setMessageInput('');
        showToast('Reply sent', true);
        fetchMessages(activeId);
        fetchConversations();
      } else {
        const d = await res.json();
        showToast(d.error || 'Send failed', false);
      }
    } catch (err: any) {
      showToast(err.message || 'Send failed', false);
    } finally { setSending(false); }
  };

  const filteredConversations = useMemo(
    () => conversations.filter(c =>
      (c.name || c.sender_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.last_message || '').toLowerCase().includes(searchQuery.toLowerCase())
    ), [conversations, searchQuery]
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 pb-20 md:pb-0">
      {toast && (
        <div className={cn("fixed top-20 right-6 z-50 px-4 py-2 rounded-xl border text-xs font-bold font-mono", toast.ok ? "bg-brand-success/10 text-brand-success border-brand-success/30" : "bg-brand-danger/10 text-brand-danger border-brand-danger/30")}>{toast.msg}</div>
      )}

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
        className="w-full md:w-96 bg-brand-surface border border-brand-border rounded-2xl flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-brand-border bg-brand-elevated/40">
          <div className="flex items-center justify-between mb-4">
            <div><h2 className="text-lg font-bold text-brand-text">Omni-Channel Inbox</h2><span className="text-[10px] font-mono text-brand-text-muted">LIVE CONVERSATIONS</span></div>
            <button onClick={fetchConversations} className="w-10 h-10 rounded-xl bg-brand-elevated text-brand-text flex items-center justify-center border border-brand-border hover:bg-brand-border/30 transition-colors">
              <RefreshCw className={cn('w-4 h-4', convLoading && 'animate-spin')} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
            <input type="text" placeholder="Search conversations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-primary" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-brand-surface/40">
          {convLoading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-brand-elevated/60 rounded-xl animate-pulse" />)}</div>
          ) : convError ? (
            <div className="py-8 text-center text-xs text-brand-danger font-mono flex flex-col items-center gap-2"><AlertTriangle className="w-5 h-5" />Failed to load conversations</div>
          ) : filteredConversations.map((conv, idx) => (
            <motion.div key={conv.sender_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + idx * 0.03 }}
              onClick={() => setSelectedId(conv.sender_id)}
              className={cn('p-3 rounded-xl cursor-pointer transition-all border', activeId === conv.sender_id ? 'bg-brand-primary/10 border-brand-primary/30 shadow-sm' : 'bg-brand-elevated/50 border-transparent hover:border-brand-border')}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full border border-brand-border bg-brand-elevated flex items-center justify-center text-xs font-bold text-brand-text-muted shrink-0">{(conv.name || conv.sender_id).slice(0, 2).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1"><h3 className="text-xs font-bold text-brand-text truncate">{conv.name || conv.sender_id}</h3><span className="text-[9px] text-brand-text-muted font-mono">{conv.time}</span></div>
                  <div className="flex items-center justify-between"><p className="text-[11px] text-brand-text-muted truncate pr-2">{conv.last_message}</p>{!!conv.unread && <span className="w-4 h-4 rounded-full bg-brand-danger text-white text-[9px] font-bold flex items-center justify-center shrink-0">{conv.unread}</span>}</div>
                </div>
              </div>
            </motion.div>
          ))}
          {!convLoading && !convError && filteredConversations.length === 0 && <div className="py-8 text-center text-xs text-brand-text-muted font-mono uppercase">No conversations found</div>}
        </div>
      </motion.div>

      {selectedConversation || activeId ? (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="flex-1 bg-brand-surface border border-brand-border rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-elevated/40">
            <div><h3 className="text-sm font-bold text-brand-text leading-tight">{selectedConversation?.name || activeId}</h3><span className="text-[10px] text-brand-primary font-mono tracking-wider uppercase">Live channel</span></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-surface/20">
            {msgLoading && <div className="flex justify-center py-10"><RefreshCw className="w-5 h-5 animate-spin text-brand-text-muted" /></div>}
            {msgError && <div className="py-10 text-center text-xs text-brand-danger font-mono">Failed to load messages</div>}
            {!msgLoading && !msgError && messages.map((msg, idx) => (
              <motion.div key={msg.id ?? idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                className={cn('flex', msg.is_me ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[70%] p-3 rounded-xl border leading-relaxed', msg.is_me ? 'bg-brand-primary border-brand-primary text-white rounded-tr-none' : 'bg-brand-elevated border-brand-border text-brand-text rounded-tl-none')}>
                  <p className="text-xs">{msg.text || msg.message}</p>
                  {msg.time && <p className="text-[9px] font-mono opacity-80 text-right mt-1.5">{msg.time}</p>}
                </div>
              </motion.div>
            ))}
            {!msgLoading && !msgError && messages.length === 0 && <div className="py-20 text-center text-xs text-brand-text-muted font-mono uppercase">No messages yet</div>}
          </div>
          <form onSubmit={handleSend} className="p-4 border-t border-brand-border bg-brand-elevated/20">
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Type a reply..." value={messageInput} onChange={e => setMessageInput(e.target.value)} disabled={sending}
                className="flex-1 px-4 py-2.5 bg-brand-elevated border border-brand-border rounded-xl text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-primary disabled:opacity-60" />
              <button type="submit" disabled={sending || !messageInput.trim()}
                className="w-10 h-10 rounded-xl bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors shadow-glow-primary flex items-center justify-center disabled:opacity-50">
                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <div className="flex-1 bg-brand-surface border border-brand-border rounded-2xl flex flex-col items-center justify-center text-brand-text-muted">
          <MessageSquare className="w-12 h-12 mb-3 opacity-40" /><p className="text-sm font-mono uppercase">No active conversation</p>
        </div>
      )}
    </motion.div>
  );
}
