import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const todoistAdapter: ProviderAdapter = {
  key: 'todoist',
  name: 'Todoist',
  category: 'productivity',
  authType: 'oauth',
  color: '#e44332',
  icon: 'CheckSquare',
  description: 'Synchronized tasks, priority levels, labels, and recurring reminders.',

  connect: async () => ({ authUrl: '/api/oauth/todoist' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `todoist-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'task',
      title: (raw.content as string) || 'Todoist Task',
      description: (raw.description as string) || '',
      due_at: (raw.due as Record<string, string>)?.datetime || (raw.due as Record<string, string>)?.date || null,
      url: (raw.url as string) || null,
      source_id: String(raw.id || `todoist-${idx}`),
      priority_score: Number(raw.priority) ? Number(raw.priority) * 20 : 60,
      is_done: Boolean(raw.is_completed),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
