import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, className, disabled }) => {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-7 min-w-[44px] min-h-[28px] rounded-full border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50',
        checked ? 'bg-primary border-primary/60' : 'bg-muted border-border',
        className
      )}
    >
      <motion.span
        layout
        transition={reduce ? { duration: 0.01 } : { type: 'spring', stiffness: 520, damping: 32 }}
        className={cn(
          'absolute top-0.5 w-[22px] h-[22px] rounded-full bg-white shadow-sm',
          checked ? 'right-0.5' : 'left-0.5'
        )}
      />
    </button>
  );
};
