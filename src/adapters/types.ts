import { AccountProvider, ConnectedAccount, Item } from '@/types';

export type AdapterCategory =
  | 'google'
  | 'calendars'
  | 'developer'
  | 'productivity'
  | 'academic'
  | 'storage'
  | 'custom';

export interface ProviderAdapter {
  key: AccountProvider;
  name: string;
  category: AdapterCategory;
  authType: 'oauth' | 'token' | 'credentials';
  requiredScopes?: string[];
  description: string;
  color: string;
  icon: string;
  connect: (config?: Record<string, unknown>) => Promise<{ authUrl?: string; account?: Partial<ConnectedAccount> }>;
  fetchItems: (account: ConnectedAccount, since?: string) => Promise<unknown[]>;
  normalize: (raw: unknown[], account: ConnectedAccount) => Item[];
  refreshAuth?: (account: ConnectedAccount) => Promise<boolean>;
}
