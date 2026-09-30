import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Bell, Clock, Link as LinkIcon, User as UserIcon } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { formatTimeAgo } from '@/lib/utils';

/**
 * Settings — theme, notifications & quiet hours, and account overview.
 */
export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme, notificationPreferences, updateNotificationPreferences, accounts, lastSyncedAt } =
    useAppStore();
  const user = useAuthStore((s) => s.user);

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
            {theme === 'dark' ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
            <h3 className="font-display font-semibold text-sm">Appearance</h3>
          </div>
        </CardHeader>
        <CardBody className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Both themes are hand-tuned; switch anytime.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            Switch to {theme === 'dark' ? 'light' : 'dark'}
          </Button>
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

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Notifications</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <SwitchRow
            label="Email alerts"
            description="Deadline reminders and daily summaries via email."
            checked={notificationPreferences.channels.email}
            onChange={(v) => updateNotificationPreferences({ channels: { email: v } })}
          />
          <SwitchRow
            label="Browser push"
            description="Instant alerts in this browser, even when the tab is closed."
            checked={notificationPreferences.channels.web_push}
            onChange={(v) => updateNotificationPreferences({ channels: { web_push: v } })}
          />
          <SwitchRow
            label="Telegram"
            description="Send alerts to your Telegram chat."
            checked={notificationPreferences.channels.telegram}
            onChange={(v) => updateNotificationPreferences({ channels: { telegram: v } })}
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
    </div>
  );
};

const SwitchRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onChange={onChange} />
  </div>
);
