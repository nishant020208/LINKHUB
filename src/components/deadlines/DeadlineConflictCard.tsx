import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Layers,
  ArrowRight,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DeadlineCluster, getItemSourceLabel } from '@/lib/smart/deadlineConflicts';
import { useAppStore } from '@/store/useAppStore';
import { useToastStore } from '@/components/ui/toast';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { queryKeys } from '@/lib/queryKeys';
import { formatDueCountdown, cn } from '@/lib/utils';
import { Item } from '@/types';

interface DeadlineConflictCardProps {
  cluster: DeadlineCluster;
  onDismiss?: (clusterId: string) => void;
  className?: string;
}

export const DeadlineConflictCard: React.FC<DeadlineConflictCardProps> = ({
  cluster,
  onDismiss,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [snoozingItemId, setSnoozingItemId] = useState<string | null>(null);
  const { snoozeItem, markItemDone, accounts } = useAppStore();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.toast);

  const handleSnooze = async (item: Item, hours: number) => {
    setSnoozingItemId(item.id);
    try {
      // 1. Update client store
      snoozeItem(item.id, hours);

      // 2. Persist to Supabase if authenticated
      if (env.isConfigured.supabase && item.due_at) {
        const currentDueMs = new Date(item.due_at).getTime();
        const newDueMs = currentDueMs + hours * 3600 * 1000;
        const newDue = new Date(newDueMs).toISOString();
        const snoozedUntil = new Date(Date.now() + hours * 3600 * 1000).toISOString();

        const { error } = await supabase
          .from('items')
          .update({
            due_at: newDue,
            snoozed_until: snoozedUntil,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (error) {
          console.warn('Could not persist snooze to Supabase:', error.message);
        } else {
          queryClient.invalidateQueries({ queryKey: queryKeys.items });
        }
      }

      toast({
        title: 'Deadline Adjusted',
        message: `Postponed "${item.title}" by ${hours} hours. Cluster recalibrated.`,
        kind: 'success',
      });
    } catch (err: unknown) {
      toast({
        title: 'Failed to reschedule',
        message: err instanceof Error ? err.message : 'An error occurred.',
        kind: 'error',
      });
    } finally {
      setSnoozingItemId(null);
    }
  };

  const handleComplete = async (item: Item) => {
    try {
      markItemDone(item.id, true);

      if (env.isConfigured.supabase) {
        await supabase
          .from('items')
          .update({
            is_done: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        queryClient.invalidateQueries({ queryKey: queryKeys.items });
      }

      toast({
        title: 'Task Finished',
        message: `Marked "${item.title}" as complete.`,
        kind: 'success',
      });
    } catch {
      // Fallback
    }
  };

  const severityBadgeClass =
    cluster.severity === 'critical'
      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      : cluster.severity === 'heavy'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-sky-500/10 text-sky-400 border-sky-500/30';

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200 overflow-hidden',
        cluster.severity === 'critical'
          ? 'bg-rose-950/15 border-rose-500/30 shadow-sm'
          : 'bg-amber-950/15 border-amber-500/30 shadow-sm',
        className
      )}
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2.5 rounded-xl border mt-0.5 shrink-0',
              cluster.severity === 'critical'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            )}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-sm sm:text-base text-foreground tracking-tight">
                Heavy Friction Ahead: Overlapping Deadlines
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border font-medium',
                  severityBadgeClass
                )}
              >
                {cluster.severity === 'critical'
                  ? 'Critical Crunch'
                  : cluster.severity === 'heavy'
                  ? 'Heavy Cluster'
                  : 'Moderate Cluster'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {cluster.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium border border-border/60 bg-card/60 hover:bg-card text-foreground transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>{isExpanded ? 'Hide Items' : `Review ${cluster.items.length} Items`}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {onDismiss && (
            <button
              type="button"
              onClick={() => onDismiss(cluster.id)}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Acknowledge and dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Cluster Breakdown */}
      {isExpanded && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-border/40 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 py-1">
            <span>Clustered Tasks ({cluster.items.length})</span>
            <span>Recommended: Stagger by +24h to relieve crunch</span>
          </div>

          <div className="space-y-2">
            {cluster.items.map((item) => {
              const account = accounts.find((a) => a.id === item.account_id);
              const sourceLabel = getItemSourceLabel(item, accounts);
              const countdown = item.due_at ? formatDueCountdown(item.due_at) : null;
              const isProcessing = snoozingItemId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleComplete(item)}
                      title="Mark as done"
                      className="mt-0.5 text-muted-foreground hover:text-emerald-400 transition-colors shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: account?.color || '#e8a54b' }}
                        />
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {sourceLabel}
                        </span>
                        {countdown && (
                          <span
                            className={cn(
                              'text-[10px] font-mono px-1.5 py-0.2 rounded border',
                              countdown.isOverdue
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-muted/60 text-muted-foreground border-border/40'
                            )}
                          >
                            {countdown.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground truncate max-w-md">
                        {item.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSnooze(item, 24)}
                      className="px-2.5 py-1 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted text-[11px] font-mono text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
                      title="Reschedule by 24 hours"
                    >
                      +24h
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSnooze(item, 48)}
                      className="px-2.5 py-1 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted text-[11px] font-mono text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
                      title="Reschedule by 48 hours"
                    >
                      +48h
                    </button>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Open external source"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
