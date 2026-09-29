import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const microsoftAdapter: ProviderAdapter = {
  key: 'microsoft',
  name: 'Microsoft 365 & Outlook',
  category: 'microsoft',
  authType: 'oauth',
  color: '#3b82f6',
  icon: 'Calendar',
  description: 'Outlook emails, calendars, To Do tasks, Teams meetings, and OneDrive documents.',
  requiredScopes: ['Mail.Read', 'Calendars.Read', 'Tasks.Read', 'Files.Read', 'User.Read', 'offline_access'],

  connect: async () => {
    return {
      authUrl: '/api/oauth/microsoft',
    };
  },

  fetchItems: async () => {
    return [];
  },

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `ms-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: (raw.type as Item['type']) || 'event',
      title: (raw.title as string) || (raw.subject as string) || 'Microsoft Event',
      description: (raw.bodyPreview as string) || (raw.description as string) || '',
      due_at: (raw.dueDateTime as string) || null,
      start_at: (raw.start as string) || null,
      end_at: (raw.end as string) || null,
      url: (raw.webLink as string) || null,
      source_id: (raw.id as string) || `ms-${idx}`,
      priority_score: Number(raw.priority_score) || 70,
      is_done: Boolean(raw.is_done),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },

  refreshAuth: async () => {
    return true;
  },
};
