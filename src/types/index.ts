export type ItemType = 'email' | 'event' | 'deadline' | 'task' | 'file';

export type AccountProvider =
  | 'google'
  | 'github'
  | 'notion'
  | 'todoist'
  | 'slack'
  | 'linear'
  | 'jira'
  | 'moodle'
  | 'dropbox'
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
  storage_used_bytes?: number;
  items_total_count?: number;
  items_full_synced_count?: number;
  items_skipped_count?: number;
  skip_reasons?: Record<string, number>;
  created_at: string;
}

export interface ItemContent {
  id: string;
  item_id: string;
  user_id: string;
  account_id: string;
  body_text?: string | null;
  body_html?: string | null;
  body_markdown?: string | null;
  structured_content?: Record<string, unknown>;
  sync_status: 'synced' | 'partial' | 'skipped' | 'too_large' | 'error';
  skip_reason?: string | null;
  content_size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface ItemAttachment {
  id: string;
  item_id: string;
  user_id: string;
  account_id: string;
  name: string;
  mime_type?: string | null;
  size_bytes: number;
  storage_path?: string | null;
  external_url?: string | null;
  is_inline: boolean;
  content_id?: string | null;
  created_at: string;
}

export interface ItemComment {
  id: string;
  item_id: string;
  user_id: string;
  account_id: string;
  author_name?: string | null;
  author_avatar?: string | null;
  body: string;
  body_html?: string | null;
  source_id?: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  data_retention_days: number;
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
    repository?: string;
    project?: string;
    labels?: string[];
    comments_count?: number;
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
    [key: string]: unknown;
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
  category: 'google' | 'academic' | 'developer' | 'productivity' | 'custom';
  authType: 'oauth' | 'token' | 'credentials';
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


