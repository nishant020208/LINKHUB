import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const slackAdapter: ProviderAdapter = {
  key: 'slack',
  name: 'Slack',
  category: 'productivity',
  authType: 'oauth',
  color: '#4a154b',
  icon: 'MessageSquare',
  description: 'Saved messages, reminders, and starred channel action items.',

  connect: async () => ({ authUrl: '/api/oauth/slack' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `slack-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'task',
      title: (raw.text as string) || 'Saved Slack message',
      description: (raw.channel_name as string) ? `From #${raw.channel_name}` : '',
      due_at: (raw.complete_ts as string) || null,
      url: (raw.permalink as string) || null,
      source_id: String(raw.id || `slack-${idx}`),
      priority_score: 65,
      is_done: Boolean(raw.complete),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
