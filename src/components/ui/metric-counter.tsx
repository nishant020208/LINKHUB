import React, { useEffect } from 'react';
import { useSpring, useTransform, motion, useReducedMotion } from 'framer-motion';

export interface MetricCounterProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

export const MetricCounter: React.FC<MetricCounterProps> = ({
  value,
  className,
  prefix = '',
  suffix = '',
}) => {
  const reduce = useReducedMotion();
  const spring = useSpring(reduce ? value : 0, { stiffness: 90, damping: 20 });
  const display = useTransform(spring, (current) => `${prefix}${Math.round(current)}${suffix}`);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  if (reduce) {
    return (
      <span className={`inline-block font-mono font-tabular ${className || ''}`}>
        {prefix}{Math.round(value)}{suffix}
      </span>
    );
  }

  return (
    <motion.span className={`inline-block font-mono font-tabular ${className || ''}`}>
      {display}
    </motion.span>
  );
};
