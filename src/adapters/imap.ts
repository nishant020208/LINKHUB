import { ProviderAdapter } from './types';
import { Item } from '@/types';

export const imapAdapter: ProviderAdapter = {
  key: 'imap',
  name: 'Custom IMAP / School Mail',
  category: 'custom',
  authType: 'credentials',
  color: '#0284c7',
  icon: 'Mail',
  description: 'Connect legacy university webmail via secure TLS. Requires user-supplied IMAP server and credentials.',

  connect: async (config) => ({
    account: {
      provider: 'imap',
      email: (config?.email as string) || 'student@school.edu',
      label: 'University IMAP',
    },
  }),
  fetchItems: async () => [],

  normalize: (rawItems, account): Item[] => {
    return (rawItems as Record<string, unknown>[]).map((raw, idx) => ({
      id: (raw.id as string) || `imap-${account.id}-${idx}`,
      user_id: account.user_id,
      account_id: account.id,
      type: 'email',
      title: (raw.subject as string) || 'IMAP Message',
      description: (raw.body_preview as string) || '',
      url: null,
      source_id: String(raw.message_id || `imap-${idx}`),
      priority_score: 60,
      is_done: false,
      metadata: {
        sender: (raw.from as string) || 'mail-server',
      },
      created_at: (raw.date as string) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },
};
