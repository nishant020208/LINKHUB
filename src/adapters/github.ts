import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const githubAdapter: ProviderAdapter = {
  key: 'github',
  name: 'GitHub',
  category: 'developer',
  authType: 'oauth',
  color: '#64748b',
  icon: 'GitBranch',
  description: 'Assigned issues, pull request review requests, and milestone deadlines.',
  requiredScopes: ['read:user', 'repo'],

  connect: async () => {
    return { authUrl: '/api/oauth/github' };
  },

  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `gh-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'task',
      title: (raw.title as string) || 'GitHub Issue',
      description: (raw.body as string) || '',
      due_at: (raw.due_on as string) || null,
      url: (raw.html_url as string) || null,
      source_id: String(raw.id || `gh-${idx}`),
      priority_score: 75,
      is_done: raw.state === 'closed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
