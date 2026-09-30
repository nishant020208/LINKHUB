import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Calendar,
  GraduationCap,
  Mail,
  FolderGit2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Activity,
  Link2,
} from 'lucide-react';
import { useSyncData } from '@/hooks/useSyncData';
import { useAppStore } from '@/store/useAppStore';
import { formatTimeAgo } from '@/lib/utils';
import { Badge, StatusDot, CanonicalStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StreamDef {
  type: string;
  name: string;
  service: string;
  icon: React.ReactNode;
  /** Scope substring needed in granted_scopes for OAuth providers. */
  requiredScope?: string;
  provider: string;
}

const GOOGLE_STREAMS: StreamDef[] = [
  { type: 'calendar', name: 'Google Calendar', service: 'Calendar API', icon: <Calendar className="w-3.5 h-3.5 text-status-syncing" />, requiredScope: 'calendar', provider: 'google' },
  { type: 'classroom', name: 'Google Classroom', service: 'Classroom API', icon: <GraduationCap className="w-3.5 h-3.5 text-primary" />, requiredScope: 'classroom', provider: 'google' },
  { type: 'gmail', name: 'Gmail Notices', service: 'Gmail API', icon: <Mail className="w-3.5 h-3.5 text-status-error" />, requiredScope: 'gmail', provider: 'google' },
  { type: 'drive', name: 'Google Drive', service: 'Drive API', icon: <FolderGit2 className="w-3.5 h-3.5 text-status-warning" />, requiredScope: 'drive', provider: 'google' },
  { type: 'tasks', name: 'Google Tasks', service: 'Tasks API', icon: <CheckSquare className="w-3.5 h-3.5 text-status-connected" />, requiredScope: 'tasks', provider: 'google' },
];

const OTHER_STREAMS: Record<string, StreamDef[]> = {
  microsoft: [
    { type: 'outlook_mail', name: 'Outlook Mail', service: 'Graph API', icon: <Mail className="w-3.5 h-3.5 text-status-syncing" />, provider: 'microsoft' },
    { type: 'calendar', name: 'Outlook Calendar', service: 'Graph API', icon: <Calendar className="w-3.5 h-3.5 text-primary" />, provider: 'microsoft' },
    { type: 'tasks', name: 'Microsoft To Do', service: 'Graph API', icon: <CheckSquare className="w-3.5 h-3.5 text-status-connected" />, provider: 'microsoft' },
    { type: 'drive', name: 'OneDrive', service: 'Graph API', icon: <FolderGit2 className="w-3.5 h-3.5 text-status-warning" />, provider: 'microsoft' },
  ],
  github: [
    { type: 'issues', name: 'GitHub Issues', service: 'REST v3', icon: <CheckSquare className="w-3.5 h-3.5 text-foreground" />, provider: 'github' },
    { type: 'pull_requests', name: 'Review Requests', service: 'REST v3', icon: <Link2 className="w-3.5 h-3.5 text-foreground" />, provider: 'github' },
    { type: 'assigned_prs', name: 'Assigned PRs', service: 'REST v3', icon: <Link2 className="w-3.5 h-3.5 text-muted-foreground" />, provider: 'github' },
  ],
  notion: [{ type: 'databases', name: 'Notion Databases', service: 'Notion API', icon: <CheckSquare className="w-3.5 h-3.5 text-foreground" />, provider: 'notion' }],
  todoist: [{ type: 'projects', name: 'Todoist Tasks', service: 'REST v2', icon: <CheckSquare className="w-3.5 h-3.5 text-status-error" />, provider: 'todoist' }],
  slack: [{ type: 'saved_items', name: 'Slack Saved', service: 'Web API', icon: <Mail className="w-3.5 h-3.5 text-primary" />, provider: 'slack' }],
  linear: [{ type: 'issues', name: 'Linear Issues', service: 'GraphQL', icon: <CheckSquare className="w-3.5 h-3.5 text-primary" />, provider: 'linear' }],
  ical: [{ type: 'ical_events', name: 'iCal Feeds', service: 'ICS Parse', icon: <Calendar className="w-3.5 h-3.5 text-status-connected" />, provider: 'ical' }],
};

export const SyncStatusPanel: React.FC = () => {
  const { accounts, syncLogs, isSyncing, triggerSync } = useSyncData();
  const { items } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // Show streams for every connected provider.
  const streams = useMemo(() => {
    const active = new Set(accounts.map((a) => a.provider));
    const list: (StreamDef & { account?: typeof accounts[number] })[] = [];
    for (const provider of active) {
      const defs = provider === 'google' ? GOOGLE_STREAMS : OTHER_STREAMS[provider] ?? [];
      for (const def of defs) {
        list.push({ ...def, account: accounts.find((a) => a.provider === provider) });
      }
    }
    return list;
  }, [accounts]);

  const latestLogFor = (streamType: string, accountId?: string) =>
    syncLogs.find((log) => log.data_type === streamType && (!accountId || log.account_id === accountId));

  const getStreamStatus = (
    stream: StreamDef & { account?: typeof accounts[number] }
  ): { state: CanonicalStatus | 'no_data' | 'failed'; label: string; error: string | null; fetched: number; upserted: number } => {
    if (!stream.account) return { state: 'idle', label: 'Not Connected', error: null, fetched: 0, upserted: 0 };
    if (stream.account.status === 'needs_reconnect')
      return { state: 'needs_reconnect', label: 'Reconnect', error: stream.account.error_message ?? 'Token expired or revoked', fetched: 0, upserted: 0 };
    if (stream.account.status === 'error')
      return { state: 'error', label: 'Error', error: stream.account.error_message ?? 'Account error', fetched: 0, upserted: 0 };
    if (isSyncing) return { state: 'syncing', label: 'Syncing…', error: null, fetched: 0, upserted: 0 };

    const log = latestLogFor(stream.type, stream.account.id);
    if (!log) return { state: 'no_data', label: 'No Sync Run', error: null, fetched: 0, upserted: 0 };

    if (log.status === 'failed') {
      return { state: 'failed', label: 'Failed', error: log.error_message ?? 'API error', fetched: log.items_fetched, upserted: 0 };
    }

    // Scope hint: OAuth provider granted scopes missing this stream's requirement.
    const granted = stream.account.granted_scopes ?? [];
    if (stream.requiredScope && granted.length > 0 && !granted.some((s) => s.includes(stream.requiredScope!))) {
      return {
        state: 'needs_reconnect',
        label: 'Scope Missing',
        error: `Reconnect required: "${stream.requiredScope}" scope was not granted during authorization.`,
        fetched: 0,
        upserted: 0,
      };
    }

    if (log.items_fetched === 0 && log.items_upserted === 0) {
      return { state: 'no_data', label: 'Empty Result', error: null, fetched: 0, upserted: 0 };
    }

    return {
      state: 'connected',
      label: `${log.items_upserted} synced`,
      error: null,
      fetched: log.items_fetched,
      upserted: log.items_upserted,
    };
  };

  const failedCount = streams.filter((s) => getStreamStatus(s).state === 'failed').length;
  const itemsRendered = items.length;

  return (
    <div className="rounded-3xl glass-panel border border-border/70 p-4 shadow-card">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-2 rounded-xl border shrink-0 ${
              failedCount > 0
                ? 'bg-status-error/10 border-status-error/30 text-status-error'
                : streams.length > 0
                ? 'bg-status-connected/10 border-status-connected/30 text-status-connected'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display font-semibold text-sm">Live Data Pipeline Status</h4>
              {streams.length > 0 && (
                <Badge tone="neutral">
                  {itemsRendered} item{itemsRendered === 1 ? '' : 's'} in UI
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {streams.length === 0
                ? 'No live accounts connected yet.'
                : failedCount > 0
                ? `${failedCount} data stream${failedCount === 1 ? '' : 's'} failing — expand for the exact API error.`
                : 'All synchronized data streams operational.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {streams.length > 0 && (
            <Button variant="primary" size="sm" onClick={() => triggerSync()} disabled={isSyncing}>
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing…' : 'Sync Now'}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            <span className="font-mono text-[11px]">{isExpanded ? 'Hide Details' : 'View Stream Health'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Collapsible Granular Stream Health Grid */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {streams.length === 0 && (
            <p className="text-xs text-muted-foreground col-span-full text-center py-4">
              Connect an account on the Integrations page to activate its data streams.
            </p>
          )}
          {streams.map((stream) => {
            const status = getStreamStatus(stream);
            const account = stream.account;
            return (
              <div
                key={`${stream.provider}-${stream.type}`}
                className={`p-3 rounded-xl border space-y-2 transition-colors ${
                  status.state === 'failed'
                    ? 'bg-status-error/5 border-status-error/40'
                    : status.state === 'connected'
                    ? 'bg-card/50 border-status-connected/30'
                    : status.state === 'syncing'
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-card/30 border-border/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {stream.icon}
                    <span className="font-display font-medium text-xs truncate">{stream.name}</span>
                  </div>
                  <Badge status={(status.state === 'no_data' ? 'idle' : status.state) as CanonicalStatus} className="shrink-0">
                    {status.label}
                  </Badge>
                </div>

                {status.error && (
                  <p className="text-[10px] font-mono text-status-error/90 bg-status-error/10 p-2 rounded border border-status-error/30 break-words leading-tight">
                    {status.error}
                  </p>
                )}

                <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-between gap-1">
                  <span className="truncate">{account?.email ?? stream.service}</span>
                  <span className="shrink-0">
                    {status.fetched > 0 ? `${status.fetched} fetched / ${status.upserted} kept` : account?.last_synced_at ? formatTimeAgo(account.last_synced_at) : stream.service}
                  </span>
                </div>

                {account && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/70">
                    <StatusDot status={account.status as CanonicalStatus} />
                    {account.provider}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
