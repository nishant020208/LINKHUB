import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const trelloAdapter: ProviderAdapter = {
  key: 'trello',
  name: 'Trello',
  category: 'productivity',
  authType: 'oauth',
  color: '#0079bf',
  icon: 'Trello',
  description: 'Kanban cards, checklists, and board due dates.',

  connect: async () => ({ authUrl: '/api/oauth/trello' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `trello-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'task',
      title: (raw.name as string) || 'Trello Card',
      description: (raw.desc as string) || '',
      due_at: (raw.due as string) || null,
      url: (raw.shortUrl as string) || null,
      source_id: String(raw.id || `trello-${idx}`),
      priority_score: 60,
      is_done: Boolean(raw.dueComplete),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
