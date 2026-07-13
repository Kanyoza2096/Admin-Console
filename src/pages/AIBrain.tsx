import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import { BrainCircuit, Zap, Save, RotateCcw, MessageCircle, Send, Bot, Sparkles, ChevronDown } from 'lucide-react';
import { cn, fetchWithTimeout } from '../lib/utils';

export default function AIBrain() {
  const { restEndpoint, masterToken, setPersonaMood, personaMood } = useStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Config — dynamic from backend
  const [model, setModel] = useState('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [chatTemp, setChatTemp] = useState(0.7);
  const [postTemp, setPostTemp] = useState(0.65);
  const [safetyLevel, setSafetyLevel] = useState('medium');
  const [provider, setProvider] = useState('gemini');

  // Persona
  const [tone, setTone] = useState(60);
  const [aggression, setAggression] = useState(70);
  const [humor, setHumor] = useState(20);
  const [mood, setMood] = useState(personaMood || 'professional');
  const [availableMoods, setAvailableMoods] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');

  // Chat test
  const [chatMessage, setChatMessage] = useState('');
  const [chatReply, setChatReply] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const headers = masterToken ? { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` } : {};
  const base = restEndpoint.replace(/\/+$/, '');

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const [configRes, personaRes] = await Promise.all([
          fetch(`${base}/ai/config`, { headers }),
          fetch(`${base}/ai/persona`, { headers }),
        ]);

        if (configRes.ok) {
          const d = await configRes.json();
          if (d.model) setModel(d.model);
          if (d.available_models) setAvailableModels(d.available_models);
          if (d.available_providers) setAvailableProviders(d.available_providers);
          if (d.chat_temperature !== undefined) setChatTemp(d.chat_temperature);
          if (d.post_temperature !== undefined) setPostTemp(d.post_temperature);
          if (d.safety_level) setSafetyLevel(d.safety_level);
          if (d.provider) setProvider(d.provider);
        }

        if (personaRes.ok) {
          const d = await personaRes.json();
          if (d.tone !== undefined) setTone(d.tone);
          if (d.aggression !== undefined) setAggression(d.aggression);
          if (d.humor !== undefined) setHumor(d.humor);
          if (d.persona_mood) setMood(d.persona_mood);
          if (d.available_moods) setAvailableMoods(d.available_moods);
          if (d.system_prompt) setSystemPrompt(d.system_prompt);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [restEndpoint]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await Promise.all([
        fetch(`${base}/ai/config`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            model,
            chat_temperature: chatTemp,
            post_temperature: postTemp,
            safety_level: safetyLevel,
            provider,
          }),
        }),
        fetch(`${base}/ai/persona`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            tone,
            aggression,
            humor,
            persona_mood: mood,
            system_prompt: systemPrompt || null,
          }),
        }),
      ]);
      setPersonaMood(mood as any);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch(`${base}/persona/reset`, { method: 'POST', headers });
      if (res.ok) {
        const d = await res.json();
        if (d.persona) {
          if (d.persona.tone !== undefined) setTone(d.persona.tone);
          if (d.persona.aggression !== undefined) setAggression(d.persona.aggression);
          if (d.persona.humor !== undefined) setHumor(d.persona.humor);
          if (d.persona.mood) setMood(d.persona.mood);
          if (d.persona.system_prompt !== undefined) setSystemPrompt(d.persona.system_prompt || '');
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError('Reset failed');
    }
  };

  const handleChat = async () => {
    if (!chatMessage.trim()) return;
    setChatLoading(true);
    setChatReply('');
    try {
      const res = await fetch(`${base}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: chatMessage }),
      });
      const d = await res.json();
      setChatReply(d.reply || 'No response');
    } catch (err) {
      setChatReply('Chat failed. Check your Gemini key.');
    } finally {
      setChatLoading(false);
    }
  };

  const moodCards = [
    { key: 'analytical', label: 'Analytical', emoji: '🧠', color: 'bg-brand-accent/10 text-brand-accent border-brand-accent/30' },
    { key: 'professional', label: 'Professional', emoji: '💼', color: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' },
    { key: 'creative', label: 'Creative', emoji: '🎨', color: 'bg-brand-warning/10 text-brand-warning border-brand-warning/30' },
    { key: 'urgent', label: 'Urgent', emoji: '⚡', color: 'bg-brand-danger/10 text-brand-danger border-brand-danger/30' },
  ];

  // Filter mood cards to only show available moods from backend
  const filteredMoodCards = availableMoods.length > 0
    ? moodCards.filter(m => availableMoods.includes(m.key))
    : moodCards;

  const modelLabel = (id: string) => {
    const map: Record<string, string> = {
      'gemini-2.5-flash': 'Gemini 2.5 Flash',
      'gemini-2.5-pro': 'Gemini 2.5 Pro',
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
    };
    return map[id] || id;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-brand-elevated rounded w-48" />
        <div className="h-64 bg-brand-surface border border-brand-border rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 md:pb-0 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight flex items-center">
            <BrainCircuit className="w-8 h-8 mr-3 text-brand-primary" />
            AI Brain
          </h1>
          <p className="text-brand-text-muted text-sm font-mono mt-1">COGNITIVE ENGINE CONFIGURATION</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2.5 bg-brand-elevated border border-brand-border rounded-xl text-sm font-bold uppercase tracking-wider text-brand-text-muted hover:text-brand-text transition-all">
            <RotateCcw className="w-4 h-4" /> Reset Defaults
          </button>
          <button onClick={handleSave} disabled={saving}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all",
              saveSuccess ? "bg-brand-success text-white" : "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-glow-primary"
            )}>
            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : <><Save className="w-4 h-4" /> Save All</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-brand-danger/5 border border-brand-danger/20 rounded-xl text-xs text-brand-danger font-mono">{error}</div>
      )}

      {/* Model & Temperature */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-primary" /> Model Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-2">Active Model</label>
            <select value={model} onChange={e => setModel(e.target.value)}
              className="w-full bg-brand-elevated border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text font-bold focus:outline-none focus:border-brand-primary cursor-pointer">
              {availableModels.length > 0 ? (
                availableModels.map(m => (
                  <option key={m} value={m}>{modelLabel(m)}</option>
                ))
              ) : (
                <>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </>
              )}
            </select>
            {availableModels.length > 0 && (
              <p className="text-[9px] text-brand-text-muted font-mono mt-1">{availableModels.length} models available</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-2">Safety Level</label>
            <select value={safetyLevel} onChange={e => setSafetyLevel(e.target.value)}
              className="w-full bg-brand-elevated border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text font-bold focus:outline-none focus:border-brand-primary cursor-pointer">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-2">
              Chat Temperature: {chatTemp.toFixed(1)}
            </label>
            <input type="range" min="0" max="2" step="0.1" value={chatTemp} onChange={e => setChatTemp(parseFloat(e.target.value))}
              className="w-full accent-brand-primary" />
            <div className="flex justify-between text-[9px] text-brand-text-muted font-mono mt-1">
              <span>Precise (0.0)</span><span>Creative (2.0)</span>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-2">
              Post Temperature: {postTemp.toFixed(1)}
            </label>
            <input type="range" min="0" max="2" step="0.1" value={postTemp} onChange={e => setPostTemp(parseFloat(e.target.value))}
              className="w-full accent-brand-primary" />
            <div className="flex justify-between text-[9px] text-brand-text-muted font-mono mt-1">
              <span>Precise (0.0)</span><span>Creative (2.0)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Personality Sliders */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-accent" /> Personality Matrix
        </h2>

        <div className="space-y-5">
          {[
            { label: 'Tone', value: tone, setter: setTone, left: 'Formal', right: 'Casual' },
            { label: 'Assertiveness', value: aggression, setter: setAggression, left: 'Passive', right: 'Assertive' },
            { label: 'Humor', value: humor, setter: setHumor, left: 'Serious', right: 'Playful' },
          ].map(slider => (
            <div key={slider.label}>
              <div className="flex justify-between mb-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted">{slider.label}</label>
                <span className="text-xs font-mono font-bold text-brand-text">{slider.value}%</span>
              </div>
              <input type="range" min="0" max="100" value={slider.value} onChange={e => slider.setter(parseInt(e.target.value))}
                className="w-full accent-brand-primary" />
              <div className="flex justify-between text-[9px] text-brand-text-muted font-mono mt-1">
                <span>{slider.left}</span><span>{slider.right}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Mood Selector — filtered by available moods from backend */}
        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-3">Active Mood</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filteredMoodCards.map(m => (
              <button key={m.key} onClick={() => setMood(m.key as any)}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all",
                  mood === m.key ? m.color + ' border-current' : 'bg-brand-elevated border-brand-border text-brand-text-muted hover:border-brand-primary/30'
                )}>
                <div className="text-2xl mb-1">{m.emoji}</div>
                <div className="text-xs font-bold uppercase tracking-wider">{m.label}</div>
              </button>
            ))}
          </div>
          {availableMoods.length > 0 && (
            <p className="text-[9px] text-brand-text-muted font-mono mt-2">{availableMoods.length} moods available</p>
          )}
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-2">System Prompt Override</label>
          <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
            placeholder="Custom system instructions for the AI..."
            rows={3}
            className="w-full bg-brand-elevated border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text font-mono placeholder-brand-text-muted/40 focus:outline-none focus:border-brand-primary resize-none" />
        </div>
      </div>

      {/* Test Chat */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-brand-text flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-brand-success" /> Test Chat
        </h2>
        <div className="flex gap-2">
          <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleChat()}
            placeholder="Type a test message..."
            className="flex-1 bg-brand-elevated border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text placeholder-brand-text-muted/40 focus:outline-none focus:border-brand-primary" />
          <button onClick={handleChat} disabled={chatLoading || !chatMessage.trim()}
            className="px-4 py-3 bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 transition-all disabled:opacity-50 flex items-center gap-2">
            {chatLoading ? <Bot className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {chatReply && (
          <div className="p-4 bg-brand-elevated border border-brand-border rounded-xl">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text-muted mb-2">AI Response</p>
            <p className="text-sm text-brand-text">{chatReply}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
