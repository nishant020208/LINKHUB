import { Item, Workspace, ConnectedAccount } from '@/types';

/**
 * Filters items according to the active workspace.
 *
 * Rules:
 * 1. If active workspace is 'all' or not found, all items are included.
 * 2. If the workspace specifies included_types, the item's type must match.
 * 3. If the workspace specifies explicit account_ids, the item's account_id must match.
 * 4. If account_ids is empty, applies smart context heuristics based on the workspace slug:
 *    - 'college': accounts with .edu emails, Canvas/Moodle providers, or items with course codes/metadata.
 *    - 'work': professional providers (Slack, Jira, Linear, Asana, ClickUp, GitHub, etc.) or work-labeled accounts.
 *    - 'personal': Todoist, personal-labeled accounts, or personal tasks.
 */
export function filterItemsByWorkspace(
  items: Item[],
  activeWorkspaceId: string,
  workspaces: Workspace[],
  accounts: ConnectedAccount[]
): Item[] {
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  if (!activeWs || activeWs.slug === 'all') {
    return items;
  }

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  return items.filter((item) => {
    // 1. Type filtering
    if (activeWs.included_types && activeWs.included_types.length > 0) {
      if (!activeWs.included_types.includes(item.type)) {
        return false;
      }
    }

    // 2. Explicit account matching
    if (activeWs.account_ids && activeWs.account_ids.length > 0) {
      return activeWs.account_ids.includes(item.account_id);
    }

    // 3. Fallback smart heuristic based on workspace slug
    const account = accountMap.get(item.account_id);
    const provider = account?.provider?.toLowerCase() || '';
    const email = account?.email?.toLowerCase() || '';
    const label = account?.label?.toLowerCase() || '';
    const courseName = (item.metadata?.course_name ? String(item.metadata.course_name) : '').toLowerCase();
    const itemTitle = (item.title || '').toLowerCase();

    if (activeWs.slug === 'college') {
      const isEduEmail = email.includes('.edu') || email.includes('student') || email.includes('college') || email.includes('univ');
      const isCourseItem = Boolean(courseName) || /\b(cs|math|phys|chem|eng|bio|econ|hist|pset|exam|homework|quiz)\b/i.test(itemTitle);
      const isEduProvider = provider === 'moodle' || label.includes('college') || label.includes('university') || label.includes('school');
      return isEduEmail || isCourseItem || isEduProvider;
    }

    if (activeWs.slug === 'work') {
      const isWorkProvider = ['slack', 'jira', 'linear', 'asana', 'clickup', 'github'].includes(provider);
      const isWorkLabel = label.includes('work') || label.includes('corp') || label.includes('office') || label.includes('team');
      return isWorkProvider || isWorkLabel;
    }

    if (activeWs.slug === 'personal') {
      const isPersonalProvider = provider === 'todoist' || provider === 'personal' || provider === 'dropbox';
      const isPersonalAccount = label.includes('personal') || (!email.includes('.edu') && !label.includes('work'));
      return isPersonalProvider || isPersonalAccount;
    }

    return true;
  });
}
