import React, { useState } from 'react';
import {
  Clock,
  ExternalLink,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { Item } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatDueCountdown } from '@/lib/utils';
import { SnoozeModal } from './SnoozeModal';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MetricCounter } from '@/components/ui/metric-counter';
import { useLiveAnnouncer } from '@/components/ui/live-announcer';

export const DeadlinesBoard: React.FC = () => {
  const { items, accounts, markItemDone, snoozeItem } = useAppStore();
  const [snoozeItemId, setSnoozeItemId] = useState<string | null>(null);
  const { announce } = useLiveAnnouncer();

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

  const deadlineProviders = Array.from(
    new Set(
      accounts.map((a) => {
        if (a.provider === 'google') return 'Google Tasks & Classroom';
        if (a.provider === 'microsoft') return 'Outlook / To-Do';
        if (a.provider === 'github') return 'GitHub Issues';
        if (a.provider === 'canvas') return 'Canvas LMS';
        return a.label || a.provider;
      })
    )
  );

  const subtitleText =
    deadlineProviders.length > 0
      ? `Aggregated across ${deadlineProviders.join(', ')}`
      : 'Connect Google, Outlook, or Canvas to aggregate deadlines';

  const handleToggleDone = (item: Item) => {
    const nextState = !item.is_done;
    markItemDone(item.id, nextState);
    announce(
      nextState
        ? `Task "${item.title}" marked as completed.`
        : `Task "${item.title}" restored to active.`
    );
  };

  const renderItemRow = (item: Item) => {
    const account = accounts.find((a) => a.id === item.account_id);
    const countdown = formatDueCountdown(item.due_at);

    return (
      <div
        key={item.id}
        className={`group flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
          item.is_done
            ? 'bg-muted/20 border-border/30 opacity-60'
            : countdown.urgency === 'critical'
            ? 'bg-status-error/10 border-status-error/30 hover:border-status-error/50'
            : countdown.urgency === 'high'
            ? 'bg-status-warning/10 border-status-warning/30 hover:border-status-warning/50'
            : 'bg-card/60 border-border/50 hover:border-border'
        }`}
      >
        {/* Accessible Checkbox with spring animation */}
        <div className="pt-0.5">
          <Checkbox
            checked={item.is_done}
            onCheckedChange={() => handleToggleDone(item)}
            aria-label={`Mark "${item.title}" as ${item.is_done ? 'pending' : 'completed'}`}
          />
        </div>

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
              <Badge tone="neutral">
                {item.metadata.course_name}
              </Badge>
            )}

            {item.priority_score >= 85 && !item.is_done && (
              <Badge tone="danger" icon={<Flame className="w-3 h-3 text-status-error" />}>
                Urgent
              </Badge>
            )}
          </div>

          <h5
            className={`font-semibold text-sm text-foreground transition-all leading-snug ${
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
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                  countdown.isOverdue
                    ? 'bg-status-error/20 text-status-error font-semibold'
                    : countdown.urgency === 'critical'
                    ? 'bg-status-warning/20 text-status-warning'
                    : 'text-muted-foreground bg-muted/50'
                }`}
              >
                <Clock className="w-3 h-3" />
                {countdown.label}
              </span>
            </div>

            {/* Quick Actions (Snooze & Link) */}
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {!item.is_done && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      snoozeItem(item.id, 3);
                      announce(`Snoozed "${item.title}" for 3 hours.`);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-lg hover:bg-muted font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Snooze for 3 hours"
                  >
                    +3h
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      snoozeItem(item.id, 24);
                      announce(`Snoozed "${item.title}" for 1 day.`);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-lg hover:bg-muted font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Snooze for 1 day"
                  >
                    +1d
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnoozeItemId(item.id)}
                    className="text-[11px] px-2 py-0.5 rounded-lg hover:bg-muted font-mono text-primary cursor-pointer"
                    title="More snooze options"
                  >
                    More
                  </button>
                </>
              )}

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
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
    <Card variant="bento" className="space-y-4">
      {/* Board Header & Progress */}
      <CardHeader>
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Unified Deadlines</CardTitle>
            <Badge tone="accent">
              <MetricCounter value={overdue.length + dueToday.length} /> due today
            </Badge>
          </div>
          <CardDescription>
            {subtitleText}
          </CardDescription>
        </div>

        {/* Progress Metric */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono font-semibold text-foreground">
              <MetricCounter value={completedCount} /> / {totalCount} done
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              <MetricCounter value={progressPercent} suffix="%" /> complete
            </div>
          </div>
          <div className="w-12 h-2 bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardBody className="space-y-5 pt-0">
        {/* Overdue Section */}
        {overdue.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono text-status-error font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-status-error animate-ping" />
              Overdue ({overdue.length})
            </div>
            <div className="space-y-2">{overdue.map(renderItemRow)}</div>
          </div>
        )}

        {/* Due Today */}
        {dueToday.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono text-status-warning font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-status-warning" />
              Due Today ({dueToday.length})
            </div>
            <div className="space-y-2">{dueToday.map(renderItemRow)}</div>
          </div>
        )}

        {/* Due This Week */}
        {dueThisWeek.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono text-primary font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-primary" />
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
            <summary className="text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-between py-1">
              <span>Completed ({completed.length})</span>
              <span className="text-[11px] underline">Toggle list</span>
            </summary>
            <div className="space-y-2 mt-3">{completed.map(renderItemRow)}</div>
          </details>
        )}

        {/* Empty State */}
        {deadlines.length === 0 && (
          <div className="py-10 text-center text-xs font-mono space-y-2 border border-dashed border-border/60 rounded-2xl p-6">
            <CheckCircle2 className="w-8 h-8 text-status-connected mx-auto" />
            <p className="text-foreground font-semibold text-sm">No deadlines or tasks pending</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Synchronized coursework, Google Tasks, and GitHub issues will appear here automatically.
            </p>
          </div>
        )}
      </CardBody>

      {/* Snooze Modal */}
      <SnoozeModal itemId={snoozeItemId} onClose={() => setSnoozeItemId(null)} />
    </Card>
  );
};
