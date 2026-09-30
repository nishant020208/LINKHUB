import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sliders, Plus, Users, FileText, Sparkles, ArrowRight, GripVertical } from 'lucide-react';
import { RightNowHero } from '@/components/dashboard/RightNowHero';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { DeadlinesBoard } from '@/components/dashboard/DeadlinesBoard';
import { EventsTimeline } from '@/components/dashboard/EventsTimeline';
import { KeyEmailsBoard } from '@/components/dashboard/KeyEmailsBoard';
import { PinnedFilesBoard } from '@/components/dashboard/PinnedFilesBoard';
import { WidgetSettingsModal, WidgetVisibility } from '@/components/dashboard/WidgetSettingsModal';
import { QuickAddModal } from '@/components/dashboard/QuickAddModal';
import { AccountDrawer } from '@/components/dashboard/AccountDrawer';
import { WeeklyReportModal } from '@/components/dashboard/WeeklyReportModal';
import { SyncStatusPanel } from '@/components/dashboard/SyncStatusPanel';
import { SortableWidget, applyWidgetOrder } from '@/components/dashboard/SortableWidget';
import { BoardSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useSyncData } from '@/hooks/useSyncData';
import { useWidgetOrder } from '@/hooks/useWidgetOrder';
import { useAppStore } from '@/store/useAppStore';

const DEFAULT_VISIBILITY: WidgetVisibility = {
  hero: true,
  deadlines: true,
  timeline: true,
  emails: true,
  pinnedFiles: true,
};

export const DashboardPage: React.FC = () => {
  // Single real-time data pipeline: Supabase -> TanStack Query -> store -> widgets
  const { isLoading } = useSyncData();
  const { setQuickAddOpen, accounts } = useAppStore();
  const [visibility, setVisibility] = useState<WidgetVisibility>(DEFAULT_VISIBILITY);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isAccountsDrawerOpen, setAccountsDrawerOpen] = useState(false);
  const [isWeeklyReportOpen, setWeeklyReportOpen] = useState(false);
  const { order, setOrder } = useWidgetOrder();

  const handleReorder = (fromId: string, toId: string) => {
    const current = order.length ? order : widgets.map((w) => w.id);
    const from = current.indexOf(fromId);
    const to = current.indexOf(toId);
    if (from === -1 || to === -1) return;
    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    setOrder(next);
  };

  const widgets = useMemo(
    () => [
      { id: 'deadlines', column: 'left' as const, node: <DeadlinesBoard /> },
      { id: 'pinnedFiles', column: 'left' as const, node: <PinnedFilesBoard /> },
      { id: 'timeline', column: 'right' as const, node: <EventsTimeline /> },
      { id: 'emails', column: 'right' as const, node: <KeyEmailsBoard /> },
    ],
    []
  );

  const visibleOrdered = applyWidgetOrder(
    widgets.filter((w) => visibility[w.id as keyof WidgetVisibility]),
    order
  );

  const leftWidgets = visibleOrdered.filter((w) => w.column === 'left');
  const rightWidgets = visibleOrdered.filter((w) => w.column === 'right');

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Action Bar — wraps on mobile instead of overflowing */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setQuickAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Deadline / Task</span>
            <span className="sm:hidden">Add</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setAccountsDrawerOpen(true)}>
            <Users className="w-3.5 h-3.5 text-status-syncing" />
            <span className="hidden sm:inline">Account Health</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setWeeklyReportOpen(true)}>
            <FileText className="w-3.5 h-3.5 text-status-connected" />
            <span className="hidden sm:inline">Weekly Report</span>
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} title="Customize dashboard cards">
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Customize</span>
        </Button>
      </div>

      {/* Skeletons while the first real fetch lands */}
      {isLoading && (
        <div className="space-y-4">
          <BoardSkeleton rows={2} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BoardSkeleton rows={3} />
            <BoardSkeleton rows={3} />
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Hero "Right Now" Status Strip */}
          {visibility.hero && <RightNowHero />}

          {/* Real Provider Sync Status Pipeline Panel */}
          <SyncStatusPanel />

          {/* Filter and Workspace Controls */}
          <FilterBar />

          {/* Bento Grid or Connect-First-Account onboarding */}
          {accounts.length === 0 ? (
            <div className="rounded-3xl glass-panel border border-border/60 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-card">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto shadow-glow">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-black text-2xl sm:text-3xl tracking-tight">
                  Connect your first account
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
                  UnifyHub needs at least one connected service to begin populating your unified schedule,
                  course deadlines, and prioritized inboxes.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/integrations"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:brightness-110 text-primary-foreground font-semibold text-sm transition-all shadow-glow cursor-pointer"
                >
                  <span>Connect Account in Integrations</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
              {/* Primary column */}
              <div className="lg:col-span-7 space-y-4 sm:space-y-6">
                {leftWidgets.map((w) => (
                  <SortableWidget key={w.id} id={w.id} onReorder={handleReorder}>
                    <div className="group/sortable relative">
                      <span
                        className="absolute -left-1 -top-1 z-10 p-1.5 rounded-lg bg-card/90 border border-border/50 text-muted-foreground opacity-0 group-hover/sortable:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-3 h-3" />
                      </span>
                      {w.node}
                    </div>
                  </SortableWidget>
                ))}
              </div>

              {/* Secondary column */}
              <div className="lg:col-span-5 space-y-4 sm:space-y-6">
                {rightWidgets.map((w) => (
                  <SortableWidget key={w.id} id={w.id} onReorder={handleReorder}>
                    <div className="group/sortable relative">
                      <span
                        className="absolute -left-1 -top-1 z-10 p-1.5 rounded-lg bg-card/90 border border-border/50 text-muted-foreground opacity-0 group-hover/sortable:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-3 h-3" />
                      </span>
                      {w.node}
                    </div>
                  </SortableWidget>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals & Drawers */}
      <WidgetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        visibility={visibility}
        onChange={setVisibility}
        onReset={() => setVisibility(DEFAULT_VISIBILITY)}
      />

      <QuickAddModal />

      <AccountDrawer isOpen={isAccountsDrawerOpen} onClose={() => setAccountsDrawerOpen(false)} />

      <WeeklyReportModal isOpen={isWeeklyReportOpen} onClose={() => setWeeklyReportOpen(false)} />
    </div>
  );
};
