import React from 'react';
import {
  Clock,
  ExternalLink,
  Flame,
  Check,
} from 'lucide-react';
import { Item } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatDueCountdown } from '@/lib/utils';

export const DeadlinesBoard: React.FC = () => {
  const { items, accounts, markItemDone, snoozeItem } = useAppStore();

  const deadlines = items.filter(
    (item) => item.type === 'deadline' || item.type === 'task'
  );

  const completedCount = deadlines.filter((d) => d.is_done).length;
  const totalCount = deadlines.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Grouping
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const endOfWeek = new Date(now.getTime() + 7 * 86400 * 1000);

  const overdue = deadlines.filter((d) => !d.is_done && d.due_at && new Date(d.due_at) < now);
  const dueToday = deadlines.filter(
    (d) => !d.is_done && d.due_at && new Date(d.due_at) >= now && new Date(d.due_at) <= endOfToday
  );
  const dueThisWeek = deadlines.filter(
    (d) => !d.is_done && d.due_at && new Date(d.due_at) > endOfToday && new Date(d.due_at) <= endOfWeek
  );
  const dueLater = deadlines.filter(
    (d) => !d.is_done && (!d.due_at || new Date(d.due_at) > endOfWeek)
  );
  const completed = deadlines.filter((d) => d.is_done);

  const renderItemRow = (item: Item) => {
    const account = accounts.find((a) => a.id === item.account_id);
    const countdown = formatDueCountdown(item.due_at);

    return (
      <div
        key={item.id}
        className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
          item.is_done
            ? 'bg-muted/30 border-border/30 opacity-60'
            : countdown.urgency === 'critical'
            ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
            : countdown.urgency === 'high'
            ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
            : 'bg-card/50 border-border/40 hover:border-border/80'
        }`}
      >
        {/* Complete Toggle Checkbox */}
        <button
          onClick={() => markItemDone(item.id, !item.is_done)}
          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
            item.is_done
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-muted-foreground/40 hover:border-primary text-transparent hover:text-primary/40'
          }`}
          title={item.is_done ? 'Mark as pending' : 'Mark as completed'}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {account && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border border-border/60"
                style={{ backgroundColor: `${account.color}15`, color: account.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: account.color }} />
                {account.label}
              </span>
            )}

            {item.metadata?.course_name && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {item.metadata.course_name}
              </span>
            )}

            {item.priority_score >= 85 && !item.is_done && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-rose-400 font-semibold">
                <Flame className="w-3 h-3 text-rose-500" />
                Urgent
              </span>
            )}
          </div>

          <h5
            className={`font-medium text-sm text-foreground transition-all ${
              item.is_done ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {item.title}
          </h5>

          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
          )}

          {/* Time & actions footer */}
          <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                  countdown.isOverdue
                    ? 'bg-rose-500/20 text-rose-300 font-semibold'
                    : countdown.urgency === 'critical'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-muted-foreground'
                }`}
              >
                <Clock className="w-3 h-3" />
                {countdown.label}
              </span>
            </div>

            {/* Quick Actions (Snooze & Link) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!item.is_done && (
                <>
                  <button
                    onClick={() => snoozeItem(item.id, 3)}
                    className="text-[11px] px-2 py-0.5 rounded hover:bg-muted font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Snooze for 3 hours"
                  >
                    +3h
                  </button>
                  <button
                    onClick={() => snoozeItem(item.id, 24)}
                    className="text-[11px] px-2 py-0.5 rounded hover:bg-muted font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Snooze for 1 day"
                  >
                    +1d
                  </button>
                </>
              )}

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Open in provider"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl glass-panel border border-border/60 p-5 shadow-xl space-y-6">
      {/* Board Header & Progress Ring / Bar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-lg text-foreground">Unified Deadlines</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-muted text-muted-foreground">
              {overdue.length + dueToday.length} due today
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated across Canvas, Outlook, Google Tasks, and GitHub
          </p>
        </div>

        {/* Progress Metric */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono font-semibold text-foreground">
              {completedCount} / {totalCount} done
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">{progressPercent}% complete</div>
          </div>
          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-rose-400 font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            Overdue ({overdue.length})
          </div>
          <div className="space-y-2">{overdue.map(renderItemRow)}</div>
        </div>
      )}

      {/* Due Today */}
      {dueToday.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Due Today ({dueToday.length})
          </div>
          <div className="space-y-2">{dueToday.map(renderItemRow)}</div>
        </div>
      )}

      {/* Due This Week */}
      {dueThisWeek.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-sky-400 font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            This Week ({dueThisWeek.length})
          </div>
          <div className="space-y-2">{dueThisWeek.map(renderItemRow)}</div>
        </div>
      )}

      {/* Due Later */}
      {dueLater.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Later ({dueLater.length})
          </div>
          <div className="space-y-2">{dueLater.map(renderItemRow)}</div>
        </div>
      )}

      {/* Completed items accordion preview */}
      {completed.length > 0 && (
        <details className="pt-2 border-t border-border/40 group">
          <summary className="text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-between">
            <span>Completed ({completed.length})</span>
            <span className="text-[11px] underline">Toggle list</span>
          </summary>
          <div className="space-y-2 mt-3">{completed.map(renderItemRow)}</div>
        </details>
      )}
    </div>
  );
};
