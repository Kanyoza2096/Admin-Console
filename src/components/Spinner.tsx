import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SpinnerProps {
  className?: string;
  size?: number;
}

/** Premium dual-ring spinner with a soft glow — used in place of plain Loader2 icons. */
export const Spinner = ({ className, size = 16 }: SpinnerProps) => (
  <span
    className={cn('relative inline-block shrink-0', className)}
    style={{ width: size, height: size }}
  >
    <motion.span
      className="absolute inset-0 rounded-full border-2 border-current border-t-transparent"
      style={{ opacity: 0.9 }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
    />
    <motion.span
      className="absolute inset-0 rounded-full border-2 border-current border-b-transparent"
      style={{ opacity: 0.25 }}
      animate={{ rotate: -360 }}
      transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
    />
  </span>
);

/** Larger centered spinner with label, for full-panel loading states. */
export const SpinnerBlock = ({ label = 'Loading...' }: { label?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center gap-3 py-16 text-brand-text-muted"
  >
    <Spinner size={32} className="text-brand-primary" />
    <span className="text-xs font-mono uppercase tracking-widest">{label}</span>
  </motion.div>
);
