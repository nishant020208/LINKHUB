import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Button — the single button primitive for the whole app.
 * Variants cover every existing use; no one-off button styling allowed.
 */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:brightness-110 active:brightness-95 border border-transparent',
  secondary:
    'bg-card/70 text-foreground border border-border/60 hover:bg-card hover:border-border shadow-none hover:shadow-sm',
  ghost:
    'bg-transparent text-muted-foreground border border-transparent hover:bg-muted/60 hover:text-foreground',
  danger:
    'bg-transparent text-muted-foreground border border-border/60 hover:bg-status-error/10 hover:text-status-error hover:border-status-error/40',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-xl gap-1.5',
  md: 'text-sm px-4 py-2 rounded-2xl gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'sm', iconOnly, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'inline-flex items-center justify-center font-medium cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:pointer-events-none transition-colors',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        iconOnly && 'p-2',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
);
Button.displayName = 'Button';
