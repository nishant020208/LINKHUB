import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const canvasAdapter: ProviderAdapter = {
  key: 'canvas',
  name: 'Canvas LMS',
  category: 'academic',
  authType: 'oauth',
  color: '#e72429',
  icon: 'GraduationCap',
  description: 'Coursework assignments, grades, syllabus announcements, and due dates.',
  requiredScopes: ['url:GET|/api/v1/users/:user_id/courses', 'url:GET|/api/v1/courses/:course_id/assignments'],

  connect: async () => ({ authUrl: '/api/oauth/canvas' }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `canvas-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'deadline',
      title: (raw.name as string) || 'Canvas Assignment',
      description: (raw.description as string) || '',
      due_at: (raw.due_at as string) || null,
      url: (raw.html_url as string) || null,
      source_id: String(raw.id || `canvas-${idx}`),
      priority_score: 90,
      is_done: Boolean((raw.has_submitted_submissions as boolean) || raw.submission),
      metadata: {
        course_name: (raw.course_name as string) || 'Canvas Course',
        urgent_keywords: ['assignment', 'due', 'canvas'],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
