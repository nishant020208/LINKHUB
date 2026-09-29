import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const linearAdapter: ProviderAdapter = {
  key: 'linear',
  name: 'Linear',
  category: 'developer',
  authType: 'oauth',
  color: '#5e6ad2',
  icon: 'Layers',
  description: 'Cycle milestones, urgent tickets, and assigned engineering issues.',

  connect: async () => ({ authUrl: '/api/oauth/linear' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `linear-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'task',
      title: (raw.title as string) || 'Linear Issue',
      description: (raw.description as string) || '',
      due_at: (raw.dueDate as string) || null,
      url: (raw.url as string) || null,
      source_id: String(raw.id || `linear-${idx}`),
      priority_score: Number(raw.priority) ? 100 - Number(raw.priority) * 15 : 70,
      is_done: Boolean(raw.completedAt),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
