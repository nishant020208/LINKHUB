import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  id,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}) => {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        checked
          ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/25'
          : 'bg-card/70 border-border/70 hover:border-primary/60 text-transparent',
        className
      )}
    >
      <motion.span
        initial={false}
        animate={checked ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className="flex items-center justify-center"
      >
        <Check className="w-3.5 h-3.5 stroke-[3]" />
      </motion.span>
    </button>
  );
};
