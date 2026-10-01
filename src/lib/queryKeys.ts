/**
 * Canonical TanStack Query keys. The client and every invalidation site must
 * use these constants — a kebab/snake-case mismatch silently breaks cache
 * invalidation (this exact bug previously left widgets empty after connect).
 */
export const queryKeys = {
  accounts: ['connected_accounts'] as const,
  items: ['items'] as const,
  syncLogs: ['sync_logs'] as const,
  userSettings: ['user_settings'] as const,
  providerStatus: ['provider_status'] as const,
} as const;
