import React from 'react';
import { motion, type HTMLMotionProps, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type CardVariant = 'bento' | 'subtle' | 'elevated' | 'flat';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: CardVariant;
  interactive?: boolean;
  delay?: number;
  tilt?: boolean;
}

const VARIANT_STYLES: Record<CardVariant, string> = {
  bento:
    'rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-card',
  subtle:
    'rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md',
  elevated:
    'rounded-3xl border border-border/70 bg-card/90 backdrop-blur-2xl shadow-xl shadow-black/10',
  flat:
    'rounded-2xl border border-border/30 bg-muted/30',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'bento', interactive = false, delay = 0, tilt = false, children, ...props }, ref) => {
    const reduce = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        initial={interactive && !reduce ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.3, delay: reduce ? 0 : delay, ease: [0.21, 0.47, 0.32, 0.98] }}
        whileHover={
          interactive && !reduce
            ? {
                y: -3,
                rotateX: tilt ? 3 : 0,
                rotateY: tilt ? -2 : 0,
                transition: { type: 'spring', stiffness: 420, damping: 28 },
              }
            : undefined
        }
        whileTap={interactive && !reduce ? { scale: 0.985 } : undefined}
        className={cn(
          'relative overflow-hidden',
          VARIANT_STYLES[variant],
          interactive &&
            'hover:border-primary/40 hover:shadow-card-hover cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
          tilt && 'tilt-hover',
          className
        )}
        style={tilt ? { transformStyle: 'preserve-3d', perspective: 800 } : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div className={cn('flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/40', className)}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <h3 className={cn('font-display font-bold text-base sm:text-lg text-foreground tracking-tight', className)}>
    {children}
  </h3>
);

export const CardDescription: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <p className={cn('text-xs text-muted-foreground mt-0.5 leading-relaxed', className)}>
    {children}
  </p>
);

export const CardBody: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div className={cn('p-4 sm:p-5', className)}>{children}</div>
);

export const CardFooter: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div className={cn('px-5 py-3 border-t border-border/40 flex items-center justify-between gap-2', className)}>
    {children}
  </div>
);
