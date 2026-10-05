import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Calendar, Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useSyncData } from '@/hooks/useSyncData';
import { formatTimeAgo, cn } from '@/lib/utils';

export const DesktopHeader: React.FC = () => {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    setQuickAddOpen,
    accounts,
    lastSyncedAt,
  } = useAppStore();
  const { isSyncing, triggerSync } = useSyncData();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border/40 bg-background/80 backdrop-blur-xl px-8 flex items-center justify-between select-none">
      {/* Date & Live Clock */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>{todayStr}</span>
        </div>
        <span className="text-border">|</span>
        <div className="flex items-center gap-1.5 font-mono text-xs text-foreground font-semibold">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="tabular-nums">{currentTime}</span>
        </div>
      </div>

      {/* Center: Workspace Selector */}
      <div className="flex items-center p-1 rounded-2xl bg-card/60 border border-border/50">
        {workspaces.map((ws) => {
          const isActive = activeWorkspaceId === ws.id;
          return (
            <button
              key={ws.id}
              type="button"
              onClick={() => setActiveWorkspace(ws.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer',
                isActive
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {ws.name}
            </button>
          );
        })}
      </div>

      {/* Right Controls: Sync & Add */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground">
            {lastSyncedAt ? `Synced ${formatTimeAgo(lastSyncedAt)}` : 'Synced'}
          </span>
          <button
            type="button"
            onClick={() => triggerSync()}
            disabled={isSyncing || accounts.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card/50 hover:bg-card text-xs font-mono text-foreground transition-all cursor-pointer disabled:opacity-50"
            title="Synchronize all data streams"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-primary', isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Item</span>
        </button>
      </div>
    </header>
  );
};
