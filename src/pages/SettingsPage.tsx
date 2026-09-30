import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Sparkles, Bell, Clock, Link as LinkIcon, User as UserIcon, Check } from 'lucide-react';
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
  const { theme, setTheme, notificationPreferences, updateNotificationPreferences, accounts, lastSyncedAt } =
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
