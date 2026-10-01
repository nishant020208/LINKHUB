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
  ExternalLink,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useSyncData } from '@/hooks/useSyncData';
import { queryKeys } from '@/lib/queryKeys';
import { formatTimeAgo } from '@/lib/utils';
import { ItemType } from '@/types';
import { ConnectModal, ProviderConnectConfig } from '@/components/integrations/ConnectModal';
import { useProviderStatus } from '@/hooks/useProviderStatus';
import { connectWithCredentials } from '@/lib/oauth';
import { GoogleApiErrorHelp } from '@/components/integrations/GoogleApiErrorHelp';
import { ProviderLogo } from '@/components/ui/provider-logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  // 2. Developer & Knowledge
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
    isSyncing,
    disconnectAccount,
    reconnectAccount,
    toggleAccountSyncType,
  } = useAppStore();
  const { triggerSync } = useSyncData();
  const { isConfigured, statuses } = useProviderStatus();

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
      const synced = params.get('synced');
      const syncError = params.get('sync_error');
      setCallbackBanner({
        type: 'success',
        message: syncError
          ? `Connected ${provider || 'account'}, but the first sync reported: ${syncError}`
          : `Connected ${provider || 'account'}! ${synced && synced !== '0' ? `${synced} items synced.` : 'Initial sync triggered.'}`,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      queryClient.invalidateQueries({ queryKey: queryKeys.syncLogs });
      navigate('/integrations', { replace: true });
    } else if (status === 'error') {
      setCallbackBanner({
        type: 'error',
        message: message ? decodeURIComponent(message) : 'Account authorization was cancelled or failed.',
      });
      navigate('/integrations', { replace: true });
    }
  }, [location.search, navigate]);

  // Trello uses public OAuth and returns its token in the URL fragment, so it
  // cannot reach the shared callback. Capture it here, save it via
  // connect-credentials, then clean the URL.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('token=')) return;

    let pending = false;
    try {
      pending = sessionStorage.getItem('unifyhub-trello-pending') === '1';
    } catch {
      pending = false;
    }
    if (!pending) return;

    const token = new URLSearchParams(hash.replace(/^#/, '')).get('token');
    try {
      sessionStorage.removeItem('unifyhub-trello-pending');
    } catch {
      // ignore storage errors
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!token) return;

    connectWithCredentials('trello', { token })
      .then(() => {
        setCallbackBanner({ type: 'success', message: 'Connected Trello! Initial sync triggered.' });
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
        queryClient.invalidateQueries({ queryKey: queryKeys.items });
        queryClient.invalidateQueries({ queryKey: queryKeys.syncLogs });
      })
      .catch((err: unknown) => {
        setCallbackBanner({
          type: 'error',
          message: err instanceof Error ? err.message : 'Trello connection failed.',
        });
      });
  }, []);

  const filteredProviders = ALL_PROVIDERS.filter((provider) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Academic') return provider.category === 'Academic';
    if (activeTab === 'Productivity') return provider.category === 'Productivity' || provider.category === 'Google';
    if (activeTab === 'Developer') return provider.category === 'Developer';
    if (activeTab === 'Collaboration') return provider.category === 'Collaboration' || provider.category === 'Meetings' || provider.category === 'Enterprise';
    if (activeTab === 'Storage') return provider.category === 'Storage';
    if (activeTab === 'Email') return provider.category === 'Email' || provider.key === 'google';
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
    <div className="space-y-6 sm:space-y-8">
      {/* Google Cloud setup notice — the #1 cause of 403 accessNotConfigured */}
      <div className="p-4 rounded-2xl border bg-status-warning/5 border-status-warning/25 space-y-2">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-status-warning mt-0.5" />
          <div className="min-w-0 text-xs">
            <p className="font-semibold text-foreground">First time connecting Google?</p>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">
              Your Google Cloud project must enable each API before UnifyHub can read it. If a stream fails
              with <span className="font-mono text-status-warning">403 accessNotConfigured</span>, the Sync
              Status panel shows a direct <strong className="text-foreground">Enable on Google Cloud</strong>{' '}
              button for that exact API — click it, press Enable, wait a minute, then Sync Now.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                ['Calendar', 'https://console.developers.google.com/apis/api/calendar-json.googleapis.com?project=945009721694'],
                ['Gmail', 'https://console.developers.google.com/apis/api/gmail.googleapis.com?project=945009721694'],
                ['Drive', 'https://console.developers.google.com/apis/api/drive.googleapis.com?project=945009721694'],
                ['Tasks', 'https://console.developers.google.com/apis/api/tasks.googleapis.com?project=945009721694'],
                ['Classroom', 'https://console.developers.google.com/apis/api/classroom.googleapis.com?project=945009721694'],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-card/60 border border-border/50 text-[11px] font-mono text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                >
                  {label}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* OAuth Callback Notice Banner */}
      {callbackBanner && (
        <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
            callbackBanner.type === 'success'
              ? 'bg-status-connected/10 border-status-connected/30 text-status-connected'
              : 'bg-status-error/10 border-status-error/30 text-status-error'
          }`}
        >
          <div className="flex items-center gap-2">
            {callbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-status-connected shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-status-error shrink-0" />
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
            Connect your academic, enterprise, and developer services with read-only permissions.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => triggerSync()}
          disabled={isSyncing}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing accounts...' : 'Sync All Accounts'}</span>
        </Button>
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
              <Card
                key={acc.id}
                variant="bento"
                interactive
                className={`p-5 space-y-4 ${
                  hasError ? 'border-status-error/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProviderLogo
                      provider={acc.provider}
                      size={18}
                      state={hasError ? 'error' : isPaused ? 'idle' : isSyncing ? 'syncing' : 'connected'}
                      title={acc.label}
                    />
                    <div>
                      <h4 className="font-heading font-semibold text-base text-foreground">
                        {acc.label}
                      </h4>
                      <p className="text-xs font-mono text-muted-foreground">{acc.email}</p>
                    </div>
                  </div>

                  <Badge status={hasError ? 'error' : isPaused ? 'paused' : 'connected'}>
                    {hasError ? 'Needs Reconnect' : isPaused ? 'Paused' : 'Connected'}
                  </Badge>
                </div>

                {acc.error_message && <GoogleApiErrorHelp errorMessage={acc.error_message} />}

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
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => reconnectAccount(acc.id)}
                      >
                        Reconnect
                      </Button>
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
                      className="px-2.5 py-1 min-h-[32px] rounded-lg bg-status-error/10 hover:bg-status-error/20 text-status-error border border-status-error/20 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                      title="Disconnect account and delete all stored items"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              </Card>
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
            // undefined while status is loading / unavailable → optimistically
            // allow the attempt; false means we KNOW its secrets are missing.
            const notConfigured = isConfigured(provider.key) === false;
            const missingSecrets = statuses[provider.key]?.missing ?? [];

            let status: 'Not connected' | 'Connected' | 'Syncing' | 'Needs reconnect' | 'Error' | 'Not configured';
            if (notConfigured) {
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
              <Card
                key={provider.key}
                variant="bento"
                interactive={!notConfigured}
                className={`p-5 flex flex-col justify-between group ${
                  notConfigured ? 'opacity-75' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-semibold">
                      {provider.category}
                    </span>
                    <Badge
                      status={
                        status === 'Connected'
                          ? 'connected'
                          : status === 'Syncing'
                          ? 'syncing'
                          : status === 'Needs reconnect'
                          ? 'needs_reconnect'
                          : status === 'Error'
                          ? 'error'
                          : 'idle'
                      }
                    >
                      {status}
                    </Badge>
                  </div>

                  <h4 className="font-heading font-semibold text-base text-foreground flex items-center gap-2">
                    <ProviderLogo
                      provider={provider.key}
                      size={16}
                      state={
                        status === 'Connected'
                          ? 'connected'
                          : status === 'Syncing'
                          ? 'syncing'
                          : status === 'Error' || status === 'Needs reconnect'
                          ? 'error'
                          : 'idle'
                      }
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

                <div className="mt-5 pt-3 border-t border-border/30 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 min-w-0">
                    <Lock className="w-3 h-3 text-muted-foreground/80 shrink-0" />
                    {notConfigured && missingSecrets.length > 0 ? (
                      <span className="truncate" title={`Missing secrets: ${missingSecrets.join(', ')}`}>
                        Set {missingSecrets.join(', ')}
                      </span>
                    ) : (
                      'Read-only'
                    )}
                  </span>

                  <Button
                    variant={notConfigured ? 'ghost' : isConnected ? 'secondary' : 'primary'}
                    size="xs"
                    onClick={() => !notConfigured && setSelectedProvider(provider)}
                    disabled={notConfigured}
                    title={notConfigured ? `This integration isn't configured yet. Add the Supabase secret${missingSecrets.length === 1 ? '' : 's'}: ${missingSecrets.join(', ')}` : undefined}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {notConfigured ? 'Not Configured' : isConnected ? 'Add Another' : 'Connect'}
                    </span>
                  </Button>
                </div>
              </Card>
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
