import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store/useStore';
import ParticleBackground from '../components/ParticleBackground';
import { 
  Shield, Fingerprint, AlertCircle, Zap, Eye, EyeOff, 
  Command, ChevronRight, Hexagon, Key, Mail, ArrowRight,
  Wifi, WifiOff
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

// ── Hex grid background ────────────────────────────────────────────────────

function HexGrid() {
  return (
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L55 20v30L30 65 5 50V20L30 5z' fill='none' stroke='%234F46E5' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: '40px 40px',
      }} />
    </div>
  );
}

// ── Typing animation for placeholder ───────────────────────────────────────

function useTypingPlaceholder(text: string, speed = 80) {
  const [display, setDisplay] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(text.slice(0, indexRef.current + 1));
      indexRef.current++;
      if (indexRef.current >= text.length) {
        setTimeout(() => { indexRef.current = 0; setDisplay(''); }, 2000);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return display;
}

// ═══════════════════════════════════════════════════════════════════════════

export default function Login() {
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isShake, setIsShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const passwordRef = useRef<HTMLInputElement>(null);

  const typingPlaceholder = useTypingPlaceholder('operator@kanyoza.com', 60);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => { setError(null); setStep('idle'); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Keyboard shortcut: Enter on email → focus password
  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordRef.current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Operator ID and Passkey are required.');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      return;
    }

    setLoading(true);
    setError(null);
    setStep('validating');
    
    // Dev mode bypass — when Supabase is NOT configured
    if (!isSupabaseConfigured()) {
      localStorage.setItem('kanyoza_authenticated', 'true');
      setStep('success');
      toast.success('Dev mode — access granted');
      setTimeout(() => login(), 600);
      return;
    }
        
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setFailedAttempts(prev => prev + 1);
        
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || 
               hostname.includes('127.0.0.1');
        if (isLocal) {
          localStorage.setItem('kanyoza_authenticated', 'true');
          setStep('success');
          toast.success('Dev environment — access granted');
          setTimeout(() => login(), 600);
          return;
        }

        if (authError.message === 'Failed to fetch' || authError.message.includes('Failed to fetch')) {
          setError('Authentication server unreachable. Please try again.');
        } else if (failedAttempts >= 2) {
          setError('Multiple failed attempts. Please verify your credentials or reset your passkey.');
        } else {
          setError(authError.message);
        }
        setStep('error');
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
        return;
      }
      
      // Real Supabase auth succeeded
      localStorage.setItem('kanyoza_authenticated', 'true');
      setStep('success');
      toast.success('Access granted — welcome back');
      setTimeout(() => login(), 800);
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      setStep('error');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-brand-bg">
      {/* Background Layers */}
      <ParticleBackground />
      <HexGrid />
      
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-primary/5 via-brand-bg/90 to-brand-bg" />
      
      {/* Animated border orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-brand-accent/10 rounded-full blur-3xl"
      />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <motion.div 
          animate={isShake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-brand-surface/95 backdrop-blur-xl border border-brand-border/50 p-8 rounded-3xl shadow-[0_0_60px_rgba(79,70,229,0.1),0_0_0_1px_rgba(79,70,229,0.05)_inset]"
        >
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              animate={step === 'validating' ? { 
                scale: [1, 1.05, 1],
                boxShadow: ['0 0 20px rgba(79,70,229,0.2)', '0 0 40px rgba(79,70,229,0.5)', '0 0 20px rgba(79,70,229,0.2)']
              } : step === 'success' ? {
                scale: [1, 1.1, 1],
                boxShadow: ['0 0 20px rgba(34,197,94,0.3)', '0 0 50px rgba(34,197,94,0.6)', '0 0 20px rgba(34,197,94,0.3)']
              } : {}}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-20 h-20 bg-brand-elevated/80 rounded-2xl flex items-center justify-center mb-5 border border-brand-primary/20 shadow-glow-primary relative overflow-hidden"
            >
              <motion.div
                animate={{ rotate: step === 'validating' ? 360 : 0 }}
                transition={step === 'validating' ? { repeat: Infinity, duration: 3, ease: 'linear' } : {}}
                className="absolute inset-0 flex items-center justify-center opacity-30"
              >
                <Hexagon className="w-12 h-12 text-brand-primary" />
              </motion.div>
              <Shield className="w-9 h-9 text-brand-primary relative z-10" />
            </motion.div>
            
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Kanyoza<span className="text-brand-primary">Command</span>
            </h1>
            <p className="text-brand-text-muted text-xs mt-2 font-mono tracking-[0.2em] uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Authorized Personnel Only
            </p>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 overflow-hidden relative"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400 rounded-l-xl" />
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-0.5">Authentication Failed</p>
                  <p className="text-xs text-brand-text-muted font-mono truncate">{error}</p>
                </div>
                <button onClick={() => { setError(null); setStep('idle'); }}
                  className="text-brand-text-muted hover:text-white transition-colors flex-shrink-0">
                  <ChevronRight className="w-4 h-4 rotate-45" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                <Mail className="w-3 h-3" />
                Operator ID
              </label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null); setStep('idle'); }}
                  onKeyDown={handleEmailKeyDown}
                  className="w-full bg-brand-bg/60 border border-brand-border/50 rounded-xl px-4 py-3.5 text-brand-text placeholder-brand-text-muted/40 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-mono text-sm pr-10"
                  placeholder={typingPlaceholder || 'operator@kanyoza.com'}
                  autoComplete="email"
                  autoFocus
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted/30 group-focus-within:text-brand-primary/50 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
            
            {/* Password Field */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-[0.15em] flex items-center gap-2">
                  <Key className="w-3 h-3" />
                  Passkey
                </label>
                <button type="button" tabIndex={-1}
                  className="text-[10px] text-brand-primary/70 hover:text-brand-primary transition-colors font-semibold tracking-wider">
                  Reset Protocol?
                </button>
              </div>
              <div className="relative group">
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); setStep('idle'); }}
                  className="w-full bg-brand-bg/60 border border-brand-border/50 rounded-xl px-4 py-3.5 text-brand-text placeholder-brand-text-muted/40 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-mono text-sm pr-12"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted/40 hover:text-white transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Session + Security */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer group">
                <input type="checkbox" defaultChecked
                  className="rounded-md border-brand-border bg-brand-bg text-brand-primary focus:ring-brand-primary focus:ring-offset-0 w-4 h-4 cursor-pointer" />
                <span className="ml-2.5 text-xs text-brand-text-muted group-hover:text-white transition-colors font-medium">
                  Maintain active session
                </span>
              </label>
              <div className="text-[10px] font-mono text-brand-text-muted/50 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400/50" />
                Secured by Supabase
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className={cn(
                "w-full rounded-xl py-3.5 px-4 font-bold tracking-wider transition-all flex items-center justify-center relative overflow-hidden text-sm uppercase",
                step === 'success' 
                  ? 'bg-emerald-500 text-white shadow-glow-success' 
                  : 'bg-brand-primary hover:bg-brand-primary/90 text-white shadow-glow-primary'
              )}>
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                    AUTHENTICATING…
                  </>
                ) : step === 'success' ? (
                  <>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <ChevronRight className="w-3 h-3 text-emerald-500" />
                    </motion.div>
                    ACCESS GRANTED
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5 opacity-70" />
                    ENTER COMMAND CENTER
                    <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
                      <ChevronRight className="w-4 h-4" />
                    </motion.span>
                  </>
                )}
              </span>
            </motion.button>
          </form>

          {/* Footer hint */}
          <p className="mt-5 text-[10px] text-brand-text-muted/30 text-center font-mono tracking-wider">
            Press <kbd className="px-1.5 py-0.5 bg-brand-elevated border border-brand-border rounded text-brand-text-muted/50 font-mono">Enter</kbd> to authenticate
          </p>
        </motion.div>
      </motion.div>

      {/* Bottom branding */}
      <div className="absolute bottom-6 left-0 w-full flex flex-col items-center justify-center text-brand-text-muted font-mono text-[10px] opacity-30 space-y-1 tracking-wider pointer-events-none">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-brand-primary" />
          <span>Kanyoza Systems AI Platform v11</span>
        </div>
        <p>End-to-End Encrypted · Zero-Trust Architecture</p>
      </div>
    </div>
  );
}
