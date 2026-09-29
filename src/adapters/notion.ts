import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const notionAdapter: ProviderAdapter = {
  key: 'notion',
  name: 'Notion',
  category: 'productivity',
  authType: 'oauth',
  color: '#000000',
  icon: 'BookOpen',
  description: 'Sync tasks, project boards, and deadlines from Notion databases.',

  connect: async () => ({ authUrl: '/api/oauth/notion' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `notion-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'task',
      title: (raw.title as string) || 'Notion Page Task',
      description: (raw.summary as string) || '',
      due_at: (raw.due_date as string) || null,
      url: (raw.url as string) || null,
      source_id: String(raw.id || `notion-${idx}`),
      priority_score: 70,
      is_done: Boolean(raw.done),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
