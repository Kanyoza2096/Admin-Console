import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, Bot, DollarSign, Activity, 
  ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { animate } from 'motion/react';

export type MetricType = 'reach' | 'ai' | 'revenue' | 'api';

export interface MetricCardProps {
  type: MetricType;
  title: string;
  value: string | number | null | undefined;
  trend?: string;
  isUp?: boolean;
  loading?: boolean;
  className?: string;
}

// Helper to parse numeric values and extract prefix and suffix
const parseNumericValue = (val: string | number | null | undefined) => {
  if (val === null || val === undefined) {
    return { numeric: null, prefix: '', suffix: '' };
  }
  if (typeof val === 'number') {
    return { numeric: val, prefix: '', suffix: '' };
  }
  
  const str = String(val).trim();
  // Match optional prefix, the core number (including decimals and commas), and optional suffix
  const match = str.match(/^([^\d\s-]*)\s*([\d,.]+)\s*([^\d\s]*)$/);
  if (match) {
    const prefix = match[1] || '';
    const numStr = match[2].replace(/,/g, '');
    const suffix = match[3] || '';
    const numeric = parseFloat(numStr);
    if (!isNaN(numeric)) {
      return { numeric, prefix, suffix };
    }
  }
  
  return { numeric: null, prefix: '', suffix: str };
};

// CountUp component to animate from 0 to target value over 800ms
const CountUpValue = ({ value }: { value: string | number }) => {
  const { numeric, prefix, suffix } = useMemo(() => parseNumericValue(value), [value]);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (numeric === null) return;
    
    const controls = animate(0, numeric, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplayValue(latest),
    });
    
    return () => controls.stop();
  }, [numeric]);

  if (numeric === null) {
    return <>{value}</>;
  }

  const hasDecimals = String(value).includes('.');
  const formatted = hasDecimals 
    ? displayValue.toFixed(1) 
    : Math.round(displayValue).toLocaleString();

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

export default function MetricCard({
  type,
  title,
  value,
  trend,
  isUp,
  loading = false,
  className,
}: MetricCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Motion-safe media check
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Window resize listener to handle custom mobile checks (Tailwind md = 768px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const config = useMemo(() => {
    switch (type) {
      case 'reach':
        return {
          icon: Globe,
          colorClass: 'text-brand-primary',
          bgClass: 'bg-brand-primary/10',
        };
      case 'ai':
        return {
          icon: Bot,
          colorClass: 'text-brand-accent',
          bgClass: 'bg-brand-accent/10',
        };
      case 'revenue':
        return {
          icon: DollarSign,
          colorClass: 'text-brand-success',
          bgClass: 'bg-brand-success/10',
        };
      case 'api':
        return {
          icon: Activity,
          colorClass: 'text-brand-warning',
          bgClass: 'bg-brand-warning/10',
        };
    }
  }, [type]);

  const IconComponent = config.icon;

  // Reduced continuous animation durations (30% less on mobile screens)
  const globeDuration = isMobile ? 14 * 0.7 : 14;
  const globeHoverDuration = isMobile ? 4 * 0.7 : 4;
  const apiDuration = isMobile ? 3 * 0.7 : 3;

  // Skeleton State Rendering
  if (loading) {
    return (
      <div 
        className={cn(
          "bg-brand-surface border border-brand-border rounded-2xl p-5 flex flex-col justify-between h-[130px] relative overflow-hidden",
          className
        )}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="w-9 h-9 bg-brand-elevated rounded-xl skeleton-pulse" />
          <div className="w-14 h-5 bg-brand-elevated rounded-full skeleton-pulse" />
        </div>
        <div className="space-y-2 mt-auto">
          <div className="w-24 h-7 bg-brand-elevated rounded-md skeleton-pulse" />
          <div className="w-16 h-4 bg-brand-elevated rounded-md skeleton-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={prefersReducedMotion ? {} : { y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group bg-brand-surface border border-brand-border hover:border-brand-primary rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-colors duration-300 shadow-md hover:shadow-lg cursor-pointer h-full min-h-[130px]",
        className
      )}
    >
      <div className="flex justify-between items-start mb-3 z-10">
        <div className={cn("p-2 rounded-xl border border-brand-border bg-brand-bg transition-colors duration-300", config.bgClass)}>
          <div className="relative w-5 h-5 flex items-center justify-center">
            {type === 'reach' && (
              <motion.div
                animate={prefersReducedMotion ? {} : { rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  ease: isHovered ? 'easeOut' : 'linear',
                  duration: isHovered ? globeHoverDuration : globeDuration,
                }}
                className="will-change-transform flex items-center justify-center"
              >
                <IconComponent className={cn("w-5 h-5", config.colorClass)} />
              </motion.div>
            )}

            {type === 'ai' && (
              <motion.div
                animate={(!prefersReducedMotion && isHovered) ? { rotate: [-5, 5, -5, 0] } : { rotate: 0 }}
                transition={{
                  duration: 0.6,
                  ease: 'easeInOut',
                }}
                className="flex items-center justify-center"
              >
                <IconComponent className={cn("w-5 h-5", config.colorClass)} />
              </motion.div>
            )}

            {type === 'revenue' && (
              <motion.div
                animate={(!prefersReducedMotion && isHovered) ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{
                  duration: 0.4,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                className="flex items-center justify-center"
              >
                <IconComponent className={cn("w-5 h-5", config.colorClass)} />
              </motion.div>
            )}

            {type === 'api' && (
              <motion.div
                animate={prefersReducedMotion ? {} : {
                  opacity: [0.85, 1, 0.85],
                  scale: [0.95, 1.03, 0.95]
                }}
                transition={{
                  duration: apiDuration,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
                className="will-change-transform flex items-center justify-center"
              >
                <IconComponent className={cn("w-5 h-5", config.colorClass)} />
              </motion.div>
            )}
          </div>
        </div>

        {/* Trend Indicator: remains completely static, color change only */}
        {trend && (
          <div className={cn(
            "flex items-center text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border transition-colors duration-300",
            isUp 
              ? "bg-brand-success/10 text-brand-success border-brand-success/20" 
              : "bg-brand-danger/10 text-brand-danger border-brand-danger/20"
          )}>
            {isUp ? (
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 shrink-0 text-brand-success" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 shrink-0 text-brand-danger" />
            )}
            {trend}
          </div>
        )}
      </div>

      <div className="z-10 mt-auto">
        <p className="text-2xl lg:text-3xl font-black text-brand-text tracking-tight font-sans">
          {value === null || value === undefined ? (
            "—"
          ) : (
            <CountUpValue value={value} />
          )}
        </p>
        <p className="text-xs text-brand-text-secondary font-mono uppercase truncate mt-1 tracking-wider">
          {title}
        </p>
      </div>

      {/* Modern glass-like ambient card bottom-right glow background effect */}
      <div 
        className={cn(
          "absolute -bottom-8 -right-8 w-24 h-24 rounded-full filter blur-xl opacity-10 transition-transform duration-700 z-0 group-hover:scale-150 pointer-events-none",
          type === 'reach' && "bg-brand-primary",
          type === 'ai' && "bg-brand-accent",
          type === 'revenue' && "bg-brand-success",
          type === 'api' && "bg-brand-warning"
        )} 
      />
    </motion.div>
  );
}
