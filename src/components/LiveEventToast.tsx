import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, FileText, MessageSquare, Package, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

export interface LiveNotification {
  id: string;
  type: 'alert' | 'post' | 'message' | 'payload';
  title: string;
  subtitle?: string;
  severity?: string;
}

const CONFIG = {
  alert: {
    icon:    ShieldAlert,
    label:   'SECURITY ALERT',
    route:   '/guardian',
    base:    'border-brand-danger/40 bg-gradient-to-br from-brand-danger/20 to-brand-danger/5',
    badge:   'bg-brand-danger/20 text-brand-danger',
    iconCls: 'text-brand-danger',
    glow:    'shadow-[0_0_30px_rgba(239,68,68,0.25)]',
  },
  post: {
    icon:    FileText,
    label:   'BROADCAST PUBLISHED',
    route:   '/posts',
    base:    'border-brand-primary/40 bg-gradient-to-br from-brand-primary/20 to-brand-primary/5',
    badge:   'bg-brand-primary/20 text-brand-primary',
    iconCls: 'text-brand-primary',
    glow:    'shadow-[0_0_30px_rgba(79,70,229,0.25)]',
  },
  message: {
    icon:    MessageSquare,
    label:   'NEW MESSAGE',
    route:   '/',
    base:    'border-brand-accent/40 bg-gradient-to-br from-brand-accent/20 to-brand-accent/5',
    badge:   'bg-brand-accent/20 text-brand-accent',
    iconCls: 'text-brand-accent',
    glow:    'shadow-[0_0_30px_rgba(6,182,212,0.25)]',
  },
  payload: {
    icon:    Package,
    label:   'INCOMING PAYLOAD',
    route:   '/payloads',
    base:    'border-brand-warning/40 bg-gradient-to-br from-brand-warning/20 to-brand-warning/5',
    badge:   'bg-brand-warning/20 text-brand-warning',
    iconCls: 'text-brand-warning',
    glow:    'shadow-[0_0_30px_rgba(245,158,11,0.25)]',
  },
} as const;

const AUTO_DISMISS_MS = 5000;

export default function LiveEventToast() {
  const notification   = useStore(state => state.lastNotification);
  const dismiss        = useStore(state => state.dismissNotification);
  const navigate       = useNavigate();
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after AUTO_DISMISS_MS
  useEffect(() => {
    if (!notification) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [notification?.id, dismiss]);

  const handleNavigate = () => {
    if (!notification) return;
    dismiss();
    navigate(CONFIG[notification.type].route);
  };

  const cfg = notification ? CONFIG[notification.type] : null;

  return (
    <AnimatePresence>
      {notification && cfg && (
        <motion.div
          key={notification.id}
          initial={{ opacity: 0, x: 80, scale: 0.92 }}
          animate={{ opacity: 1, x: 0,  scale: 1    }}
          exit={{   opacity: 0, x: 80,  scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'fixed bottom-24 right-4 md:bottom-8 md:right-6 z-[100]',
            'w-[calc(100vw-2rem)] max-w-[340px]',
            'rounded-2xl border backdrop-blur-md',
            'flex flex-col gap-3 p-4 font-mono text-xs',
            cfg.base,
            cfg.glow,
          )}
        >
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest', cfg.badge)}>
              {cfg.label}
            </span>
            <button
              onClick={dismiss}
              className="text-brand-text-muted hover:text-brand-text transition-colors p-0.5 rounded hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body row */}
          <div className="flex items-start gap-3">
            <div className={cn('mt-0.5 shrink-0', cfg.iconCls)}>
              <cfg.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-brand-text text-sm leading-snug truncate">
                {notification.title}
              </p>
              {notification.subtitle && (
                <p className={cn('text-[10px] uppercase tracking-wider mt-0.5', cfg.iconCls)}>
                  {notification.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Progress bar + view link */}
          <div className="flex items-center justify-between gap-3">
            {/* shrinking timer bar */}
            <div className="flex-1 h-[2px] bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', cfg.iconCls.replace('text-', 'bg-'))}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
              />
            </div>
            <button
              onClick={handleNavigate}
              className={cn(
                'flex items-center gap-1 font-bold uppercase tracking-wider text-[9px] transition-colors shrink-0',
                cfg.iconCls,
                'hover:opacity-70'
              )}
            >
              View <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
