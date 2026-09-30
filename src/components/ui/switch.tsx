import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
  disabled?: boolean;
}

/** Animated toggle switch with spring micro-interaction. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, className, disabled }) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative w-10 h-6 rounded-full border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50',
      checked ? 'bg-primary border-primary/60' : 'bg-muted border-border',
      className
    )}
  >
    <motion.span
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      className={cn(
        'absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm',
        checked ? 'right-0.5' : 'left-0.5'
      )}
    />
  </button>
);
