import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Button — the unified button primitive for the entire application.
 * All interactive buttons across every view use this component with
 * consistent hover lift, active spring, and visible focus rings.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 hover:brightness-110 active:brightness-95 border border-transparent',
  secondary:
    'bg-card/80 text-foreground border border-border/70 hover:bg-card hover:border-border shadow-none hover:shadow-sm',
  outline:
    'bg-transparent text-foreground border border-border/80 hover:bg-muted/60 hover:border-border',
  ghost:
    'bg-transparent text-muted-foreground border border-transparent hover:bg-muted/60 hover:text-foreground',
  danger:
    'bg-status-error/10 text-status-error border border-status-error/30 hover:bg-status-error/20 hover:border-status-error/50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'text-[11px] px-2.5 py-1 rounded-lg gap-1 font-medium',
  sm: 'text-xs px-3 py-1.5 rounded-xl gap-1.5 font-medium',
  md: 'text-sm px-4 py-2 rounded-2xl gap-2 font-semibold',
  lg: 'text-base px-5 py-2.5 rounded-2xl gap-2.5 font-semibold',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'sm', iconOnly, isLoading, disabled, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      whileHover={disabled || isLoading ? undefined : { y: -1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center cursor-pointer select-none transition-colors whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        iconOnly && (size === 'xs' ? 'p-1.5' : size === 'sm' ? 'p-2' : 'p-2.5'),
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
      {children}
    </motion.button>
  )
);
Button.displayName = 'Button';
