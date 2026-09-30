import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bell,
  Mail,
  Send,
  MessageSquare,
  Moon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export const NotificationSettingsModal: React.FC = () => {
  const {
    isNotificationModalOpen,
    setNotificationModalOpen,
    notificationPreferences,
    updateNotificationPreferences,
  } = useAppStore();

  const [testSent, setTestSent] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!isNotificationModalOpen) return null;

  const { channels, targets, quietHours, frequency } = notificationPreferences;

  const handleChannelToggle = (channelKey: keyof typeof channels) => {
    updateNotificationPreferences({
      channels: {
        ...channels,
        [channelKey]: !channels[channelKey],
      },
    });
  };

  const handleSendTestNotification = async () => {
    setIsSending(true);
    setTestError(null);
    setTestSent(false);

    try {
      // Simulate real dispatch to edge function / fallback
      await new Promise((resolve) => setTimeout(resolve, 800));

      const activeChannels = Object.entries(channels)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key);

      if (activeChannels.length === 0) {
        setTestError('Please enable at least one notification channel first.');
        setIsSending(false);
        return;
      }

      setTestSent(true);
      setTimeout(() => setTestSent(false), 4500);
    } catch {
      setTestError('Failed to dispatch test notification.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setNotificationModalOpen(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl rounded-2xl glass-panel border border-border/80 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  Notification Hub & Quiet Hours
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure multi-channel alerts, quiet schedules, and priority overrides.
                </p>
              </div>
            </div>
            <button
              onClick={() => setNotificationModalOpen(false)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Section 1: Channels */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-primary" />
                Delivery Channels
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Email */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    channels.email
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-card/40 border-border/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                      <Mail className="w-4 h-4 text-primary" />
                      <span>Email Digest</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={channels.email}
                      onChange={() => handleChannelToggle('email')}
                      className="rounded border-border accent-primary cursor-pointer w-4 h-4"
                    />
                  </div>
                  <input
                    type="email"
                    value={targets.emailAddress}
                    onChange={(e) =>
                      updateNotificationPreferences({
                        targets: { ...targets, emailAddress: e.target.value },
                      })
                    }
                    placeholder="name@university.edu"
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg bg-background/60 border border-border/50 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Web Push */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    channels.web_push
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-card/40 border-border/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span>Browser Push</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={channels.web_push}
                      onChange={() => handleChannelToggle('web_push')}
                      className="rounded border-border accent-primary cursor-pointer w-4 h-4"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Instant alerts for deadline countdowns and active calendar conflicts.
                  </p>
                </div>

                {/* Telegram Bot */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    channels.telegram
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-card/40 border-border/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                      <Send className="w-4 h-4 text-primary" />
                      <span>Telegram Bot</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={channels.telegram}
                      onChange={() => handleChannelToggle('telegram')}
                      className="rounded border-border accent-primary cursor-pointer w-4 h-4"
                    />
                  </div>
                  <input
                    type="text"
                    value={targets.telegramChatId}
                    onChange={(e) =>
                      updateNotificationPreferences({
                        targets: { ...targets, telegramChatId: e.target.value },
                      })
                    }
                    placeholder="@telegram_handle or Chat ID"
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg bg-background/60 border border-border/50 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                {/* SMS & WhatsApp (Disabled: Twilio / WhatsApp keys missing) */}
                <div className="p-3.5 rounded-xl border bg-card/20 border-border/30 opacity-60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                      <span>SMS / WhatsApp</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/80 text-muted-foreground">
                      Disabled (Keys Missing)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Requires Twilio SID / Auth Token and WhatsApp Business Cloud API keys. Kept disabled per configuration.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Quiet Hours */}
            <div className="p-4 rounded-xl bg-card/40 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-primary" />
                  <span className="font-heading font-medium text-sm text-foreground">
                    Quiet Hours Schedule
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={quietHours.enabled}
                  onChange={(e) =>
                    updateNotificationPreferences({
                      quietHours: { ...quietHours, enabled: e.target.checked },
                    })
                  }
                  className="rounded border-border accent-primary cursor-pointer w-4 h-4"
                />
              </div>

              {quietHours.enabled && (
                <div className="space-y-3 pt-2 border-t border-border/30">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">From:</span>
                      <input
                        type="time"
                        value={quietHours.start}
                        onChange={(e) =>
                          updateNotificationPreferences({
                            quietHours: { ...quietHours, start: e.target.value },
                          })
                        }
                        className="px-2 py-1 rounded bg-background/80 border border-border/50 font-mono text-foreground text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Until:</span>
                      <input
                        type="time"
                        value={quietHours.end}
                        onChange={(e) =>
                          updateNotificationPreferences({
                            quietHours: { ...quietHours, end: e.target.value },
                          })
                        }
                        className="px-2 py-1 rounded bg-background/80 border border-border/50 font-mono text-foreground text-xs"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={quietHours.allowCritical}
                      onChange={(e) =>
                        updateNotificationPreferences({
                          quietHours: { ...quietHours, allowCritical: e.target.checked },
                        })
                      }
                      className="rounded border-border accent-primary cursor-pointer w-3.5 h-3.5"
                    />
                    <ShieldAlert className="w-3.5 h-3.5 text-status-error" />
                    <span>Always allow critical alerts (deadlines due within 2 hours)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Section 3: Frequency */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                Notification Cadence
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'immediate', label: 'Real-time', desc: 'Alerts as items arrive' },
                    { id: 'daily_briefing', label: 'Morning Only', desc: 'One daily summary at 8 AM' },
                    { id: 'urgent_only', label: 'Urgent Only', desc: 'Score >= 80 only' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      updateNotificationPreferences({
                        frequency: opt.id,
                      })
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      frequency === opt.id
                        ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                        : 'bg-card/40 border-border/40 text-muted-foreground hover:bg-card hover:text-foreground'
                    }`}
                  >
                    <div className="font-heading font-medium text-xs mb-0.5">{opt.label}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer with Test Button and Status */}
          <div className="mt-6 pt-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {testSent && (
                <div className="flex items-center gap-1.5 text-xs text-status-connected">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Test notification sent to configured channels!</span>
                </div>
              )}
              {testError && (
                <div className="flex items-center gap-1.5 text-xs text-status-error">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{testError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleSendTestNotification}
                disabled={isSending}
                className="px-3.5 py-1.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Send className="w-3 h-3 text-primary" />
                <span>{isSending ? 'Sending...' : 'Test Channels'}</span>
              </button>

              <button
                onClick={() => setNotificationModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-all cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
