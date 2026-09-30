import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { queryClient } from '@/lib/queryClient';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Lock,
  Layers,
  Check,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTimeAgo } from '@/lib/utils';
import { ItemType } from '@/types';
import { ConnectModal, ProviderConnectConfig } from '@/components/integrations/ConnectModal';

const ALL_PROVIDERS: ProviderConnectConfig[] = [
  // 1. Google
  {
    key: 'google',
    name: 'Google Workspace & Classroom',
    category: 'Google',
    authType: 'oauth',
    color: '#4285F4',
    scopes: ['gmail.readonly', 'calendar.readonly', 'classroom.readonly', 'drive.metadata.readonly', 'tasks.readonly'],
    description: 'Sync personal & university Gmail, Google Calendar, Classroom assignments, and Drive docs.',
  },
  // 2. Microsoft
  {
    key: 'microsoft',
    name: 'Microsoft 365 & Outlook',
    category: 'Microsoft',
    authType: 'oauth',
    color: '#00A4EF',
    scopes: ['Mail.Read', 'Calendars.Read', 'Tasks.Read', 'Files.Read', 'User.Read'],
    description: 'University & corporate Outlook mail, Microsoft Teams schedules, To Do tasks, and OneDrive files.',
  },
  // 3. iCal
  {
    key: 'ical',
    name: 'iCal Timetable Subscription',
    category: 'Calendars',
    authType: 'url',
    color: '#10B981',
    scopes: ['webcal:// or https:// read-only stream'],
    description: 'Direct live calendar feed from university course timetables, Apple Calendar, or Athletics.',
  },
  // 4. Developer & Knowledge
  {
    key: 'github',
    name: 'GitHub',
    category: 'Developer',
    authType: 'oauth',
    color: '#24292F',
    scopes: ['read:user', 'repo:status', 'read:org'],
    description: 'Pull assigned pull requests, review requests, and repository issues into your unified queue.',
  },
  {
    key: 'notion',
    name: 'Notion',
    category: 'Productivity',
    authType: 'oauth',
    color: '#18181B',
    scopes: ['read_content'],
    description: 'Track database tasks, deadlines, and project pages from your shared Notion workspaces.',
  },
  {
    key: 'todoist',
    name: 'Todoist',
    category: 'Productivity',
    authType: 'oauth',
    color: '#E44332',
    scopes: ['data:read'],
    description: 'Two-way synchronized tasks, priorities, and recurring project checklists.',
  },
  // 5. Work & Collaboration
  {
    key: 'slack',
    name: 'Slack',
    category: 'Collaboration',
    authType: 'oauth',
    color: '#4A154B',
    scopes: ['channels:read', 'reminders:read', 'stars:read'],
    description: 'Capture "saved for later" messages, scheduled reminders, and channel action items.',
  },
  {
    key: 'linear',
    name: 'Linear',
    category: 'Developer',
    authType: 'oauth',
    color: '#5E6AD2',
    scopes: ['read'],
    description: 'Cycle milestones, urgent tickets, and assigned sprint issues across software projects.',
  },
  {
    key: 'jira',
    name: 'Jira Software',
    category: 'Enterprise',
    authType: 'oauth',
    color: '#0052CC',
    scopes: ['read:jira-work', 'read:jira-user'],
    description: 'Enterprise sprint tickets, bug backlogs, and agile board assignments.',
  },
  {
    key: 'trello',
    name: 'Trello',
    category: 'Productivity',
    authType: 'oauth',
    color: '#0079BF',
    scopes: ['read:board', 'read:card'],
    description: 'Kanban cards, due date checklists, and board activity streams.',
  },
  {
    key: 'asana',
    name: 'Asana',
    category: 'Productivity',
    authType: 'oauth',
    color: '#F06A6A',
    scopes: ['default:read'],
    description: 'Project portfolios, assigned milestones, and team tasks.',
  },
  {
    key: 'clickup',
    name: 'ClickUp',
    category: 'Productivity',
    authType: 'oauth',
    color: '#7B68EE',
    scopes: ['task:read', 'space:read'],
    description: 'Space tasks, sprint estimations, and custom statuses.',
  },
  // 6. Cloud Storage & Meetings
  {
    key: 'dropbox',
    name: 'Dropbox',
    category: 'Storage',
    authType: 'oauth',
    color: '#0061FF',
    scopes: ['files.metadata.read'],
    description: 'Recent syncs, shared project folders, and pinned research documents.',
  },
  {
    key: 'box',
    name: 'Box',
    category: 'Storage',
    authType: 'oauth',
    color: '#0061D5',
    scopes: ['root_readwrite:read'],
    description: 'Enterprise cloud documents, institutional folders, and collaborative notes.',
  },
  {
    key: 'zoom',
    name: 'Zoom Meetings',
    category: 'Meetings',
    authType: 'oauth',
    color: '#2D8CFF',
    scopes: ['meeting:read:meeting:admin'],
    description: 'Upcoming scheduled lectures, client video conferences, and join links.',
  },
  {
    key: 'gitlab',
    name: 'GitLab',
    category: 'Developer',
    authType: 'oauth',
    color: '#FC6D26',
    scopes: ['read_user', 'read_api'],
    description: 'Merge requests, assigned issues, and CI/CD pipeline deadline milestones.',
  },
  {
    key: 'bitbucket',
    name: 'Bitbucket',
    category: 'Developer',
    authType: 'oauth',
    color: '#0052CC',
    scopes: ['account:read', 'repository:read'],
    description: 'Pull requests, Jira integrated issues, and code reviews.',
  },
  // 7. Academic LMS
  {
    key: 'canvas',
    name: 'Canvas LMS',
    category: 'Academic',
    authType: 'token',
    color: '#E62429',
    scopes: ['courses:read', 'assignments:read', 'announcements:read'],
    description: 'Coursework submission deadlines, grade releases, and lecture announcements.',
  },
  {
    key: 'moodle',
    name: 'Moodle LMS',
    category: 'Academic',
    authType: 'token',
    color: '#F98012',
    scopes: ['core_enrol_get_users_courses', 'mod_assign_get_assignments'],
    description: 'Academic modules, quiz deadlines, and university portal items.',
  },
  // 8. Custom IMAP
  {
    key: 'imap',
    name: 'Custom IMAP / School Mail',
    category: 'Email',
    authType: 'credentials',
    color: '#64748B',
    scopes: ['RFC3501 IMAP read-only TLS'],
    description: 'Connect legacy university webmail servers directly via encrypted TLS.',
  },
];

