import { ProviderAdapter } from './types';
import { googleAdapter } from './google';
import { githubAdapter } from './github';
import { notionAdapter } from './notion';
import { todoistAdapter } from './todoist';
import { slackAdapter } from './slack';
import { jiraAdapter } from './jira';
import { linearAdapter } from './linear';
import { trelloAdapter } from './trello';
import { asanaAdapter } from './asana';
import { clickupAdapter } from './clickup';
import { dropboxAdapter } from './dropbox';
import { boxAdapter } from './box';
import { zoomAdapter } from './zoom';
import { gitlabAdapter } from './gitlab';
import { bitbucketAdapter } from './bitbucket';
import { moodleAdapter } from './moodle';
import { imapAdapter } from './imap';

export * from './types';

/**
 * Master Registry of all supported UnifyHub integration adapters.
 * Adding a new service requires exactly one adapter file and one entry in this array.
 */
export const ADAPTER_REGISTRY: ProviderAdapter[] = [
  googleAdapter,
  githubAdapter,
  notionAdapter,
  todoistAdapter,
  slackAdapter,
  jiraAdapter,
  linearAdapter,
  trelloAdapter,
  asanaAdapter,
  clickupAdapter,
  dropboxAdapter,
  boxAdapter,
  zoomAdapter,
  gitlabAdapter,
  bitbucketAdapter,
  moodleAdapter,
  imapAdapter,
];

export const getAdapter = (key: string): ProviderAdapter | undefined => {
  return ADAPTER_REGISTRY.find((adapter) => adapter.key === key);
};
