import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const asanaAdapter: ProviderAdapter = {
  key: 'asana',
  name: 'Asana',
  category: 'productivity',
  authType: 'oauth',
  color: '#f06a6a',
  icon: 'CheckSquare',
  description: 'Project tasks, section assignments, and upcoming deadlines.',

  connect: async () => ({ authUrl: '/api/oauth/asana' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `asana-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'task',
      title: (raw.name as string) || 'Asana Task',
      description: (raw.notes as string) || '',
      due_at: (raw.due_at as string) || (raw.due_on as string) || null,
      url: (raw.permalink_url as string) || null,
      source_id: String(raw.gid || raw.id || `asana-${idx}`),
      priority_score: 65,
      is_done: Boolean(raw.completed),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
