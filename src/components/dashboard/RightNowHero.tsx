import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  MapPin,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDueCountdown } from '@/lib/utils';
import { detectCalendarConflicts } from '@/lib/smart/conflicts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const RightNowHero: React.FC = () => {
  const { briefing, items, accounts } = useAppStore();
  const { user } = useAuthStore();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const conflicts = detectCalendarConflicts(items);

  // Find next upcoming calendar event (from 15 mins ago into the future)
  const nowTime = Date.now();
  const nextEvent = items
    .filter(
      (item) =>
        item.type === 'event' &&
        item.start_at &&
        new Date(item.start_at).getTime() >= nowTime - 15 * 60000
    )
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime())[0];

  // Find closest urgent deadline
  const urgentDeadline = items
    .filter(
      (item) => (item.type === 'deadline' || item.type === 'task') && !item.is_done && item.due_at
    )
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];

  const deadlineAccount = urgentDeadline
    ? accounts.find((a) => a.id === urgentDeadline.account_id)
    : null;
  const eventAccount = nextEvent
    ? accounts.find((a) => a.id === nextEvent.account_id)
    : null;

  // Live timer tick
  useEffect(() => {
    const updateCountdown = () => {
      if (!urgentDeadline?.due_at) {
        setTimeRemaining('');
        return;
      }
      const due = new Date(urgentDeadline.due_at).getTime();
      const current = Date.now();
      const diff = due - current;

      if (diff < 0) {
        const absDiff = Math.abs(diff);
        const mins = Math.floor((absDiff / (1000 * 60)) % 60);
        const hours = Math.floor(absDiff / (1000 * 60 * 60));
        setTimeRemaining(`-${hours}h ${mins}m`);
      } else {
        const mins = Math.floor((diff / (1000 * 60)) % 60);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        setTimeRemaining(`${hours}h ${mins}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 10000);
    return () => clearInterval(interval);
  }, [urgentDeadline?.due_at]);

  const countdownInfo = formatDueCountdown(urgentDeadline?.due_at);

  return (
    <div className="space-y-4">
      {/* Personalized Greeting Header */}
      {user && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Command Station &middot; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-foreground tracking-tight">
              Good day, {user.fullName?.split(' ')[0] || 'Member'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-muted/60 text-muted-foreground border border-border/50">
              {accounts.length} linked account{accounts.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}

      {/* Calendar Conflict Alert if detected */}
      {conflicts.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-status-warning/10 border border-status-warning/30 flex items-center justify-between gap-3 text-xs text-status-warning">
          <div className="flex items-center gap-2.5 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-status-warning" />
            <span>Schedule Conflict: Overlapping events detected across linked calendars.</span>
          </div>
          <Link to="/calendar" className="text-xs font-semibold underline underline-offset-2 hover:opacity-80">
            Resolve in Calendar &rarr;
          </Link>
        </div>
      )}

      {/* Daily Briefing Summary strip if present */}
      {briefing && (
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
          <div className="p-1.5 rounded-xl bg-primary text-primary-foreground shrink-0 mt-0.5">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
              Daily Strategic Focus
            </span>
            <p className="text-sm font-medium text-foreground mt-0.5 leading-relaxed">
              &ldquo;{briefing.summary}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Bento Dual Tile: Next Scheduled Meeting & Most Urgent Deadline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tile 1: Next Meeting */}
        <Card variant="bento" interactive className="p-5 flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Next Up
              </span>
              {eventAccount && (
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border border-border/60"
                  style={{ backgroundColor: `${eventAccount.color}15`, color: eventAccount.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: eventAccount.color }} />
                  {eventAccount.label}
                </span>
              )}
            </div>

            {nextEvent ? (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {nextEvent.title}
                  </h4>
                  {nextEvent.url && (
                    <a
                      href={nextEvent.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-muted-foreground hover:text-foreground shrink-0 rounded-lg hover:bg-muted/60"
                      title="Open event link"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {nextEvent.metadata?.location && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {nextEvent.metadata.location}
                    </span>
                  )}
                  {!nextEvent.metadata?.location && (
                    <span>{nextEvent.description || 'No location specified'}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-3 text-xs text-muted-foreground">
                No upcoming events on your schedule for today.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
            {nextEvent ? (
              <div className="flex items-center gap-1.5 font-mono text-xs text-primary font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {new Date(nextEvent.start_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {new Date(nextEvent.end_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-muted-foreground">Schedule Clear</span>
            )}
            <Link to="/calendar" className="text-xs text-muted-foreground hover:text-foreground font-mono">
              View Calendar &rarr;
            </Link>
          </div>
        </Card>

        {/* Tile 2: Urgent Deadline */}
        <Card variant="bento" interactive className="p-5 flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5 text-status-warning" />
                Most Urgent Deadline
              </span>
              {deadlineAccount && (
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border border-border/60"
                  style={{ backgroundColor: `${deadlineAccount.color}15`, color: deadlineAccount.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: deadlineAccount.color }} />
                  {deadlineAccount.label}
                </span>
              )}
            </div>

            {urgentDeadline ? (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display font-bold text-base sm:text-lg text-foreground group-hover:text-status-warning transition-colors line-clamp-1">
                    {urgentDeadline.title}
                  </h4>
                  {urgentDeadline.url && (
                    <a
                      href={urgentDeadline.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-muted-foreground hover:text-foreground shrink-0 rounded-lg hover:bg-muted/60"
                      title="Open assignment link"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {urgentDeadline.metadata?.course_name || urgentDeadline.description || 'Action required'}
                </p>
              </div>
            ) : (
              <div className="py-3 text-xs text-status-connected flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>All deadlines completed. Nothing pending!</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
            {urgentDeadline ? (
              <div className="flex items-center gap-2 font-mono text-xs">
                <Badge
                  tone={countdownInfo.isOverdue ? 'danger' : 'warning'}
                  icon={<Clock className="w-3 h-3" />}
                >
                  {countdownInfo.label} {timeRemaining && `(${timeRemaining})`}
                </Badge>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-muted-foreground">Queue Zero</span>
            )}
            <Link to="/deadlines" className="text-xs text-muted-foreground hover:text-foreground font-mono">
              All Deadlines &rarr;
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
