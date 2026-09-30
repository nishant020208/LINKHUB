import React from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; to?: string };
  className?: string;
}

/** The single empty-state treatment used by every widget and page. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center text-center py-10 px-6 space-y-3', className)}>
    <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border/40 text-muted-foreground flex items-center justify-center">
      {icon ?? <Inbox className="w-5 h-5" />}
    </div>
    <div className="space-y-1 max-w-sm">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
    </div>
    {action && (
      <Button variant="secondary" size="sm" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);

/** The single error treatment: shows the real error text so failures are visible. */
export const ErrorNotice: React.FC<{ message: string; title?: string; className?: string }> = ({
  message,
  title = 'Something went wrong',
  className,
}) => (
  <div
    className={cn(
      'flex items-start gap-2.5 p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-xs',
      className
    )}
  >
    <AlertTriangle className="w-4 h-4 shrink-0 text-status-error mt-0.5" />
    <div className="min-w-0">
      <p className="font-semibold text-status-error">{title}</p>
      <p className="text-status-error/80 font-mono break-words mt-0.5 leading-snug">{message}</p>
    </div>
  </div>
);
