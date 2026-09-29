import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const boxAdapter: ProviderAdapter = {
  key: 'box',
  name: 'Box',
  category: 'storage',
  authType: 'oauth',
  color: '#0075c9',
  icon: 'Folder',
  description: 'Enterprise and campus file sync with cloud collaboration.',

  connect: async () => ({ authUrl: '/api/oauth/box' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `box-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'file',
      title: (raw.name as string) || 'Box Document',
      description: (raw.description as string) || '',
      url: (raw.url as string) || null,
      source_id: String(raw.id || `box-${idx}`),
      priority_score: 55,
      is_done: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
