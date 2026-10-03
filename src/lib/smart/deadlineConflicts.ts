import { Item, ConnectedAccount } from '@/types';

export interface DeadlineCluster {
  id: string;
  items: Item[];
  startTime: string;
  endTime: string;
  providerNames: string[];
  accountsCount: number;
  severity: 'critical' | 'heavy' | 'moderate';
  summary: string;
}

const WINDOW_MS = 48 * 60 * 60 * 1000; // 48-hour rolling window

/**
 * Returns a display provider or course name for an item.
 */
export function getItemSourceLabel(item: Item, accounts?: ConnectedAccount[]): string {
  if (item.metadata?.course_name && typeof item.metadata.course_name === 'string') {
    return item.metadata.course_name;
  }
  if (accounts && accounts.length > 0) {
    const acc = accounts.find((a) => a.id === item.account_id);
    if (acc) {
      if (acc.label) return acc.label;
      if (acc.provider) {
        return acc.provider.charAt(0).toUpperCase() + acc.provider.slice(1);
      }
    }
  }
  if (item.metadata?.repository && typeof item.metadata.repository === 'string') {
    return item.metadata.repository;
  }
  return 'Task';
}

/**
 * Detects clusters of 3 or more deadlines/tasks due within a 48-hour rolling window
 * across different connected accounts or course providers.
 */
export function detectDeadlineConflicts(
  items: Item[],
  accounts: ConnectedAccount[] = []
): DeadlineCluster[] {
  const nowTime = Date.now();

  // 1. Filter eligible pending deadlines/tasks with valid due_at
  const eligible = (items || [])
    .filter((item) => {
      if (!item || item.is_done) return false;
      if (item.type !== 'deadline' && item.type !== 'task') return false;
      if (!item.due_at) return false;
      const dueMs = new Date(item.due_at).getTime();
      if (isNaN(dueMs)) return false;

      // Skip if snoozed into the future
      if (item.snoozed_until) {
        const snoozeMs = new Date(item.snoozed_until).getTime();
        if (!isNaN(snoozeMs) && snoozeMs > nowTime) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

  if (eligible.length < 3) {
    return [];
  }

  // 2. Identify candidate clusters in a 48h rolling window
  const rawClusters: { items: Item[]; startTime: number; endTime: number }[] = [];

  for (let i = 0; i < eligible.length; i++) {
    const first = eligible[i];
    const firstDue = new Date(first.due_at!).getTime();
    const windowEnd = firstDue + WINDOW_MS;

    const inWindow: Item[] = [first];
    for (let j = i + 1; j < eligible.length; j++) {
      const current = eligible[j];
      const currentDue = new Date(current.due_at!).getTime();
      if (currentDue <= windowEnd) {
        inWindow.push(current);
      } else {
        break;
      }
    }

    if (inWindow.length >= 3) {
      const distinctAccounts = new Set(inWindow.map((it) => it.account_id)).size;
      const distinctSources = new Set(
        inWindow.map((it) => getItemSourceLabel(it, accounts))
      ).size;

      // Qualify if spanning >= 2 distinct accounts or sources, or >= 3 total
      if (distinctAccounts >= 2 || distinctSources >= 2 || inWindow.length >= 3) {
        rawClusters.push({
          items: inWindow,
          startTime: firstDue,
          endTime: new Date(inWindow[inWindow.length - 1].due_at!).getTime(),
        });
      }
    }
  }

  if (rawClusters.length === 0) {
    return [];
  }

  // 3. Merge overlapping / contiguous clusters into unified high-friction blocks
  const mergedClusters: { items: Map<string, Item>; startTime: number; endTime: number }[] = [];

  for (const rc of rawClusters) {
    const last = mergedClusters[mergedClusters.length - 1];
    if (last && rc.startTime <= last.endTime) {
      // Overlap detected: extend window and union items
      rc.items.forEach((item) => last.items.set(item.id, item));
      last.endTime = Math.max(last.endTime, rc.endTime);
    } else {
      const map = new Map<string, Item>();
      rc.items.forEach((item) => map.set(item.id, item));
      mergedClusters.push({
        items: map,
        startTime: rc.startTime,
        endTime: rc.endTime,
      });
    }
  }

  // 4. Transform into finalized DeadlineCluster structures
  return mergedClusters.map((cluster, idx) => {
    const clusterItems = Array.from(cluster.items.values()).sort(
      (a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()
    );

    const providerSet = new Set<string>();
    const accountIdSet = new Set<string>();

    clusterItems.forEach((it) => {
      accountIdSet.add(it.account_id);
      providerSet.add(getItemSourceLabel(it, accounts));
    });

    const providerNames = Array.from(providerSet);
    const count = clusterItems.length;

    let severity: 'critical' | 'heavy' | 'moderate' = 'moderate';
    if (count >= 5) severity = 'critical';
    else if (count >= 4) severity = 'heavy';

    // Format human date range: e.g. "Oct 12 – Oct 14"
    const startDate = new Date(cluster.startTime);
    const endDate = new Date(cluster.endTime);
    const startFmt = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endFmt = endDate.toLocaleDateString(undefined, {
      month: startDate.getMonth() === endDate.getMonth() ? undefined : 'short',
      day: 'numeric',
    });
    const dateRange = startFmt === endFmt ? startFmt : `${startFmt} – ${endFmt}`;

    const providerListStr =
      providerNames.length <= 2
        ? providerNames.join(' and ')
        : `${providerNames.slice(0, 2).join(', ')}, and ${providerNames[2]}`;

    const summary = `${count} deadlines due between ${dateRange} across ${providerListStr}`;

    return {
      id: `cluster-${cluster.startTime}-${idx}`,
      items: clusterItems,
      startTime: new Date(cluster.startTime).toISOString(),
      endTime: new Date(cluster.endTime).toISOString(),
      providerNames,
      accountsCount: accountIdSet.size,
      severity,
      summary,
    };
  });
}
