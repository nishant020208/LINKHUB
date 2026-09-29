import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const bitbucketAdapter: ProviderAdapter = {
  key: 'bitbucket',
  name: 'Bitbucket',
  category: 'developer',
  authType: 'oauth',
  color: '#2684ff',
  icon: 'GitBranch',
  description: 'Repositories, pull requests, and workspace issues.',

  connect: async () => ({ authUrl: '/api/oauth/bitbucket' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `bitbucket-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'task',
      title: (raw.title as string) || 'Bitbucket Issue',
      description: (raw.description as string) || '',
      url: (raw.links as Record<string, { href: string }>)?.html?.href || null,
      source_id: String(raw.id || `bitbucket-${idx}`),
      priority_score: 65,
      is_done: raw.state === 'resolved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
