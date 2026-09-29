import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const zoomAdapter: ProviderAdapter = {
  key: 'zoom',
  name: 'Zoom Meetings',
  category: 'calendars',
  authType: 'oauth',
  color: '#2d8cff',
  icon: 'Video',
  description: 'Upcoming scheduled lectures, seminars, and meeting links.',

  connect: async () => ({ authUrl: '/api/oauth/zoom' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `zoom-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'event',
      title: (raw.topic as string) || 'Zoom Meeting',
      description: (raw.agenda as string) || '',
      start_at: (raw.start_time as string) || null,
      url: (raw.join_url as string) || null,
      source_id: String(raw.id || `zoom-${idx}`),
      priority_score: 75,
      is_done: false,
      metadata: {
        location: 'Zoom Video Call',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
