import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const moodleAdapter: ProviderAdapter = {
  key: 'moodle',
  name: 'Moodle LMS',
  category: 'academic',
  authType: 'token',
  color: '#f98012',
  icon: 'GraduationCap',
  description: 'University courses, assignment modules, and grading deadlines.',

  connect: async (config) => ({
    account: {
      provider: 'moodle',
      email: (config?.endpoint as string) || 'student@moodle.edu',
      label: 'Moodle LMS',
    },
  }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `moodle-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'deadline',
      title: (raw.name as string) || 'Moodle Assignment',
      description: (raw.intro as string) || '',
      due_at: (raw.duedate as number) ? new Date((raw.duedate as number) * 1000).toISOString() : null,
      source_id: String(raw.id || `moodle-${idx}`),
      priority_score: 85,
      is_done: Boolean(raw.submitted),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
