import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import { useSyncData } from '@/hooks/useSyncData';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { BoardSkeleton } from '@/components/ui/skeleton';
import { DeadlinesBoard } from '@/components/dashboard/DeadlinesBoard';
import { formatDueCountdown } from '@/lib/utils';
import { Item } from '@/types';

/**
 * Deadlines — focused queue of everything with a due date.
 * Filters persist in the URL (?account=<id>&type=<type>) so refresh and
 * back/forward keep the user's context.
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

  const filtered = items.filter((item: Item) => {
    if (item.type !== 'deadline' && item.type !== 'task') return false;
    if (accountFilter && item.account_id !== accountFilter) return false;
    if (typeFilter && item.type !== typeFilter) return false;
    return true;
  });

  const open = filtered.filter((i) => !i.is_done);
  const overdue = open.filter((i) => i.due_at && new Date(i.due_at) < new Date());
  const next = open
    .filter((i) => i.due_at)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];

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
          <h2 className="font-display font-bold text-2xl">Deadlines</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {open.length} open &middot; {overdue.length} overdue
            {next?.due_at && ` &middot; next: ${formatDueCountdown(next.due_at).label}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Account filter chips — URL-backed */}
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => setFilter('account', accountFilter === acc.id ? '' : acc.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                accountFilter === acc.id
                  ? 'border-primary/40 bg-primary/10 text-foreground font-semibold'
                  : 'border-border/40 bg-card/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Queue</h3>
            <Badge tone="neutral">{filtered.length}</Badge>
          </div>
          {typeFilter && (
            <button
              onClick={() => setFilter('type', '')}
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              clear type filter: {typeFilter}
            </button>
          )}
        </CardHeader>
        <CardBody>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="w-5 h-5" />}
              title="No deadlines match"
              description={
                accounts.length === 0
                  ? 'Connect an account to start pulling in coursework and tasks.'
                  : 'Try clearing the account or type filter.'
              }
            />
          ) : (
            <DeadlinesBoard />
          )}
        </CardBody>
      </Card>
    </div>
  );
};