const CATEGORIES = ['All', 'Academic', 'Productivity', 'Developer', 'Collaboration', 'Storage', 'Email'];

export const IntegrationsPage: React.FC = () => {
  const {
    accounts,
    triggerSync,
    isSyncing,
    disconnectAccount,
    reconnectAccount,
    toggleAccountSyncType,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState<ProviderConnectConfig | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [callbackBanner, setCallbackBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const provider = params.get('provider');
    const message = params.get('message');

    if (status === 'connected') {
      setCallbackBanner({
        type: 'success',
        message: `Successfully connected ${provider || 'account'}! Initial synchronization has been triggered.`,
      });
      queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
      navigate('/integrations', { replace: true });
    } else if (status === 'error') {
      setCallbackBanner({
        type: 'error',
        message: message ? decodeURIComponent(message) : 'Account authorization was cancelled or failed.',
      });
      navigate('/integrations', { replace: true });
    }
  }, [location.search, navigate]);

  const filteredProviders = ALL_PROVIDERS.filter((provider) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Academic') return provider.category === 'Academic' || provider.key === 'ical';
    if (activeTab === 'Productivity') return provider.category === 'Productivity' || provider.category === 'Google' || provider.category === 'Microsoft';
    if (activeTab === 'Developer') return provider.category === 'Developer';
    if (activeTab === 'Collaboration') return provider.category === 'Collaboration' || provider.category === 'Meetings' || provider.category === 'Enterprise';
    if (activeTab === 'Storage') return provider.category === 'Storage';
    if (activeTab === 'Email') return provider.category === 'Email' || provider.key === 'google' || provider.key === 'microsoft';
    return true;
  });

  const DATA_TYPES: { type: ItemType; label: string }[] = [
    { type: 'email', label: 'Mail' },
    { type: 'event', label: 'Calendar' },
    { type: 'deadline', label: 'Deadlines' },
    { type: 'task', label: 'Tasks' },
    { type: 'file', label: 'Files' },
  ];

  return (
    <div className="space-y-8">
      {/* OAuth Callback Notice Banner */}
      {callbackBanner && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
            callbackBanner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {callbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{callbackBanner.message}</span>
          </div>
          <button
            onClick={() => setCallbackBanner(null)}
            className="text-xs opacity-70 hover:opacity-100 font-mono underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h2 className="font-heading font-bold text-2xl text-foreground">Integrations & Accounts</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Connect all 18 academic, enterprise, and developer services with zero write permissions.
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
            const enabledTypes = acc.sync_enabled_types || ['email', 'event', 'deadline', 'task', 'file'];

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

                {/* Per-account Data Type Sync Toggles */}
                <div className="space-y-1.5 pt-1 border-t border-border/30">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Synchronized Data Types:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DATA_TYPES.map(({ type, label }) => {
                      const isEnabled = enabledTypes.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => toggleAccountSyncType(acc.id, type)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border ${
                            isEnabled
                              ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                              : 'bg-card/40 text-muted-foreground border-border/40 opacity-60 hover:opacity-100'
                          }`}
                        >
                          {isEnabled && <Check className="w-2.5 h-2.5" />}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-2 border-t border-border/30">
                  <span>Last synced: {formatTimeAgo(acc.last_synced_at)}</span>

                  <div className="flex items-center gap-2">
                    {hasError && (
                      <button
                        onClick={() => reconnectAccount(acc.id)}
                        className="px-2.5 py-1 rounded-lg bg-sky-500 text-slate-950 font-medium text-xs hover:bg-sky-400 transition-colors cursor-pointer"
                      >
                        Reconnect
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Disconnect ${acc.label}? This will permanently remove its credentials and delete all its synchronized emails, events, and tasks from UnifyHub.`
                        );
                        if (confirmed) {
                          await disconnectAccount(acc.id);
                          queryClient.invalidateQueries({ queryKey: ['connected_accounts'] });
                          queryClient.invalidateQueries({ queryKey: ['items'] });
                          queryClient.invalidateQueries({ queryKey: ['sync_logs'] });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Disconnect account and delete all stored items"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-lg text-foreground">Available Integrations</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select any adapter to connect via OAuth 2.0, Webcal, token, or encrypted IMAP.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/40 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === cat
                    ? 'bg-card text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.map((provider) => {
            const linkedAccounts = accounts.filter((a) => a.provider === provider.key);
            const isConnected = linkedAccounts.length > 0;
            const supportedKeys = ['google', 'microsoft', 'github', 'notion', 'todoist', 'slack', 'linear', 'ical'];
            const isConfigured = supportedKeys.includes(provider.key);

            let status: 'Not connected' | 'Connected' | 'Syncing' | 'Needs reconnect' | 'Error' | 'Not configured';
            if (!isConfigured) {
              status = 'Not configured';
            } else if (linkedAccounts.length === 0) {
              status = 'Not connected';
            } else if (isSyncing) {
              status = 'Syncing';
            } else if (linkedAccounts.some((a) => a.status === 'needs_reconnect')) {
              status = 'Needs reconnect';
            } else if (linkedAccounts.some((a) => a.status === 'error')) {
              status = 'Error';
            } else {
              status = 'Connected';
            }

            return (
              <div
                key={provider.key}
                className={`p-5 rounded-2xl glass-panel border flex flex-col justify-between transition-all group shadow-md ${
                  !isConfigured ? 'border-border/30 opacity-75' : 'border-border/60 hover:border-border/90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                      {provider.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-medium ${
                        status === 'Connected'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : status === 'Syncing'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 animate-pulse'
                          : status === 'Needs reconnect'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : status === 'Error'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : status === 'Not configured'
                          ? 'bg-muted/50 text-muted-foreground border-border/40'
                          : 'bg-muted text-muted-foreground border-border/40'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <h4 className="font-heading font-semibold text-base text-foreground flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: provider.color }}
                    />
                    <span>{provider.name}</span>
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
                    onClick={() => isConfigured && setSelectedProvider(provider)}
                    disabled={!isConfigured}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                      !isConfigured
                        ? 'bg-muted/40 text-muted-foreground border border-border/30 cursor-not-allowed'
                        : isConnected
                        ? 'bg-card border border-border/60 text-foreground hover:bg-card/80 cursor-pointer'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {!isConfigured ? 'Not Configured' : isConnected ? 'Add Another' : 'Connect'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Connect Modal */}
      <ConnectModal
        provider={selectedProvider}
        isOpen={Boolean(selectedProvider)}
        onClose={() => setSelectedProvider(null)}
      />
    </div>
  );
};
