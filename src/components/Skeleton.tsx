import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
}

/** Single animated placeholder block with a premium shimmer sweep */
export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn('relative overflow-hidden rounded-md bg-white/5', className)}>
    <motion.div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)',
      }}
      animate={{ x: ['-100%', '100%'] }}
      transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
    />
  </div>
);

/** Mimics a stat card (title + big number + subtitle) */
export const SkeletonCard = ({ className }: SkeletonProps) => (
  <motion.div 
    className={cn('rounded-xl bg-brand-surface border border-brand-border p-5 space-y-3', className)}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Skeleton className="h-3 w-1/3" />
    <Skeleton className="h-8 w-1/2" />
    <Skeleton className="h-3 w-2/3" />
  </motion.div>
);

/** Mimics a table with a header row and N data rows.
 *  Inner rows are wrapped in a <div> so the `key` prop lives on a host
 *  element (where it's always valid) rather than on Skeleton itself. */
export const SkeletonTable = ({ rows = 5, className }: SkeletonProps & { rows?: number }) => (
  <div className={cn('space-y-2', className)}>
    <Skeleton className="h-8 w-full rounded-lg" />
    {Array.from({ length: rows }).map((_, i) => (
      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
        <Skeleton className="h-12 w-full rounded-lg" />
      </motion.div>
    ))}
  </div>
);

/** Mimics a chart panel */
export const SkeletonChart = ({ className }: SkeletonProps) => (
  <motion.div 
    className={cn('rounded-xl bg-brand-surface border border-brand-border p-5', className)}
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <Skeleton className="h-3 w-1/4 mb-4" />
    <Skeleton className="h-48 w-full rounded-lg" />
  </motion.div>
);

/** Full-page loading layout — stat cards + two charts + a table */
export const SkeletonPage = () => (
  <div className="p-6 space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.08 }}>
          <SkeletonCard />
        </motion.div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SkeletonChart />
      <SkeletonChart />
    </div>
    <SkeletonTable rows={4} />
  </div>
);
