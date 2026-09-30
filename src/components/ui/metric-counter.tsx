import React, { useEffect } from 'react';
import { useSpring, useTransform, motion } from 'framer-motion';

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
  const spring = useSpring(0, { stiffness: 90, damping: 20 });
  const display = useTransform(spring, (current) => `${prefix}${Math.round(current)}${suffix}`);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span className={`inline-block font-mono font-tabular ${className || ''}`}>
      {display}
    </motion.span>
  );
};
