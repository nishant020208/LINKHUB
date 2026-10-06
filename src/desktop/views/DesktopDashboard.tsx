import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Calendar,
  Clock,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  CheckSquare,
  Mail,
  FolderOpen,
  Layers,
  Zap,
  Sparkles,
  LayoutList,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { DesktopBentoCard } from '@/desktop/components/DesktopBentoCard';
import { DeadlineConflictCard } from '@/components/deadlines/DeadlineConflictCard';
import { ConsistencyStatCard } from '@/components/dashboard/ConsistencyStatCard';
import { WeeklyDigestCard } from '@/components/dashboard/WeeklyDigestCard';
import { PriorityNoticesList } from '@/components/dashboard/PriorityNoticesList';
import { TriageView } from '@/components/triage/TriageView';
import { filterItemsByWorkspace } from '@/lib/workspaceFilter';
import { detectCalendarConflicts } from '@/lib/smart/conflicts';
import { detectDeadlineConflicts } from '@/lib/smart/deadlineConflicts';
import { calculateConsistencyMetrics } from '@/lib/smart/consistencyMetrics';
import { formatDueCountdown, cn } from '@/lib/utils';

export const DesktopDashboard: React.FC = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const {
    items,
    accounts,
    workspaces,
    activeWorkspaceId,
    markItemDone,
    briefing,
  } = useAppStore();
  const { user } = useAuthStore();
  const [dashboardMode, setDashboardMode] = useState<'list' | 'triage'>(() => {
    try {
      const saved = localStorage.getItem('unifyhub_dashboard_mode');
      if (saved === 'list' || saved === 'triage') return saved;
    } catch {
      // Safe fallback
    }
    return 'list';
  });

  const handleSetDashboardMode = (mode: 'list' | 'triage') => {
    setDashboardMode(mode);
    try {
      localStorage.setItem('unifyhub_dashboard_mode', mode);
    } catch {
      // Safe fallback
    }
  };

  // 1. Workspace-filtered items
  const filteredItems = useMemo(
    () => filterItemsByWorkspace(items || [], activeWorkspaceId, workspaces, accounts),
    [items, activeWorkspaceId, workspaces, accounts]
  );

  // 2. Schedule conflicts & deadline friction clusters
  const calendarConflicts = useMemo(
    () => detectCalendarConflicts(filteredItems),
    [filteredItems]
  );

  const [dismissedClusters, setDismissedClusters] = useState<string[]>([]);
  const deadlineClusters = useMemo(
    () => detectDeadlineConflicts(filteredItems, accounts),
    [filteredItems, accounts]
  );
  const activeClusters = useMemo(
    () => deadlineClusters.filter((c) => !dismissedClusters.includes(c.id)),
    [deadlineClusters, dismissedClusters]
  );

  // 3. Next upcoming event
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

  // 4. Most urgent pending deadline
  const urgentDeadline = useMemo(() => {
    return filteredItems
      .filter(
        (item) => (item.type === 'deadline' || item.type === 'task') && !item.is_done && item.due_at
      )
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];
  }, [filteredItems]);

  // 5. Multi-account live timeline strip (today's unified agenda)
  const todayAgenda = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 3600 * 1000;

    return filteredItems
      .filter((item) => {
        const time = item.start_at || item.due_at;
        if (!time) return false;
        const t = new Date(time).getTime();
        return t >= startOfDay && t <= endOfDay;
      })
      .sort((a, b) => {
        const timeA = new Date(a.start_at || a.due_at!).getTime();
        const timeB = new Date(b.start_at || b.due_at!).getTime();
        return timeA - timeB;
      })
      .slice(0, 5);
  }, [filteredItems]);

  // 6. Metrics & consistency
  const openDeadlines = useMemo(
    () => filteredItems.filter((i) => (i.type === 'deadline' || i.type === 'task') && !i.is_done),
    [filteredItems]
  );
  const overdueCount = useMemo(
    () => openDeadlines.filter((i) => i.due_at && new Date(i.due_at).getTime() < Date.now()).length,
    [openDeadlines]
  );
  const eventsCount = useMemo(
    () =>
      filteredItems.filter((i) => {
        if (i.type !== 'event' || !i.start_at) return false;
        const d = new Date(i.start_at);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      }).length,
    [filteredItems]
  );
  const priorityNotices = useMemo(
    () =>
      filteredItems.filter(
        (i) => (i.type === 'email' || (i.metadata?.labels as string[])?.includes('important')) && !i.is_done
      ),
    [filteredItems]
  );
  const pinnedFiles = useMemo(
    () => filteredItems.filter((i) => i.type === 'file' || i.metadata?.pinned),
    [filteredItems]
  );
  const consistencyStats = useMemo(
    () => calculateConsistencyMetrics(filteredItems),
    [filteredItems]
  );

  // Orchestrated motion entrance variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: reduce ? 0 : 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: reduce ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.28, ease: 'easeOut' as const },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-8 sm:p-10 max-w-7xl mx-auto space-y-6"
    >
      {/* 1. Header Hero Bar */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">
            Command Center Station &middot; Flight Deck
          </span>
          <h1 className="font-display font-extrabold text-3xl text-foreground tracking-tight mt-1">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Pilot'}
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode Switcher: List vs Triage Deck */}
          <div className="flex items-center p-1 rounded-2xl bg-card/80 border border-border/60 shadow-xs">
            <button
              type="button"
              onClick={() => handleSetDashboardMode('list')}
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
              onClick={() => handleSetDashboardMode('triage')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer',
                dashboardMode === 'triage'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Triage Deck</span>
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground bg-card/50 px-3 py-1.5 rounded-xl border border-border/40">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{accounts.length} Streams Active</span>
          </div>
        </div>
      </motion.div>

      {/* 2. Top Conflict & Collision Alerts */}
      {calendarConflicts.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300"
        >
          <div className="flex items-center gap-2.5 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Calendar Conflict: Overlapping appointments detected across linked calendars.</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
          >
            Resolve in Calendar &rarr;
          </button>
        </motion.div>
      )}

      {activeClusters.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          {activeClusters.map((cluster) => (
            <DeadlineConflictCard
              key={cluster.id}
              cluster={cluster}
              onDismiss={(id) => setDismissedClusters((prev) => [...prev, id])}
            />
          ))}
        </motion.div>
      )}

      {/* Daily Briefing Strip */}
      {briefing && (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3.5"
        >
          <div className="p-2 rounded-xl bg-primary text-primary-foreground shrink-0 mt-0.5">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
              Strategic AI Briefing
            </span>
            <p className="text-xs text-foreground/90 mt-0.5 leading-relaxed font-sans">
              {briefing.summary}
            </p>
          </div>
        </motion.div>
      )}

      {/* Render interactive Triage Station Deck when triage mode is active */}
      {dashboardMode === 'triage' ? (
        <motion.div variants={itemVariants} className="pt-2">
          <TriageView
            filteredItems={filteredItems}
            onExitTriage={() => handleSetDashboardMode('list')}
          />
        </motion.div>
      ) : (
        <>
          {/* 3. The Command Core Trio: Next Up + Urgent Deadline + Unified Live Agenda */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Next Up Event */}
        <DesktopBentoCard interactive onClick={() => navigate('/calendar')} className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-status-syncing" />
                Next Meeting
              </span>
              <span className="text-xs font-mono text-primary font-semibold flex items-center gap-1">
                Calendar <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>

            {nextEvent ? (
              <div className="pt-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {nextEvent.title}
                  </h3>
                  {nextEvent.url && (
                    <a
                      href={nextEvent.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                  {nextEvent.metadata?.location ? (
                    <>
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{String(nextEvent.metadata.location)}</span>
                    </>
                  ) : (
                    <span>{nextEvent.description || 'Confirmed calendar event'}</span>
                  )}
                </p>
              </div>
            ) : (
              <div className="py-6 text-xs text-muted-foreground">
                Schedule clear. No upcoming meetings for today.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-foreground">
              {nextEvent ? formatDueCountdown(nextEvent.start_at).label : 'All Clear'}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {nextEvent?.start_at ? new Date(nextEvent.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        </DesktopBentoCard>

        {/* Most Urgent Deadline */}
        <DesktopBentoCard interactive onClick={() => navigate('/deadlines')} className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-status-warning" />
                Urgent Deadline
              </span>
              <span className="text-xs font-mono text-primary font-semibold flex items-center gap-1">
                Queue <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>

            {urgentDeadline ? (
              <div className="pt-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {urgentDeadline.title}
                  </h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markItemDone(urgentDeadline.id, true);
                    }}
                    title="Mark finished"
                    className="p-1 text-muted-foreground hover:text-emerald-400 transition-colors shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                  {urgentDeadline.metadata?.course_name ? (
                    <span className="font-mono text-primary font-semibold">
                      {String(urgentDeadline.metadata.course_name)} &middot;
                    </span>
                  ) : null}
                  <span>{urgentDeadline.description || 'Target deliverable'}</span>
                </p>
              </div>
            ) : (
              <div className="py-6 text-xs text-muted-foreground">
                Queue zero! No pending deadlines on your radar.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
            {urgentDeadline ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25">
                {formatDueCountdown(urgentDeadline.due_at).label}
              </span>
            ) : (
              <span className="text-[11px] font-mono text-muted-foreground">Zero Backlog</span>
            )}
            <span className="text-[11px] font-mono text-muted-foreground">Priority High</span>
          </div>
        </DesktopBentoCard>

        {/* Multi-Account Live Timeline Strip */}
        <DesktopBentoCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Live Cross-Stream Agenda
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Today</span>
            </div>

            <div className="pt-2 space-y-2">
              {todayAgenda.length === 0 ? (
                <div className="py-6 text-xs text-muted-foreground text-center">
                  No additional agenda items scheduled for today.
                </div>
              ) : (
                todayAgenda.map((it) => {
                  const acc = accounts.find((a) => a.id === it.account_id);
                  const time = it.start_at || it.due_at;
                  return (
                    <div
                      key={it.id}
                      onClick={() => navigate(it.type === 'event' ? '/calendar' : '/deadlines')}
                      className="px-2.5 py-1.5 rounded-xl bg-card/40 border border-border/40 hover:border-primary/40 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: acc?.color || '#e8a54b' }}
                        />
                        <span className="truncate font-medium text-foreground text-[11px]">
                          {it.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                        {time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>{todayAgenda.length} scheduled items</span>
            <span className="text-primary hover:underline cursor-pointer" onClick={() => navigate('/calendar')}>
              Full Timeline &rarr;
            </span>
          </div>
        </DesktopBentoCard>
      </motion.div>

      {/* 4. Four High-Leverage Metric Tiles */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Deadlines Queue */}
        <DesktopBentoCard interactive onClick={() => navigate('/deadlines')} className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Deadlines Queue
              </span>
              <div className="w-8 h-8 rounded-xl bg-status-warning/10 text-status-warning flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-4xl font-display font-extrabold text-foreground group-hover:text-status-warning transition-colors font-mono">
                {openDeadlines.length}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground text-[11px]">
              {overdueCount > 0 ? (
                <span className="text-status-error font-semibold">{overdueCount} overdue</span>
              ) : (
                'All on schedule'
              )}
            </span>
            <span className="text-primary flex items-center gap-1 text-[11px] font-semibold">
              <span>Inspect</span> &rarr;
            </span>
          </div>
        </DesktopBentoCard>

        {/* Events Today */}
        <DesktopBentoCard interactive onClick={() => navigate('/calendar')} className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Calendar Events
              </span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-4xl font-display font-extrabold text-foreground group-hover:text-primary transition-colors font-mono">
                {eventsCount}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground text-[11px]">Today&apos;s Schedule</span>
            <span className="text-primary flex items-center gap-1 text-[11px] font-semibold">
              <span>View Day</span> &rarr;
            </span>
          </div>
        </DesktopBentoCard>

        {/* Priority Inboxes */}
        <DesktopBentoCard interactive onClick={() => navigate('/integrations')} className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Priority Inboxes
              </span>
              <div className="w-8 h-8 rounded-xl bg-status-connected/10 text-status-connected flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-4xl font-display font-extrabold text-foreground group-hover:text-status-connected transition-colors font-mono">
                {priorityNotices.length}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground text-[11px]">Actionable unread</span>
            <span className="text-status-connected flex items-center gap-1 text-[11px] font-semibold">
              <span>Streams</span> &rarr;
            </span>
          </div>
        </DesktopBentoCard>

        {/* Pinned Files */}
        <DesktopBentoCard interactive onClick={() => navigate('/files')} className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Documents & Files
              </span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-4xl font-display font-extrabold text-foreground group-hover:text-primary transition-colors font-mono">
                {pinnedFiles.length}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground text-[11px]">Synced references</span>
            <span className="text-primary flex items-center gap-1 text-[11px] font-semibold">
              <span>Drive</span> &rarr;
            </span>
          </div>
        </DesktopBentoCard>
      </motion.div>

      {/* 5. Execution Consistency & Weekly Digest Duo */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ConsistencyStatCard stats={consistencyStats} />
        <WeeklyDigestCard />
      </motion.div>

        {/* 6. Priority Stream & Triage Quick Access */}
        <motion.div variants={itemVariants}>
          <PriorityNoticesList
            items={filteredItems}
            onStartTriage={() => handleSetDashboardMode('triage')}
          />
        </motion.div>
        </>
      )}
    </motion.div>
  );
};
