import React, { useState } from 'react';
import { Sliders, Plus, Users, FileText } from 'lucide-react';
import { RightNowHero } from '@/components/dashboard/RightNowHero';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { DeadlinesBoard } from '@/components/dashboard/DeadlinesBoard';
import { EventsTimeline } from '@/components/dashboard/EventsTimeline';
import { KeyEmailsBoard } from '@/components/dashboard/KeyEmailsBoard';
import { PinnedFilesBoard } from '@/components/dashboard/PinnedFilesBoard';
import { AnimatedCard } from '@/components/dashboard/AnimatedCard';
import { WidgetSettingsModal, WidgetVisibility } from '@/components/dashboard/WidgetSettingsModal';
import { QuickAddModal } from '@/components/dashboard/QuickAddModal';
import { AccountDrawer } from '@/components/dashboard/AccountDrawer';
import { WeeklyReportModal } from '@/components/dashboard/WeeklyReportModal';
import { useAppStore } from '@/store/useAppStore';

const DEFAULT_VISIBILITY: WidgetVisibility = {
  hero: true,
  deadlines: true,
  timeline: true,
  emails: true,
  pinnedFiles: true,
};

export const DashboardPage: React.FC = () => {
  const { setQuickAddOpen } = useAppStore();
  const [visibility, setVisibility] = useState<WidgetVisibility>(DEFAULT_VISIBILITY);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isAccountsDrawerOpen, setAccountsDrawerOpen] = useState(false);
  const [isWeeklyReportOpen, setWeeklyReportOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickAddOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-medium text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Deadline / Task</span>
          </button>

          <button
            onClick={() => setAccountsDrawerOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-border/50 bg-card/60 hover:bg-card text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Account Health</span>
          </button>

          <button
            onClick={() => setWeeklyReportOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-border/50 bg-card/60 hover:bg-card text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Generate Weekly Workload Report"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Weekly Report</span>
          </button>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-xl border border-border/50 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          title="Customize dashboard cards"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Customize Bento</span>
        </button>
      </div>

      {/* Hero "Right Now" Status Strip */}
      {visibility.hero && (
        <AnimatedCard delay={0.05}>
          <RightNowHero />
        </AnimatedCard>
      )}

      {/* Filter and Workspace Controls */}
      <AnimatedCard delay={0.1}>
        <FilterBar />
      </AnimatedCard>

      {/* Bento Grid Command Station */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Actionable Column (Deadlines & Pinned Docs) */}
        <div className="lg:col-span-7 space-y-6">
          {visibility.deadlines && (
            <AnimatedCard delay={0.15}>
              <DeadlinesBoard />
            </AnimatedCard>
          )}

          {visibility.pinnedFiles && (
            <AnimatedCard delay={0.25}>
              <PinnedFilesBoard />
            </AnimatedCard>
          )}
        </div>

        {/* Secondary Contextual Column (Timeline & Emails) */}
        <div className="lg:col-span-5 space-y-6">
          {visibility.timeline && (
            <AnimatedCard delay={0.2}>
              <EventsTimeline />
            </AnimatedCard>
          )}

          {visibility.emails && (
            <AnimatedCard delay={0.3}>
              <KeyEmailsBoard />
            </AnimatedCard>
          )}
        </div>
      </div>

      {/* Modals & Drawers */}
      <WidgetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        visibility={visibility}
        onChange={setVisibility}
        onReset={() => setVisibility(DEFAULT_VISIBILITY)}
      />

      <QuickAddModal />

      <AccountDrawer
        isOpen={isAccountsDrawerOpen}
        onClose={() => setAccountsDrawerOpen(false)}
      />

      <WeeklyReportModal
        isOpen={isWeeklyReportOpen}
        onClose={() => setWeeklyReportOpen(false)}
      />
    </div>
  );
};
