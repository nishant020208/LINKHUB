import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const clickupAdapter: ProviderAdapter = {
  key: 'clickup',
  name: 'ClickUp',
  category: 'productivity',
  authType: 'oauth',
  color: '#7b68ee',
  icon: 'CheckSquare',
  description: 'Spaces, folders, lists, and scheduled tasks.',

  connect: async () => ({ authUrl: '/api/oauth/clickup' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `clickup-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'task',
      title: (raw.name as string) || 'ClickUp Task',
      description: (raw.text_content as string) || '',
      due_at: (raw.due_date as string) ? new Date(Number(raw.due_date)).toISOString() : null,
      url: (raw.url as string) || null,
      source_id: String(raw.id || `clickup-${idx}`),
      priority_score: 65,
      is_done: Boolean((raw.status as Record<string, string>)?.status === 'complete'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
