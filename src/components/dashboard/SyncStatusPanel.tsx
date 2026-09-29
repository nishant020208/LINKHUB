import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  GraduationCap,
  Mail,
  FolderGit2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import { useSyncData } from '@/hooks/useSyncData';
import { formatTimeAgo } from '@/lib/utils';

interface StreamDef {
  type: string;
  name: string;
  service: string;
  icon: React.ReactNode;
}

const DATA_STREAMS: StreamDef[] = [
  {
    type: 'calendar',
    name: 'Google Calendar',
    service: 'Calendar API',
    icon: <Calendar className="w-3.5 h-3.5 text-sky-400" />,
  },
  {
    type: 'classroom',
    name: 'Google Classroom',
    service: 'Classroom API',
    icon: <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />,
  },
  {
    type: 'gmail',
    name: 'Gmail Notices',
    service: 'Gmail API',
    icon: <Mail className="w-3.5 h-3.5 text-rose-400" />,
  },
  {
    type: 'drive',
    name: 'Google Drive',
    service: 'Drive API',
    icon: <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />,
  },
  {
    type: 'tasks',
    name: 'Google Tasks',
    service: 'Tasks API',
    icon: <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />,
  },
];

export const SyncStatusPanel: React.FC = () => {
  const { accounts, syncLogs, isSyncing, triggerSync } = useSyncData();
  const [isExpanded, setIsExpanded] = useState(false);

  const googleAccount = accounts.find((a) => a.provider === 'google');
  const hasConnectedAccount = accounts.length > 0;

  // Find latest log per data type
  const getStreamStatus = (dataType: string) => {
    if (!hasConnectedAccount) {
      return { state: 'not_connected', label: 'Not Connected', error: null, count: 0 };
    }
    if (isSyncing) {
      return { state: 'syncing', label: 'Syncing...', error: null, count: 0 };
    }

    const latestLog = syncLogs.find((log) => log.data_type === dataType);
    if (!latestLog) {
      return { state: 'no_data', label: 'No Sync Run Yet', error: null, count: 0 };
    }

    if (latestLog.status === 'failed') {
      return {
        state: 'failed',
        label: 'Failed',
        error: latestLog.error_message || 'API error or missing scope',
        count: 0,
      };
    }

    if (latestLog.items_upserted === 0 && latestLog.items_fetched === 0) {
      return {
        state: 'no_data',
        label: 'No Data Found',
        error: null,
        count: 0,
      };
    }

    return {
      state: 'ok',
      label: `OK (${latestLog.items_upserted} synced)`,
      error: null,
      count: latestLog.items_upserted,
    };
  };

  const failedCount = DATA_STREAMS.filter(
    (s) => getStreamStatus(s.type).state === 'failed'
  ).length;

  return (
    <div className="rounded-2xl glass-panel border border-border/70 p-4 shadow-lg mb-6 transition-all">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl border ${
              failedCount > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : hasConnectedAccount
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            <Activity className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-heading font-semibold text-sm text-foreground">
                Live Data Pipeline Status
              </h4>
              {hasConnectedAccount && (
                <span className="text-[11px] font-mono text-muted-foreground">
                  &middot; {googleAccount ? googleAccount.email : `${accounts.length} account(s)`}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {!hasConnectedAccount
                ? 'No live accounts connected yet.'
                : failedCount > 0
                ? `${failedCount} data stream(s) encountered API issues. Expand for exact error details.`
                : 'All synchronized data streams operational.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasConnectedAccount && (
            <button
              onClick={() => triggerSync()}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              title="Trigger immediate full sync across all connected APIs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl border border-border/50 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground text-xs transition-colors cursor-pointer flex items-center gap-1 font-mono"
          >
            <span className="text-[11px]">{isExpanded ? 'Hide Details' : 'View Stream Health'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Granular Stream Health Grid */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {DATA_STREAMS.map((stream) => {
            const status = getStreamStatus(stream.type);

            return (
              <div
                key={stream.type}
                className={`p-3 rounded-xl border transition-all space-y-2 ${
                  status.state === 'failed'
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                    : status.state === 'ok'
                    ? 'bg-card/50 border-emerald-500/30 text-foreground'
                    : status.state === 'syncing'
                    ? 'bg-primary/5 border-primary/30 text-foreground'
                    : 'bg-card/30 border-border/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    {stream.icon}
                    <span className="font-heading font-medium text-xs truncate">
                      {stream.name}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                      status.state === 'failed'
                        ? 'bg-rose-500/20 text-rose-300'
                        : status.state === 'ok'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : status.state === 'syncing'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {status.state === 'failed' ? (
                      <AlertTriangle className="w-2.5 h-2.5" />
                    ) : status.state === 'ok' ? (
                      <CheckCircle2 className="w-2.5 h-2.5" />
                    ) : null}
                    {status.label}
                  </span>
                </div>

                {/* Real Error text display if failed */}
                {status.error && (
                  <p className="text-[10px] font-mono text-rose-300/90 bg-rose-950/40 p-2 rounded border border-rose-500/30 break-words leading-tight">
                    {status.error}
                  </p>
                )}

                <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                  <span>{stream.service}</span>
                  {googleAccount?.last_synced_at && (
                    <span>{formatTimeAgo(googleAccount.last_synced_at)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
