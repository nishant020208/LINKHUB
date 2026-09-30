export type ItemType = 'email' | 'event' | 'deadline' | 'task' | 'file';

export type AccountProvider =
  | 'google'
  | 'microsoft'
  | 'github'
  | 'notion'
  | 'todoist'
  | 'slack'
  | 'linear'
  | 'jira'
  | 'ical'
  | 'moodle'
  | 'canvas'
  | 'dropbox'
  | 'box'
  | 'zoom'
  | 'gitlab'
  | 'bitbucket'
  | 'trello'
  | 'asana'
  | 'clickup'
  | 'imap';

export type AccountStatus = 'connected' | 'needs_reconnect' | 'syncing' | 'error' | 'paused';

export interface ConnectedAccount {
  id: string;
  user_id: string;
  provider: AccountProvider;
  email: string;
  label: string;
  color: string;
  status: AccountStatus;
  last_synced_at: string | null;
  error_message?: string | null;
  granted_scopes?: string[];
  sync_enabled_types?: ItemType[];
  created_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  account_id: string;
  type: ItemType;
  title: string;
  description?: string | null;
  due_at?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  url?: string | null;
  source_id: string;
  priority_score: number;
  is_done: boolean;
  snoozed_until?: string | null;
  raw?: Record<string, unknown>;
  metadata?: {
    sender?: string;
    course_name?: string;
    location?: string;
    file_type?: string;
    file_size_formatted?: string;
    pinned?: boolean;
    urgent_keywords?: string[];
    travel_data?: {
      booking_ref?: string;
      flight_or_hotel?: string;
      date_range?: string;
    };
    bill_data?: {
      amount?: string;
      currency?: string;
      due_date?: string;
      merchant?: string;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  icon: string;
  account_ids: string[];
  included_types: ItemType[];
  is_default: boolean;
}

export interface ProviderAdapter {
  key: AccountProvider;
  name: string;
  category: 'google' | 'microsoft' | 'academic' | 'developer' | 'productivity' | 'custom';
  authType: 'oauth' | 'token' | 'url' | 'credentials';
  requiredScopes?: string[];
  description: string;
  icon: string;
  connect: (config?: Record<string, unknown>) => Promise<{ authUrl?: string; account?: Partial<ConnectedAccount> }>;
  fetchItems: (account: ConnectedAccount, since?: string) => Promise<unknown[]>;
  normalize: (raw: unknown[], account: ConnectedAccount) => Item[];
  refreshAuth?: (account: ConnectedAccount) => Promise<boolean>;
}

export interface DailyBriefing {
  id: string;
  date: string;
  headline: string;
  summary: string;
  urgent_count: number;
  meetings_count: number;
  free_slots_summary: string;
  generated_at: string;
}

export interface NotificationChannelConfig {
  id: string;
  user_id: string;
  channel: 'email' | 'web_push' | 'telegram' | 'sms' | 'whatsapp';
  enabled: boolean;
  target_address?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface NotificationPreferences {
  channels: {
    email: boolean;
    web_push: boolean;
    telegram: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  targets: {
    emailAddress: string;
    telegramChatId: string;
    phoneNumber: string;
    whatsappNumber: string;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    allowCritical: boolean;
  };
  frequency: 'immediate' | 'daily_briefing' | 'urgent_only';
}

export type ThemeMode = 'dark' | 'light' | 'aesthetic';


