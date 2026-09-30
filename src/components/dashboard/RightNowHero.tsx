import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Clock, Calendar, AlertCircle, ArrowUpRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDueCountdown } from '@/lib/utils';
import { detectCalendarConflicts } from '@/lib/smart/conflicts';

export const RightNowHero: React.FC = () => {
  const { briefing, items, accounts } = useAppStore();
  const { user } = useAuthStore();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const conflicts = detectCalendarConflicts(items);

  // Find next upcoming calendar event
  const nowTime = new Date().getTime();
  const nextEvent = items
    .filter((item) => item.type === 'event' && item.start_at && new Date(item.start_at).getTime() >= nowTime - 15 * 60000)
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime())[0];

  // Find closest urgent deadline
  const urgentDeadline = items
    .filter((item) => (item.type === 'deadline' || item.type === 'task') && !item.is_done && item.due_at)
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
    <div className="relative overflow-hidden rounded-2xl glass-panel border border-border/60 p-4 sm:p-5 md:p-6 mb-6 md:mb-8 shadow-xl">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-96 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* User Greeting & Identity Header */}
      {user && (
        <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-border/40">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl object-cover ring-2 ring-primary/30 shadow-md shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Personalized Hub</div>
              <h2 className="font-heading font-bold text-base sm:text-lg md:text-xl text-foreground truncate">
                Welcome back, {user.fullName}
              </h2>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-muted/60 text-muted-foreground border border-border/50 whitespace-nowrap">
              {accounts.length} linked account{accounts.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}

      {/* Zero Accounts Active State */}
      {accounts.length === 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-heading font-semibold text-sm text-foreground">
                Ready to Connect Your Accounts
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add your Google, Microsoft, iCal, or LMS accounts in Integrations to begin live synchronization.
              </p>
            </div>
          </div>
          <Link
            to="/integrations"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all text-center shrink-0 cursor-pointer shadow-sm"
          >
            Connect Providers &rarr;
          </Link>
        </div>
      )}

      {/* AI Daily Briefing Sentence */}
      {briefing && (
        <div className="flex items-start gap-3 pb-5 mb-5 border-b border-border/40">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-semibold">
                Daily Focus &middot; {briefing.date}
              </span>
            </div>
            <p className="text-sm md:text-base text-foreground font-medium leading-relaxed">
              &ldquo;{briefing.summary}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Calendar Conflict Alert if detected */}
      {conflicts.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Schedule Overlap Detected:</strong> {conflicts[0].eventA.title} and {conflicts[0].eventB.title} overlap across connected accounts.
            </span>
          </div>
          <span className="shrink-0 font-mono text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40">
            {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Hero "Right Now" Dual Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Next Calendar Event */}
        <div className="p-4 rounded-xl bg-card/40 border border-border/40 flex flex-col justify-between hover:border-sky-500/30 transition-all group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              Next Scheduled
            </span>
            {eventAccount && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border/60">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: eventAccount.color }} />
                {eventAccount.label}
              </span>
            )}
          </div>

          {nextEvent ? (
            <div>
              <h4 className="font-heading font-semibold text-base text-foreground group-hover:text-primary transition-colors flex items-center justify-between gap-2">
                <span>{nextEvent.title}</span>
                {nextEvent.url && (
                  <a
                    href={nextEvent.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-muted-foreground hover:text-foreground shrink-0"
                    title="Open event link"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                )}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {nextEvent.metadata?.location || nextEvent.description || 'No location provided'}
              </p>
              <div className="mt-3 flex items-center gap-2 font-mono text-xs text-sky-400">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {new Date(nextEvent.start_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {new Date(nextEvent.end_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-xs text-muted-foreground">No upcoming meetings scheduled for today.</div>
          )}
        </div>

        {/* Most Urgent Deadline / Task */}
        <div className="p-4 rounded-xl bg-card/40 border border-border/40 flex flex-col justify-between hover:border-rose-500/30 transition-all group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              Most Urgent Deadline
            </span>
            {deadlineAccount && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border/60">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: deadlineAccount.color }} />
                {deadlineAccount.label}
              </span>
            )}
          </div>

          {urgentDeadline ? (
            <div>
              <h4 className="font-heading font-semibold text-base text-foreground group-hover:text-rose-400 transition-colors flex items-center justify-between gap-2">
                <span className="line-clamp-1">{urgentDeadline.title}</span>
                {urgentDeadline.url && (
                  <a
                    href={urgentDeadline.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-muted-foreground hover:text-foreground shrink-0"
                    title="Open course submission portal"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                )}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {urgentDeadline.metadata?.course_name || urgentDeadline.description || 'Important coursework'}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div
                  className={`flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-lg border ${
                    countdownInfo.isOverdue
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-semibold'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{countdownInfo.label}</span>
                  {timeRemaining && <span className="opacity-75 whitespace-nowrap">({timeRemaining})</span>}
                </div>

                <span className="text-[11px] font-mono text-muted-foreground">
                  Score: <strong className="text-foreground">{urgentDeadline.priority_score}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              All caught up! No urgent deadlines pending.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
