import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const googleAdapter: ProviderAdapter = {
  key: 'google',
  name: 'Google Workspace & Classroom',
  category: 'google',
  authType: 'oauth',
  color: '#10b981',
  icon: 'Mail',
  description: 'Sync Gmail, Calendar, Google Classroom, Drive files, and Tasks.',
  requiredScopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/tasks.readonly',
  ],

  connect: async () => {
    // In production, redirects to Edge Function OAuth initiator
    return {
      authUrl: '/api/oauth/google',
    };
  },

  fetchItems: async (_account, _since) => {
    // Edge Function handles backend proxying in live mode
    return [];
  },

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `google-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: (raw.type as Item['type']) || 'deadline',
      title: (raw.title as string) || (raw.summary as string) || 'Google Item',
      description: (raw.description as string) || '',
      due_at: (raw.due_at as string) || null,
      start_at: (raw.start_at as string) || null,
      end_at: (raw.end_at as string) || null,
      url: (raw.url as string) || null,
      source_id: (raw.source_id as string) || `google-${idx}`,
      priority_score: Number(raw.priority_score) || 75,
      is_done: Boolean(raw.is_done),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },

  refreshAuth: async () => {
    return true;
  },
};
