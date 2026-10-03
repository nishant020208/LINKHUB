import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSyncData } from '@/hooks/useSyncData';
import { useAppStore } from '@/store/useAppStore';
import { BoardSkeleton } from '@/components/ui/skeleton';
import { DeadlinesBoard } from '@/components/dashboard/DeadlinesBoard';
import { DeadlineConflictCard } from '@/components/deadlines/DeadlineConflictCard';
import { detectDeadlineConflicts } from '@/lib/smart/deadlineConflicts';
import { formatDueCountdown } from '@/lib/utils';
import { Item } from '@/types';

/**
 * Deadlines — focused queue of everything with a due date.
 * Filters persist in the URL (?account=<id>&type=<type>) so refresh and
 * back/forward preserve user context.
 */
export const DeadlinesPage: React.FC = () => {
  const { isLoading } = useSyncData();
  const { accounts, items } = useAppStore();
  const [params, setParams] = useSearchParams();

  const accountFilter = params.get('account') ?? '';
  const typeFilter = params.get('type') ?? '';

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtered = (items || []).filter((item: Item) => {
    if (!item) return false;
    if (item.type !== 'deadline' && item.type !== 'task') return false;
    if (accountFilter && item.account_id !== accountFilter) return false;
    if (typeFilter && item.type !== typeFilter) return false;
    return true;
  });

  const open = filtered.filter((i) => !i.is_done);
  const overdue = open.filter((i) => {
    if (!i.due_at) return false;
    const t = new Date(i.due_at).getTime();
    return !isNaN(t) && t < Date.now();
  });
  const next = open
    .filter((i) => i.due_at && !isNaN(new Date(i.due_at).getTime()))
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];

  const deadlineClusters = React.useMemo(
    () => detectDeadlineConflicts(filtered, accounts),
    [filtered, accounts]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="font-display font-bold text-2xl">Deadlines</h2>
        <BoardSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground">Deadlines Queue</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {open.length} open &middot; {overdue.length} overdue
            {next?.due_at && ` &middot; next: ${formatDueCountdown(next.due_at).label}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Account filter chips — URL-backed */}
          {accounts.map((acc) => {
            const isSelected = accountFilter === acc.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => setFilter('account', isSelected ? '' : acc.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary/50 bg-primary/10 text-primary font-semibold shadow-sm'
                    : 'border-border/50 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                <span>{acc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {deadlineClusters.length > 0 && (
        <div className="space-y-3">
          {deadlineClusters.map((cluster) => (
            <DeadlineConflictCard key={cluster.id} cluster={cluster} />
          ))}
        </div>
      )}

      <DeadlinesBoard itemsOverride={filtered} />
    </div>
  );
};
