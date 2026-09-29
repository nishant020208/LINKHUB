import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const gitlabAdapter: ProviderAdapter = {
  key: 'gitlab',
  name: 'GitLab',
  category: 'developer',
  authType: 'oauth',
  color: '#fc6d26',
  icon: 'GitBranch',
  description: 'Merge requests, issue boards, and milestone tracking.',

  connect: async () => ({ authUrl: '/api/oauth/gitlab' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `gitlab-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'task',
      title: (raw.title as string) || 'GitLab Issue',
      description: (raw.description as string) || '',
      due_at: (raw.due_date as string) || null,
      url: (raw.web_url as string) || null,
      source_id: String(raw.id || `gitlab-${idx}`),
      priority_score: 70,
      is_done: raw.state === 'closed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
