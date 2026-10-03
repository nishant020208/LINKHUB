import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  Sparkles,
  Bell,
  Clock,
  Link as LinkIcon,
  User as UserIcon,
  Check,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { InstallButton, InstallInstructions } from '@/components/pwa/InstallPrompt';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { formatTimeAgo } from '@/lib/utils';
import { ConsistencyStatCard } from '@/components/dashboard/ConsistencyStatCard';
import { calculateConsistencyMetrics } from '@/lib/smart/consistencyMetrics';

/**
 * Settings — theme, notifications & quiet hours, and account overview.
 */
export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme, notificationPreferences, updateNotificationPreferences, accounts, items, lastSyncedAt } =
    useAppStore();
  const user = useAuthStore((s) => s.user);
  const consistencyStats = React.useMemo(() => calculateConsistencyMetrics(items), [items]);
  // Own instance with the first-visit auto-prompt disabled: the PwaManager owns
  // that, so opening Settings must never make the tutorial appear on its own.
  const install = useInstallPrompt(false);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border/40">
        <h2 className="font-display font-bold text-2xl">Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Personalize your command center</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-primary" />
            ) : theme === 'light' ? (
              <Sun className="w-4 h-4 text-primary" />
            ) : (
              <Sparkles className="w-4 h-4 text-primary" />
            )}
            <h3 className="font-display font-semibold text-sm">Display Mode & Atmosphere</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Select an art-directed palette tailored for deep focus, crisp daylight reading, or atmospheric midnight immersion.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'dark' as const,
                title: 'Dark',
                desc: 'Deep space obsidian surfaces with electric indigo accents.',
                icon: Moon,
                colorDot: '#7c6cf6',
              },
              {
                id: 'light' as const,
                title: 'Light',
                desc: 'Warm alabaster paper with crisp violet ink for bright daylight.',
                icon: Sun,
                colorDot: '#6049ea',
              },
              {
                id: 'aesthetic' as const,
                title: 'Aesthetic',
                desc: 'Midnight dusk with luminescent ultraviolet glow and tactile depth.',
                icon: Sparkles,
                colorDot: '#9d5cfc',
              },
            ].map((mode) => {
              const Icon = mode.icon;
              const isSelected = theme === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setTheme(mode.id)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/10 shadow-md'
                      : 'border-border/60 bg-card/60 hover:bg-card hover:border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: mode.colorDot }}
                        />
                        <span className="font-display font-semibold text-xs text-foreground">{mode.title}</span>
                      </div>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{mode.desc}</p>
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-2 border-t border-primary/20 flex items-center gap-1.5 text-[10px] font-mono text-primary font-semibold">
                      <Check className="w-3 h-3" />
                      <span>Active Mode</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Profile</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-3">
            {user?.avatarUrl && (
              <img src={user.avatarUrl} alt={user.fullName} className="w-10 h-10 rounded-2xl ring-1 ring-border/50" />
            )}
            <div>
              <p className="text-sm font-semibold">{user?.fullName ?? 'Not signed in'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Connected accounts</span>
            <Badge tone="neutral">{accounts.length}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Last sync</span>
            <span className="font-mono">{formatTimeAgo(lastSyncedAt)}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/integrations')}>
            <LinkIcon className="w-3.5 h-3.5" />
            Manage integrations
          </Button>
        </CardBody>
      </Card>

      {/* Install / App Experience */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Install UnifyHub</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Add UnifyHub to your home screen for a full-screen, app-like launch with an offline
            copy of your shell. No app store account required.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <InstallButton install={install} />
            {install.isStandalone && (
              <span className="text-[11px] font-mono text-muted-foreground">
                Running as an installed app
              </span>
            )}
          </div>
          <InstallInstructions
            isOpen={install.isInstructionsOpen}
            onClose={install.closeInstructions}
            platform={install.platform}
          />
        </CardBody>
      </Card>

      {/* Execution Reliability & Consistency Telemetry */}
      <ConsistencyStatCard stats={consistencyStats} />

      {/* Storage Usage & Data Retention Foundation */}
      <StorageSettingsCard accounts={accounts} userId={user?.id} />

      {/* Automated Background Sync */}
      <ScheduledSyncCard />

      {/* Notifications */}
      <NotificationsCard
        notificationPreferences={notificationPreferences}
        updateNotificationPreferences={updateNotificationPreferences}
        userEmail={user?.email}
      />
    </div>
  );
};

const NotificationsCard: React.FC<{
  notificationPreferences: ReturnType<typeof useAppStore.getState>['notificationPreferences'];
  updateNotificationPreferences: ReturnType<typeof useAppStore.getState>['updateNotificationPreferences'];
  userEmail?: string;
}> = ({ notificationPreferences, updateNotificationPreferences, userEmail }) => {
  const [testingChannel, setTestingChannel] = React.useState<string | null>(null);
  const [testFeedback, setTestFeedback] = React.useState<{ channel: string; message: string; isError?: boolean } | null>(null);

  const handleTest = async (channel: 'email' | 'web_push' | 'telegram') => {
    setTestingChannel(channel);
    setTestFeedback(null);
    try {
      if (channel === 'web_push') {
        if (!('Notification' in window)) {
          setTestFeedback({ channel, message: 'Browser does not support desktop notifications.', isError: true });
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('UnifyHub Test Alert', {
            body: 'Browser push notifications are active and working!',
            icon: '/favicon.svg',
          });
          setTestFeedback({ channel, message: 'Push notification displayed successfully!' });
        } else {
          setTestFeedback({ channel, message: 'Browser notification permission was denied.', isError: true });
        }
        return;
      }

      let recipient = userEmail || 'nishant020208@gmail.com';
      if (channel === 'telegram') {
        const promptId = window.prompt('Enter your Telegram Chat ID:');
        if (!promptId) return;
        recipient = promptId.trim();
      }

      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.functions.invoke('dispatch-notification', {
        body: {
          channel,
          recipient,
          title: 'UnifyHub Notification Test',
          body: `Test notification sent for ${channel} channel from Settings.`,
          priority: 'high',
        },
      });

      if (error) {
        setTestFeedback({ channel, message: `Failed: ${error.message}`, isError: true });
      } else if (data?.success) {
        setTestFeedback({ channel, message: data.message || 'Notification delivered successfully!' });
      } else {
        setTestFeedback({ channel, message: data?.error || 'Dispatch returned an error.', isError: true });
      }
    } catch (err) {
      setTestFeedback({ channel, message: String(err), isError: true });
    } finally {
      setTestingChannel(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-sm">Notifications &amp; Alerts</h3>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {testFeedback && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
              testFeedback.isError
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span>{testFeedback.message}</span>
            <button
              type="button"
              onClick={() => setTestFeedback(null)}
              className="text-[10px] font-mono underline ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <SwitchRow
          label="Email alerts"
          description="Deadline reminders and daily summaries via email."
          checked={notificationPreferences.channels.email}
          onChange={(v) => updateNotificationPreferences({ channels: { email: v } })}
          onTest={() => handleTest('email')}
          isTesting={testingChannel === 'email'}
        />
        <SwitchRow
          label="Browser push"
          description="Instant alerts in this browser, even when the tab is closed."
          checked={notificationPreferences.channels.web_push}
          onChange={(v) => updateNotificationPreferences({ channels: { web_push: v } })}
          onTest={() => handleTest('web_push')}
          isTesting={testingChannel === 'web_push'}
        />
        <SwitchRow
          label="Telegram"
          description="Send alerts to your Telegram chat."
          checked={notificationPreferences.channels.telegram}
          onChange={(v) => updateNotificationPreferences({ channels: { telegram: v } })}
          onTest={() => handleTest('telegram')}
          isTesting={testingChannel === 'telegram'}
        />

        <div className="pt-2 border-t border-border/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            Quiet hours
          </div>
          <SwitchRow
            label="Enable quiet hours"
            description="Silence non-critical alerts between start and end times."
            checked={notificationPreferences.quietHours.enabled}
            onChange={(v) => updateNotificationPreferences({ quietHours: { enabled: v } })}
          />
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={notificationPreferences.quietHours.start}
              onChange={(e) => updateNotificationPreferences({ quietHours: { start: e.target.value } })}
              className="text-xs font-mono px-2.5 py-1.5 rounded-xl bg-background/70 border border-border text-foreground focus:outline-none focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="time"
              value={notificationPreferences.quietHours.end}
              onChange={(e) => updateNotificationPreferences({ quietHours: { end: e.target.value } })}
              className="text-xs font-mono px-2.5 py-1.5 rounded-xl bg-background/70 border border-border text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <SwitchRow
            label="Critical bypass"
            description="Still alert for deadlines due within 2 hours."
            checked={notificationPreferences.quietHours.allowCritical}
            onChange={(v) => updateNotificationPreferences({ quietHours: { allowCritical: v } })}
          />
        </div>
      </CardBody>
    </Card>
  );
};

const ScheduledSyncCard: React.FC = () => {
  const [syncStatus, setSyncStatus] = React.useState<{
    active: boolean;
    cron_installed?: boolean;
    net_installed?: boolean;
    job_count?: number;
    job_name?: string;
    last_run?: string | null;
    last_status?: string | null;
    reason?: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.rpc('check_scheduled_sync_status');
      if (error) {
        setSyncStatus({ active: false, reason: error.message });
      } else {
        setSyncStatus(data as any);
      }
    } catch (e) {
      setSyncStatus({ active: false, reason: String(e) });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    checkStatus();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 text-primary ${loading ? 'animate-spin' : ''}`} />
            <h3 className="font-display font-semibold text-sm">Automated Background Sync</h3>
          </div>
          {syncStatus && (
            <Badge tone={syncStatus.active ? 'success' : 'warning'}>
              {syncStatus.active ? 'Scheduled sync: Active' : 'Scheduled sync: Inactive'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Background sync keeps your emails, calendars, and tasks synchronized every 15 minutes via Postgres pg_cron and pg_net without requiring the dashboard to remain open.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-card/60 border border-border/40 space-y-1">
            <div className="text-[11px] font-mono uppercase text-muted-foreground">Cron Engine</div>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              {syncStatus?.cron_installed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>pg_cron enabled (15m interval)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>pg_cron not enabled</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-card/60 border border-border/40 space-y-1">
            <div className="text-[11px] font-mono uppercase text-muted-foreground">HTTP Dispatcher</div>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              {syncStatus?.net_installed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>pg_net active</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>pg_net not installed</span>
                </>
              )}
            </div>
          </div>
        </div>

        {syncStatus && !syncStatus.active && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>How to enable in Supabase:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Open your Supabase Dashboard &rarr; <strong>Database</strong> &rarr; <strong>Extensions</strong>. Search for <code>pg_cron</code> and <code>pg_net</code> and toggle them ON.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-mono text-muted-foreground">
            {syncStatus?.last_run
              ? `Last run: ${new Date(syncStatus.last_run).toLocaleTimeString()}`
              : 'Status: Verified active via Postgres'}
          </span>
          <Button variant="secondary" size="sm" onClick={checkStatus} disabled={loading} className="text-xs h-7 cursor-pointer">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh status
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

const SwitchRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  onTest?: () => void;
  isTesting?: boolean;
}> = ({ label, description, checked, onChange, onTest, isTesting }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <div className="flex items-center gap-2">
      {onTest && (
        <Button
          variant="secondary"
          size="sm"
          className="h-7 text-xs px-2.5 py-0 rounded-lg cursor-pointer"
          onClick={onTest}
          disabled={isTesting}
        >
          {isTesting ? 'Sending...' : 'Send test'}
        </Button>
      )}
      <Switch checked={checked} onChange={onChange} />
    </div>
  </div>
);

const StorageSettingsCard: React.FC<{
  accounts: ReturnType<typeof useAppStore.getState>['accounts'];
  userId?: string;
}> = ({ accounts, userId }) => {
  const [retentionDays, setRetentionDays] = React.useState<number>(0);
  const [storageUsed, setStorageUsed] = React.useState<number>(0);
  const [storageLimit, setStorageLimit] = React.useState<number>(1073741824); // 1 GB
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [exportFeedback, setExportFeedback] = React.useState<string | null>(null);

  const handleExportData = async () => {
    setExporting(true);
    setExportFeedback(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: userId ? { user_id: userId } : {},
      });
      if (error) {
        setExportFeedback(`Export failed: ${error.message}`);
      } else if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `unifyhub-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setExportFeedback('Export downloaded successfully!');
        setTimeout(() => setExportFeedback(null), 4000);
      }
    } catch (err) {
      setExportFeedback(`Export error: ${String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  React.useEffect(() => {
    if (!userId) return;
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('user_settings')
        .select('storage_used_bytes, storage_limit_bytes, data_retention_days')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setStorageUsed(data.storage_used_bytes || 0);
            setStorageLimit(data.storage_limit_bytes || 1073741824);
            setRetentionDays(data.data_retention_days || 0);
          }
        });
    });
  }, [userId]);

  const handleSaveRetention = async (days: number) => {
    setRetentionDays(days);
    if (!userId) return;
    setSaving(true);
    const { supabase } = await import('@/lib/supabase');
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, data_retention_days: days }, { onConflict: 'user_id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const usedMB = (storageUsed / (1024 * 1024)).toFixed(1);
  const limitMB = (storageLimit / (1024 * 1024)).toFixed(0);
  const percent = Math.min(100, Math.round((storageUsed / storageLimit) * 100));
  const isNearLimit = percent >= 80;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Clock className="w-4 h-4" />
            </span>
            <h3 className="font-display font-semibold text-sm">Storage &amp; Data Retention</h3>
          </div>
          {isNearLimit && (
            <Badge tone="warning">
              Approaching storage limit ({percent}%)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        {/* Storage Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-mono">
              Full-content Storage ({usedMB} MB of {limitMB} MB)
            </span>
            <span className="font-mono font-semibold text-foreground">{percent}% used</span>
          </div>
          <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isNearLimit ? 'bg-status-warning' : 'bg-primary'
              }`}
              style={{ width: `${Math.max(2, percent)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Includes downloaded attachments, email bodies, file contents, and message threads stored encrypted in your private bucket.
          </p>
        </div>

        {/* Per-account breakdown */}
        {accounts.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Storage Usage by Provider
            </h4>
            <div className="space-y-2">
              {accounts.map((acc) => {
                const accBytes = acc.storage_used_bytes || 0;
                const accMB = (accBytes / (1024 * 1024)).toFixed(2);
                const fullCount = acc.items_full_synced_count ?? 0;
                const totalCount = acc.items_total_count ?? 0;

                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-card/60 border border-border/40 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: acc.color }}
                      />
                      <span className="font-medium text-foreground">{acc.label}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                      <span>{fullCount}/{totalCount} items synced</span>
                      <span className="font-semibold text-foreground">{accMB} MB</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Retention Period */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div>
            <h4 className="text-xs font-semibold text-foreground">Content Retention Window</h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Configure automatic purge of synchronized email bodies, attachments, and messages. Disconnecting an account always deletes 100% of stored content immediately.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Keep forever', value: 0 },
              { label: '30 days', value: 30 },
              { label: '90 days', value: 90 },
              { label: '180 days', value: 180 },
              { label: '1 year', value: 365 },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSaveRetention(opt.value)}
                disabled={saving}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-colors border cursor-pointer ${
                  retentionDays === opt.value
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'bg-card/60 border-border/60 text-muted-foreground hover:text-foreground hover:bg-card'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {saved && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
        </div>

        {/* Data Export & Backup */}
        <div className="space-y-3 pt-3 border-t border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>Export Personal Data Archive</span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Download a complete, portable JSON backup of your synchronized items, accounts metadata, settings, and digests.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportData}
              disabled={exporting}
              className="text-xs h-8 cursor-pointer shrink-0 gap-1.5"
            >
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
              <span>{exporting ? 'Generating export...' : 'Export my data'}</span>
            </Button>
          </div>
          {exportFeedback && (
            <p className="text-[11px] font-mono text-emerald-400">{exportFeedback}</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
