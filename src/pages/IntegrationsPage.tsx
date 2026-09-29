import React from 'react';
import {
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  PowerOff,
  Trash2,
  ExternalLink,
  Plus,
  Lock,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTimeAgo } from '@/lib/utils';
import { AccountProvider } from '@/types';

interface ProviderCardInfo {
  key: AccountProvider;
  name: string;
  category: string;
  scopes: string[];
  description: string;
  badge?: string;
  isPopular?: boolean;
}

const ALL_PROVIDERS: ProviderCardInfo[] = [
  // 1. Google
  {
    key: 'google',
    name: 'Google Workspace & Classroom',
    category: 'Google',
    scopes: ['gmail.readonly', 'calendar.readonly', 'classroom.readonly', 'drive.metadata.readonly', 'tasks.readonly'],
    description: 'Sync personal & university Gmail, Google Calendar, Classroom assignments, and Drive docs.',
    isPopular: true,
  },
  // 2. Microsoft
  {
    key: 'microsoft',
    name: 'Microsoft 365 & Outlook',
    category: 'Microsoft',
    scopes: ['Mail.Read', 'Calendars.Read', 'Tasks.Read', 'Files.Read', 'User.Read'],
    description: 'University & corporate Outlook mail, Microsoft Teams schedules, To Do tasks, and OneDrive files.',
    isPopular: true,
  },
  // 3. iCal URL
  {
    key: 'ical',
    name: 'iCal Timetable Subscription',
    category: 'Calendars',
    scopes: ['Read-only subscription via webcal:// or https://'],
    description: 'Direct live calendar feed from university course portals, Apple Calendar, or Athletics.',
    badge: 'Universal Feed',
  },
  // 4. Developer & Knowledge
  {
    key: 'github',
    name: 'GitHub',
    category: 'Developer',
    scopes: ['read:user', 'repo (assigned issues/PRs)'],
    description: 'Pull assigned pull requests, reviewing requests, and repository issues into your action queue.',
  },
  {
    key: 'notion',
    name: 'Notion',
    category: 'Knowledge',
    scopes: ['read_content'],
    description: 'Track database tasks, deadlines, and project pages from your shared workspaces.',
  },
  {
    key: 'todoist',
    name: 'Todoist',
    category: 'Productivity',
    scopes: ['data:read'],
    description: 'Two-way synchronized tasks, priorities, and recurring reminders.',
  },
  // 5. Work Collaboration
  {
    key: 'slack',
    name: 'Slack',
    category: 'Collaboration',
    scopes: ['channels:read', 'reminders:read'],
    description: 'Capture "saved for later" messages, scheduled reminders, and channel action items.',
  },
  {
    key: 'linear',
    name: 'Linear',
    category: 'Issue Tracking',
    scopes: ['read'],
    description: 'Cycle milestones, high-priority issues, and sprint deadlines.',
  },
  {
    key: 'jira',
    name: 'Jira Software',
    category: 'Enterprise Tracking',
    scopes: ['read:jira-work'],
    description: 'Sprint backlog items and active tickets assigned to you.',
  },
  {
    key: 'canvas',
    name: 'Canvas LMS',
    category: 'Academic',
    scopes: ['courses:read', 'assignments:read', 'announcements:read'],
    description: 'Coursework submission deadlines, grade releases, and lecture announcements.',
    isPopular: true,
  },
  {
    key: 'moodle',
    name: 'Moodle LMS',
    category: 'Academic',
    scopes: ['core_enrol_get_users_courses', 'mod_assign_get_assignments'],
    description: 'Academic modules, quiz deadlines, and university portal items.',
  },
  // 8. Custom IMAP (with warning)
  {
    key: 'imap',
    name: 'Custom IMAP / School Mail',
    category: 'Email',
    scopes: ['RFC3501 IMAP read-only'],
    description: 'Connect legacy university webmail servers directly via encrypted TLS.',
    badge: 'Advanced / TLS',
  },
];

export const IntegrationsPage: React.FC = () => {
  const {
    accounts,
    triggerSync,
    isSyncing,
    disconnectAccount,
    reconnectAccount,
    wipeAccountData,
  } = useAppStore();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h2 className="font-heading font-bold text-2xl text-foreground">Integrations & Accounts</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Connect all your accounts once. Read-only permissions by default, client-side encryption.
          </p>
        </div>

        <button
          onClick={() => triggerSync()}
          disabled={isSyncing}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center gap-2 hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing accounts...' : 'Sync All Accounts'}</span>
        </button>
      </div>

      {/* Active Connected Accounts Section */}
      <div className="space-y-4">
        <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
          <span>Active Connections</span>
          <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
            {accounts.length}
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => {
            const hasError = acc.status === 'needs_reconnect' || acc.status === 'error';
            const isPaused = acc.status === 'paused';

            return (
              <div
                key={acc.id}
                className={`p-5 rounded-2xl glass-panel border transition-all space-y-4 shadow-lg ${
                  hasError ? 'border-rose-500/40 bg-rose-950/10' : 'border-border/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full ring-4 ring-background shrink-0"
                      style={{ backgroundColor: acc.color }}
                    />
                    <div>
                      <h4 className="font-heading font-semibold text-base text-foreground">
                        {acc.label}
                      </h4>
                      <p className="text-xs font-mono text-muted-foreground">{acc.email}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${
                      hasError
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isPaused
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {hasError ? (
                      <>
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Needs Reconnect
                      </>
                    ) : isPaused ? (
                      'Paused'
                    ) : (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Connected
                      </>
                    )}
                  </span>
                </div>

                {acc.error_message && (
                  <p className="text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                    {acc.error_message}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-2 border-t border-border/30">
                  <span>Last synced: {formatTimeAgo(acc.last_synced_at)}</span>

                  <div className="flex items-center gap-2">
                    {hasError ? (
                      <button
                        onClick={() => reconnectAccount(acc.id)}
                        className="px-2.5 py-1 rounded-lg bg-sky-500 text-slate-950 font-medium text-xs hover:bg-sky-400 transition-colors cursor-pointer"
                      >
                        Reconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => disconnectAccount(acc.id)}
                        className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                        title="Pause sync"
                      >
                        Pause
                      </button>
                    )}

                    <button
                      onClick={() => wipeAccountData(acc.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 cursor-pointer p-1"
                      title="Wipe synced items for this account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Available Adapters Catalog */}
      <div className="space-y-4 pt-4">
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Available Integrations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect educational platforms, enterprise mail, cloud storage, and task managers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_PROVIDERS.map((provider) => {
            const isConnected = accounts.some((a) => a.provider === provider.key);

            return (
              <div
                key={provider.key}
                className="p-5 rounded-2xl glass-panel border border-border/60 hover:border-border/90 flex flex-col justify-between transition-all group shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                      {provider.category}
                    </span>
                    {provider.badge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {provider.badge}
                      </span>
                    )}
                  </div>

                  <h4 className="font-heading font-semibold text-base text-foreground">
                    {provider.name}
                  </h4>

                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {provider.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {provider.scopes.slice(0, 3).map((scope) => (
                      <span
                        key={scope}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground"
                      >
                        {scope}
                      </span>
                    ))}
                    {provider.scopes.length > 3 && (
                      <span className="text-[9px] font-mono text-muted-foreground px-1">
                        +{provider.scopes.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border/30 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3 text-muted-foreground/80" />
                    Read-only
                  </span>

                  <button
                    disabled={isConnected}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      isConnected
                        ? 'bg-muted text-muted-foreground opacity-60 cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isConnected ? 'Linked' : 'Connect'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
