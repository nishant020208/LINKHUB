import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const SPECKS = [
  { dx: -18, dy: -22, hue: 'var(--status-connected)' },
  { dx: 16, dy: -24, hue: 'var(--primary)' },
  { dx: 22, dy: 8, hue: 'var(--status-syncing)' },
  { dx: -20, dy: 10, hue: 'var(--primary)' },
  { dx: 4, dy: -28, hue: 'var(--status-connected)' },
  { dx: -6, dy: 18, hue: 'var(--status-warning)' },
];

export const CompleteBurst: React.FC<{ active: boolean }> = ({ active }) => {
  const reduce = useReducedMotion();
  if (!active || reduce) return null;

  return (
    <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {SPECKS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: s.hue }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: s.dx, y: s.dy, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.42, ease: 'easeOut', delay: i * 0.02 }}
        />
      ))}
    </span>
  );
};
