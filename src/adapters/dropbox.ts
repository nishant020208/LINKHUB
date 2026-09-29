import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const dropboxAdapter: ProviderAdapter = {
  key: 'dropbox',
  name: 'Dropbox',
  category: 'storage',
  authType: 'oauth',
  color: '#0061ff',
  icon: 'Folder',
  description: 'Starred files, recent lecture pdfs, and shared project folders.',

  connect: async () => ({ authUrl: '/api/oauth/dropbox' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `dropbox-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'file',
      title: (raw.name as string) || 'Dropbox File',
      description: (raw.path_display as string) || '',
      url: (raw.preview_url as string) || null,
      source_id: String(raw.id || `dropbox-${idx}`),
      priority_score: 55,
      is_done: false,
      metadata: {
        file_type: ((raw.name as string) || '').split('.').pop()?.toUpperCase() || 'FILE',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
