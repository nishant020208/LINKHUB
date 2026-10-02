/**
 * Single source of truth for the remaining UnifyHub providers.
 *
 * Both oauth-start/oauth-callback (server flows) and provider-status (client
 * "is this configured?" checks) read from here, so a provider can never be
 * half-registered in one place and missing from another.
 *
 * `env` lists the Supabase Edge Function secrets that must ALL be present for
 * the provider to be connectable. Token/credentials providers (Moodle, IMAP)
 * need no server secrets — the user supplies their own endpoint + credentials.
 */

export type AuthKind = 'oauth' | 'token' | 'credentials';

export interface ProviderSpec {
  /** Human label used in error messages. */
  name: string;
  auth: AuthKind;
  /** Required Supabase Edge Function secrets. Empty for user-supplied flows. */
  env: string[];
  /**
   * True when the provider issues a short-lived access token plus a refresh
   * token (a refresh_token grant is required). False for long-lived bearer
   * tokens that are stored and reused as-is.
   */
  refreshable: boolean;
}

export const PROVIDER_SPECS: Record<string, ProviderSpec> = {
  google: { name: 'Google', auth: 'oauth', env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], refreshable: true },
  github: { name: 'GitHub', auth: 'oauth', env: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'], refreshable: false },
  notion: { name: 'Notion', auth: 'oauth', env: ['NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET'], refreshable: false },
  todoist: { name: 'Todoist', auth: 'oauth', env: ['TODOIST_CLIENT_ID', 'TODOIST_CLIENT_SECRET'], refreshable: false },
  slack: { name: 'Slack', auth: 'oauth', env: ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET'], refreshable: false },
  linear: { name: 'Linear', auth: 'oauth', env: ['LINEAR_CLIENT_ID', 'LINEAR_CLIENT_SECRET'], refreshable: false },
  jira: { name: 'Jira', auth: 'oauth', env: ['JIRA_CLIENT_ID', 'JIRA_CLIENT_SECRET'], refreshable: true },
  asana: { name: 'Asana', auth: 'oauth', env: ['ASANA_CLIENT_ID', 'ASANA_CLIENT_SECRET'], refreshable: true },
  clickup: { name: 'ClickUp', auth: 'oauth', env: ['CLICKUP_CLIENT_ID', 'CLICKUP_CLIENT_SECRET'], refreshable: false },
  dropbox: { name: 'Dropbox', auth: 'oauth', env: ['DROPBOX_CLIENT_ID', 'DROPBOX_CLIENT_SECRET'], refreshable: true },
  // Not OAuth: user supplies a portal URL + personal token / IMAP credentials.
  moodle: { name: 'Moodle LMS', auth: 'token', env: [], refreshable: false },
  imap: { name: 'Custom IMAP', auth: 'credentials', env: [], refreshable: false },
};

export function providerName(key: string): string {
  return PROVIDER_SPECS[key]?.name ?? key;
}

/** Returns the missing env var names for a provider, or [] when configured. */
export function missingEnv(key: string): string[] {
  const spec = PROVIDER_SPECS[key];
  if (!spec) return ['(unknown provider)'];
  return spec.env.filter((name) => !Deno.env.get(name));
}

export function isConfigured(key: string): boolean {
  return missingEnv(key).length === 0;
}

/**
 * The one callback URL every OAuth provider registers. It carries NO query
 * string: the provider is recovered from the signed state token inside the
 * callback, which is what guarantees a single shared redirect URI.
 */
export function sharedCallbackUrl(): string {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  return `${supabaseUrl}/functions/v1/oauth-callback`;
}
