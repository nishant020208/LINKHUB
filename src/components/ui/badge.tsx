import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Canonical status model. Every surface that shows account/stream health —
 * account cards, sync status panel, integrations page — uses this map so
 * colors mean exactly one thing across the app.
 */
export type CanonicalStatus = 'connected' | 'syncing' | 'needs_reconnect' | 'error' | 'paused' | 'idle';

export const STATUS_TONES: Record<CanonicalStatus, { dot: string; badge: string; label: string }> = {
  connected: {
    dot: 'bg-status-connected',
    badge: 'bg-status-connected/10 text-status-connected border-status-connected/30',
    label: 'Connected',
  },
  syncing: {
    dot: 'bg-status-syncing animate-pulse',
    badge: 'bg-status-syncing/10 text-status-syncing border-status-syncing/30',
    label: 'Syncing',
  },
  needs_reconnect: {
    dot: 'bg-status-warning',
    badge: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    label: 'Needs Reconnect',
  },
  error: {
    dot: 'bg-status-error',
    badge: 'bg-status-error/10 text-status-error border-status-error/30',
    label: 'Error',
  },
  paused: {
    dot: 'bg-muted-foreground/50',
    badge: 'bg-muted/60 text-muted-foreground border-border/50',
    label: 'Paused',
  },
  idle: {
    dot: 'bg-muted-foreground/40',
    badge: 'bg-muted/50 text-muted-foreground border-border/40',
    label: 'Idle',
  },
};

export const StatusDot: React.FC<{ status: CanonicalStatus; className?: string }> = ({ status, className }) => (
  <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', STATUS_TONES[status].dot, className)} />
);

interface BadgeProps {
  status?: CanonicalStatus;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const TONE_CLASSES = {
  success: 'bg-status-connected/10 text-status-connected border-status-connected/30',
  warning: 'bg-status-warning/10 text-status-warning border-status-warning/30',
  danger: 'bg-status-error/10 text-status-error border-status-error/30',
  info: 'bg-status-syncing/10 text-status-syncing border-status-syncing/30',
  neutral: 'bg-muted/60 text-muted-foreground border-border/50',
  accent: 'bg-primary/10 text-primary border-primary/30',
};

export const Badge: React.FC<BadgeProps> = ({ status, tone, children, className, icon }) => {
  const cls = status ? STATUS_TONES[status].badge : TONE_CLASSES[tone ?? 'neutral'];
  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold uppercase tracking-wide whitespace-nowrap',
        cls,
        className
      )}
    >
      {status && <StatusDot status={status} />}
      {icon}
      {children}
    </motion.span>
  );
};
