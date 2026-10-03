import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Zap,
  MapPin,
  RefreshCw,
  FolderOpen,
  Mail,
  CheckSquare,
  Check,
  Blocks,
  Sparkles,
  LayoutList,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSyncData } from '@/hooks/useSyncData';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/components/ui/toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCounter } from '@/components/ui/metric-counter';
import { BoardSkeleton } from '@/components/ui/skeleton';
import { QuickAddModal } from '@/components/dashboard/QuickAddModal';
import { TriageView } from '@/components/triage/TriageView';
import { filterItemsByWorkspace } from '@/lib/workspaceFilter';
import { detectCalendarConflicts } from '@/lib/smart/conflicts';
import { formatTimeAgo, formatDueCountdown, cn } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';

type DashboardMode = 'list' | 'triage';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoading, isSyncing, triggerSync } = useSyncData();
  const {
    items,
    accounts,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    setQuickAddOpen,
    markItemDone,
    briefing,
  } = useAppStore();
  const { user } = useAuthStore();
  const toast = useToastStore((s) => s.toast);

  // Persistent Dashboard View Mode (List vs Triage)
  const [dashboardMode, setDashboardModeState] = useState<DashboardMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('unifyhub-dashboard-mode');
        if (saved === 'list' || saved === 'triage') return saved;
      } catch {
        // Local storage restricted
      }
    }
    return 'list';
  });

  const setDashboardMode = (mode: DashboardMode) => {
    setDashboardModeState(mode);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('unifyhub-dashboard-mode', mode);
      } catch {
        // Fallback
      }
    }
  };

  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // 1. Workspace-filtered items (Memoized for performance)
  const filteredItems = useMemo(
    () => filterItemsByWorkspace(items || [], activeWorkspaceId, workspaces, accounts),
    [items, activeWorkspaceId, workspaces, accounts]
  );

  // 2. Schedule conflicts across calendar events
  const conflicts = useMemo(
    () => detectCalendarConflicts(filteredItems),
    [filteredItems]
  );

  // 3. Next upcoming event (from 15 min ago into future)
  const nextEvent = useMemo(() => {
    const nowTime = Date.now();
    return filteredItems
      .filter(
        (item) =>
          item.type === 'event' &&
          item.start_at &&
          new Date(item.start_at).getTime() >= nowTime - 15 * 60000
      )
      .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime())[0];
  }, [filteredItems]);

  // 4. Most urgent pending deadline or task
  const urgentDeadline = useMemo(() => {
    return filteredItems
      .filter(
        (item) => (item.type === 'deadline' || item.type === 'task') && !item.is_done && item.due_at
      )
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];
  }, [filteredItems]);

  // 5. Accounts for next event & urgent deadline
  const eventAccount = useMemo(
    () => (nextEvent ? accounts.find((a) => a.id === nextEvent.account_id) : null),
    [nextEvent, accounts]
  );
  const deadlineAccount = useMemo(
    () => (urgentDeadline ? accounts.find((a) => a.id === urgentDeadline.account_id) : null),
    [urgentDeadline, accounts]
  );

  // 6. Summary metrics for the 4 Stat Tiles
  const openDeadlines = useMemo(
    () => filteredItems.filter((i) => (i.type === 'deadline' || i.type === 'task') && !i.is_done),
    [filteredItems]
  );

  const overdueDeadlines = useMemo(() => {
    const now = Date.now();
    return openDeadlines.filter((i) => i.due_at && new Date(i.due_at).getTime() < now);
  }, [openDeadlines]);

  const todayEvents = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();

    return filteredItems.filter((i) => {
      if (i.type !== 'event' || !i.start_at) return false;
      const t = new Date(i.start_at).getTime();
      return !isNaN(t) && t >= startOfDay && t <= endOfDay;
    });
  }, [filteredItems]);

  const remainingEventsCount = useMemo(() => {
    const now = Date.now();
    return todayEvents.filter((i) => new Date(i.start_at!).getTime() >= now - 15 * 60000).length;
  }, [todayEvents]);

  const cloudFiles = useMemo(
    () => filteredItems.filter((i) => i.type === 'file'),
    [filteredItems]
  );

  const priorityNotices = useMemo(
    () =>
      filteredItems.filter(
        (i) =>
          (i.type === 'email' ||
            (Array.isArray(i.metadata?.urgent_keywords) && i.metadata.urgent_keywords.length > 0)) &&
          !i.is_done
      ),
    [filteredItems]
  );

  // 7. Latest sync timestamp across linked accounts
  const latestSyncDate = useMemo(() => {
    const syncDates = (accounts || [])
      .map((a) => (a.last_synced_at ? new Date(a.last_synced_at).getTime() : 0))
      .filter((t) => t > 0);
    if (syncDates.length === 0) return null;
    return new Date(Math.max(...syncDates)).toISOString();
  }, [accounts]);

  // Live countdown timer for the urgent deadline
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

  const handleToggleDone = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    markItemDone(itemId, true);
    queryClient.invalidateQueries({ queryKey: queryKeys.items });
    toast({
      kind: 'success',
      title: 'Item Completed',
      message: 'Marked deadline as resolved.',
    });
  };

  const handleManualSync = async () => {
    try {
      await triggerSync();
    } catch {
      // Errors handled by toast inside useSyncData
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Greeting & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Command Station &middot;{' '}
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <h1 className="font-display font-extrabold text-[1.75rem] sm:text-3xl text-foreground tracking-tight">
            Good day, {user?.fullName?.split(' ')[0] || 'Member'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* List vs Triage Mode Segmented Control */}
          <div className="flex items-center p-1 rounded-2xl bg-card border border-border/50">
            <button
              type="button"
              onClick={() => setDashboardMode('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer',
                dashboardMode === 'list'
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardMode('triage')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer',
                dashboardMode === 'triage'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Triage</span>
              {priorityNotices.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary-foreground/20 font-mono">
                  {priorityNotices.length}
                </span>
              )}
            </button>
          </div>

          {/* Workspace Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-card border border-border/50">
            {workspaces.map((ws) => {
              const active = activeWorkspaceId === ws.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => setActiveWorkspace(ws.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer',
                    active
                      ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {ws.name}
                </button>
              );
            })}
          </div>

          {/* Add Deadline / Task Action */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setQuickAddOpen(true)}
            className="gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Deadline / Task</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Skeletons while the initial fetch loads */}
      {isLoading && (
        <div className="space-y-4">
          <BoardSkeleton rows={2} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BoardSkeleton rows={3} />
            <BoardSkeleton rows={3} />
          </div>
        </div>
      )}

      {!isLoading && dashboardMode === 'triage' && (
        /* TRIAGE MODE VIEW */
        <TriageView
          filteredItems={filteredItems}
          onExitTriage={() => setDashboardMode('list')}
        />
      )}

      {!isLoading && dashboardMode === 'list' && (
        /* LIST / OVERVIEW MODE VIEW */
        <>
          {/* 2. Compact Sync Status Strip */}
          <Card variant="bento" className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors',
                    isSyncing
                      ? 'bg-status-syncing/10 text-status-syncing border-status-syncing/30'
                      : accounts.length > 0
                      ? 'bg-status-connected/10 text-status-connected border-status-connected/30'
                      : 'bg-muted/40 text-muted-foreground border-border/40'
                  )}
                >
                  <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-foreground">
                      {isSyncing
                        ? 'Synchronizing provider streams...'
                        : latestSyncDate
                        ? `Last synced ${formatTimeAgo(latestSyncDate)}`
                        : 'No recent sync history'}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-border" />
                    <span className="text-xs font-mono text-muted-foreground">
                      {accounts.length} linked account{accounts.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Google, GitHub, Slack, Notion, and academic timetables synchronized
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleManualSync}
                  disabled={isSyncing || accounts.length === 0}
                  className="gap-1.5 text-xs font-mono cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </Button>
                <button
                  type="button"
                  onClick={() => navigate('/integrations')}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  Manage &rarr;
                </button>
              </div>
            </div>
          </Card>

          {/* 3. Schedule Conflict Alert */}
          {conflicts.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-status-warning/10 border border-status-warning/30 flex items-center justify-between gap-3 text-xs text-status-warning">
              <div className="flex items-center gap-2.5 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-status-warning" />
                <span>Schedule Conflict: Overlapping events detected across linked calendars.</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
              >
                Resolve in Calendar &rarr;
              </button>
            </div>
          )}

          {/* Daily Strategic Focus Strip */}
          {briefing && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
              <div className="p-1.5 rounded-xl bg-primary text-primary-foreground shrink-0 mt-0.5">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                  Daily Strategic Focus
                </span>
                <p className="text-xs sm:text-sm font-medium text-foreground mt-0.5 leading-relaxed">
                  &ldquo;{briefing.summary}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* 4. Duo Prominent Cards: Next Up & Most Urgent Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card A: Next Up Event */}
            <Card
              variant="bento"
              interactive
              tilt
              role="button"
              tabIndex={0}
              onClick={() => navigate('/calendar')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate('/calendar');
              }}
              className="p-5 flex flex-col justify-between group cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Next Up
                  </span>
                  {eventAccount && (
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border border-border/60"
                      style={{
                        backgroundColor: `${eventAccount.color}15`,
                        color: eventAccount.color,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: eventAccount.color }}
                      />
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
                          onClick={(e) => e.stopPropagation()}
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
                          {String(nextEvent.metadata.location)}
                        </span>
                      )}
                      {!nextEvent.metadata?.location && (
                        <span className="line-clamp-1">
                          {nextEvent.description || 'Scheduled event'}
                        </span>
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
                    <span className="font-mono tracking-tight">
                      {formatDueCountdown(nextEvent.start_at).label}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-muted-foreground">Schedule Clear</span>
                )}
                <span className="text-xs text-muted-foreground group-hover:text-foreground font-mono flex items-center gap-1">
                  <span>View Calendar</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Card>

            {/* Card B: Most Urgent Deadline */}
            <Card
              variant="bento"
              interactive
              tilt
              role="button"
              tabIndex={0}
              onClick={() => navigate('/deadlines')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate('/deadlines');
              }}
              className="p-5 flex flex-col justify-between group cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
                    <AlertCircle className="w-3.5 h-3.5 text-status-warning" />
                    Most Urgent Deadline
                  </span>
                  {deadlineAccount && (
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border border-border/60"
                      style={{
                        backgroundColor: `${deadlineAccount.color}15`,
                        color: deadlineAccount.color,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: deadlineAccount.color }}
                      />
                      {deadlineAccount.label}
                    </span>
                  )}
                </div>

                {urgentDeadline ? (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Quick-done Toggle Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleDone(e, urgentDeadline.id)}
                          className="mt-0.5 w-5 h-5 rounded-md border border-border/80 hover:border-status-connected hover:bg-status-connected/10 text-transparent hover:text-status-connected flex items-center justify-center shrink-0 transition-all cursor-pointer"
                          title="Mark deadline as completed"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <h4 className="font-display font-bold text-base sm:text-lg text-foreground group-hover:text-status-warning transition-colors line-clamp-1">
                          {urgentDeadline.title}
                        </h4>
                      </div>

                      {urgentDeadline.url && (
                        <a
                          href={urgentDeadline.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 text-muted-foreground hover:text-foreground shrink-0 rounded-lg hover:bg-muted/60"
                          title="Open assignment link"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 ml-7.5 line-clamp-1">
                      {String(urgentDeadline.metadata?.course_name || urgentDeadline.description || 'Action required')}
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
                <span className="text-xs text-muted-foreground group-hover:text-foreground font-mono flex items-center gap-1">
                  <span>All Deadlines</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Card>
          </div>

          {/* 5. Four Summary Stat Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tile 1: Deadlines Queue */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/deadlines')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate('/deadlines');
              }}
              className="block group h-full cursor-pointer"
            >
              <Card variant="bento" interactive tilt className="p-4 sm:p-5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium">
                      Deadlines Queue
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-status-warning/10 text-status-warning flex items-center justify-center">
                      <CheckSquare className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <MetricCounter
                      value={openDeadlines.length}
                      className="text-3xl sm:text-4xl font-display font-extrabold text-foreground group-hover:text-status-warning transition-colors"
                    />
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {overdueDeadlines.length > 0 ? (
                      <span className="text-status-error font-medium">
                        {overdueDeadlines.length} overdue
                      </span>
                    ) : (
                      'All on schedule'
                    )}
                  </span>
                  <span className="font-mono text-primary flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform font-semibold">
                    <span>Queue</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Card>
            </div>

            {/* Tile 2: Events Today */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/calendar')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate('/calendar');
              }}
              className="block group h-full cursor-pointer"
            >
              <Card variant="bento" interactive tilt className="p-4 sm:p-5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium">
                      Events Today
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <MetricCounter
                      value={todayEvents.length}
                      className="text-3xl sm:text-4xl font-display font-extrabold text-foreground group-hover:text-primary transition-colors"
                    />
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {remainingEventsCount > 0
                      ? `${remainingEventsCount} upcoming`
                      : 'None remaining today'}
                  </span>
                  <span className="font-mono text-primary flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform font-semibold">
                    <span>Calendar</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Card>
            </div>

            {/* Tile 3: Pinned Files */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/files')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate('/files');
              }}
              className="block group h-full cursor-pointer"
            >
              <Card variant="bento" interactive tilt className="p-4 sm:p-5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium">
                      Pinned Files
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <FolderOpen className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <MetricCounter
                      value={cloudFiles.length}
                      className="text-3xl sm:text-4xl font-display font-extrabold text-foreground group-hover:text-primary transition-colors"
                    />
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono text-[11px]">
                    Active cloud files
                  </span>
                  <span className="font-mono text-primary flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform font-semibold">
                    <span>Files</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Card>
            </div>

            {/* Tile 4: Priority Notices & Triage Launch */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setDashboardMode('triage')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setDashboardMode('triage');
              }}
              className="block group h-full cursor-pointer"
            >
              <Card
                variant="bento"
                interactive
                tilt
                className="p-4 sm:p-5 h-full flex flex-col justify-between border-status-connected/30 hover:border-status-connected/60"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium">
                      Priority Notices
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-status-connected/15 text-status-connected flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <MetricCounter
                      value={priorityNotices.length}
                      className="text-3xl sm:text-4xl font-display font-extrabold text-foreground group-hover:text-status-connected transition-colors"
                    />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-status-connected/10 text-status-connected border border-status-connected/25 font-semibold">
                      Triage
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {priorityNotices.length} to process
                  </span>
                  <span className="font-mono text-status-connected flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform font-semibold">
                    <span>Start Triage</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Card>
            </div>
          </div>

          {/* 6. Onboarding Card when 0 accounts linked */}
          {accounts.length === 0 && (
            <Card variant="bento" className="p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center mx-auto shadow-sm">
                <Blocks className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-foreground">
                  Connect your first service
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
                  UnifyHub aggregates your schedules, deadlines, files, and prioritized mail into one calm dashboard.
                  Connect your Google, GitHub, Slack, Notion, or academic accounts to get started.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/integrations')}
                  className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all inline-flex items-center gap-2 cursor-pointer shadow-md shadow-primary/20"
                >
                  <span>Connect Account in Integrations</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Quick Add Modal */}
      <QuickAddModal />
    </div>
  );
};
