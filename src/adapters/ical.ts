import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const icalAdapter: ProviderAdapter = {
  key: 'ical',
  name: 'iCal Timetable Subscription',
  category: 'calendars',
  authType: 'url',
  color: '#f97316',
  icon: 'Calendar',
  description: 'Subscribe to webcal:// or https:// calendar feeds from college registrar or Apple Calendar.',

  connect: async (config) => {
    return {
      account: {
        provider: 'ical',
        email: (config?.url as string) || 'subscription@ical',
        label: (config?.label as string) || 'Timetable Feed',
      },
    };
  },

  fetchItems: async () => {
    return [];
  },

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `ical-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'event',
      title: (raw.summary as string) || (raw.title as string) || 'Calendar Entry',
      description: (raw.description as string) || '',
      start_at: (raw.dtstart as string) || (raw.start_at as string) || null,
      end_at: (raw.dtend as string) || (raw.end_at as string) || null,
      source_id: (raw.uid as string) || `ical-${idx}`,
      priority_score: 60,
      is_done: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
