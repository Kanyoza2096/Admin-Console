/**
 * PWABanner — two overlapping banners:
 *   1. Offline indicator (top bar, amber) when navigator.onLine is false
 *   2. Update available toast (bottom-center) when the SW has a new version ready
 *
 * Registered by vite-plugin-pwa's `useRegisterSW` hook — no manual SW registration needed.
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X, WifiOff } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWABanner() {
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) console.log('[PWA] Service worker registered — scope:', r.scope);
    },
    onRegisterError(err) {
      console.warn('[PWA] Service worker registration failed:', err);
    },
  });

  useEffect(() => {
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {/* ── Offline bar ─────────────────────────────────────────────── */}
      {isOffline && (
        <motion.div
          key="offline"
          initial={{ y: -44, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{ y: -44,    opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-black text-[11px] font-bold font-mono uppercase tracking-wider shadow-xl"
          style={{ letterSpacing: '0.08em' }}
        >
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Offline — showing cached data</span>
        </motion.div>
      )}

      {/* ── Update available toast ───────────────────────────────────── */}
      {needRefresh && !isOffline && (
        <motion.div
          key="update"
          initial={{ y: 64,  opacity: 0, scale: 0.96 }}
          animate={{ y: 0,   opacity: 1, scale: 1    }}
          exit={{ y: 64,     opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="fixed bottom-24 md:bottom-5 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-4 py-3 bg-brand-surface/97 backdrop-blur-2xl border border-brand-primary/40 rounded-2xl shadow-2xl text-[11px] font-mono whitespace-nowrap"
          style={{ boxShadow: '0 8px 40px rgba(99,102,241,0.28), 0 0 0 1px rgba(99,102,241,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
            </span>
            <span className="text-white font-semibold">New version available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary rounded-lg text-white font-bold text-[10px] uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              Update
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="p-1.5 rounded-lg text-brand-text-muted hover:text-white hover:bg-brand-elevated transition-all"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
