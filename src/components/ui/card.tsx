import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Card — the single surface primitive. Elevation, border, and hover behavior
 * are defined once here so every panel reads as the same material.
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  delay?: number;
}

export const Card: React.FC<CardProps> = ({ className, interactive, delay = 0, children, ...props }) => (
  <motion.div
    initial={interactive ? { opacity: 0, y: 12 } : false}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    className={cn(
      'rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-card',
      interactive &&
        'hover:border-border hover:shadow-card-hover hover:-translate-y-0.5 transition-[border-color,box-shadow,transform] duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
      className
    )}
    {...(props as any)}
  >
    {children}
  </motion.div>
);

export const CardHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/40', className)}>
    {children}
  </div>
);

export const CardBody: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('p-4 sm:p-5', className)}>{children}</div>
);
