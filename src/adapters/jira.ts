import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const jiraAdapter: ProviderAdapter = {
  key: 'jira',
  name: 'Jira Software',
  category: 'productivity',
  authType: 'oauth',
  color: '#0052cc',
  icon: 'CheckSquare',
  description: 'Sprint backlogs, tickets, and active issues assigned to you.',

  connect: async () => ({ authUrl: '/api/oauth/jira' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `jira-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'task',
      title: (raw.summary as string) || (raw.key as string) || 'Jira Issue',
      description: (raw.description as string) || '',
      due_at: (raw.duedate as string) || null,
      url: (raw.url as string) || null,
      source_id: String(raw.id || `jira-${idx}`),
      priority_score: 75,
      is_done: (raw.status as string)?.toLowerCase() === 'done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
