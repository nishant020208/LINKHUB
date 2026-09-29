import React from 'react';
import { RightNowHero } from '@/components/dashboard/RightNowHero';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { DeadlinesBoard } from '@/components/dashboard/DeadlinesBoard';
import { EventsTimeline } from '@/components/dashboard/EventsTimeline';
import { KeyEmailsBoard } from '@/components/dashboard/KeyEmailsBoard';
import { PinnedFilesBoard } from '@/components/dashboard/PinnedFilesBoard';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Hero "Right Now" Status Strip */}
      <RightNowHero />

      {/* Filter and Workspace Controls */}
      <FilterBar />

      {/* Bento Grid Command Station */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Actionable Column (Deadlines & Pinned Docs) */}
        <div className="lg:col-span-7 space-y-6">
          <DeadlinesBoard />
          <PinnedFilesBoard />
        </div>

        {/* Secondary Contextual Column (Timeline & Emails) */}
        <div className="lg:col-span-5 space-y-6">
          <EventsTimeline />
          <KeyEmailsBoard />
        </div>
      </div>
    </div>
  );
};
