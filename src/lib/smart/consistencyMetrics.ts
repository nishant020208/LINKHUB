import { Item } from '@/types';

export interface ConsistencyStats {
  totalEvaluated: number;
  onTimeCount: number;
  lateCount: number;
  missedCount: number;
  onTimeRate: number; // percentage (0 - 100)
  streakDays: number; // consecutive days with on-time completions
  periodLabel: string;
  trend: 'improving' | 'steady' | 'needs_attention';
  hasData: boolean;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const GRACE_PERIOD_MS = 60 * 1000; // 1-minute margin

/**
 * Calculates calm, truthful on-time consistency statistics across tasks and deadlines.
 */
export function calculateConsistencyMetrics(items: Item[]): ConsistencyStats {
  const now = Date.now();
  const thirtyDaysAgo = now - THIRTY_DAYS_MS;

  // Filter tasks and deadlines in the 30-day window or currently overdue
  const relevantItems = (items || []).filter((item) => {
    if (!item) return false;
    if (item.type !== 'deadline' && item.type !== 'task') return false;

    const dueMs = item.due_at ? new Date(item.due_at).getTime() : null;
    const updatedMs = new Date(item.updated_at || item.created_at).getTime();

    // Include if due in last 30 days, or updated in last 30 days, or currently overdue
    const isPastDue = dueMs !== null && dueMs < now && !item.is_done;
    const isRecentDue = dueMs !== null && dueMs >= thirtyDaysAgo;
    const isRecentUpdate = updatedMs >= thirtyDaysAgo;

    return isPastDue || isRecentDue || isRecentUpdate;
  });

  let onTimeCount = 0;
  let lateCount = 0;
  let missedCount = 0;

  const onTimeDates = new Set<string>();

  for (const item of relevantItems) {
    const dueMs = item.due_at ? new Date(item.due_at).getTime() : null;
    const completedMs = new Date(item.updated_at || item.created_at).getTime();

    if (item.is_done) {
      if (dueMs !== null) {
        if (completedMs <= dueMs + GRACE_PERIOD_MS) {
          onTimeCount++;
          const dateStr = new Date(completedMs).toISOString().split('T')[0];
          onTimeDates.add(dateStr);
        } else {
          lateCount++;
        }
      } else {
        // Tasks without a strict due date that are completed count as on-time
        onTimeCount++;
        const dateStr = new Date(completedMs).toISOString().split('T')[0];
        onTimeDates.add(dateStr);
      }
    } else {
      // Uncompleted item: check if deadline has passed
      if (dueMs !== null && dueMs < now) {
        missedCount++;
      }
      // If due in the future, it is on-track and not counted against consistency yet
    }
  }

  const totalEvaluated = onTimeCount + lateCount + missedCount;
  const hasData = totalEvaluated > 0;

  const onTimeRate = hasData
    ? Math.round((onTimeCount / totalEvaluated) * 100)
    : 100;

  // Calculate streak: consecutive calendar days ending today or yesterday
  let streakDays = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 24 * 3600 * 1000);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  // Start check from today or yesterday
  let checkDate = onTimeDates.has(todayStr) ? new Date() : yesterdayDate;
  if (onTimeDates.has(todayStr) || onTimeDates.has(yesterdayStr)) {
    while (true) {
      const checkStr = checkDate.toISOString().split('T')[0];
      if (onTimeDates.has(checkStr)) {
        streakDays++;
        checkDate = new Date(checkDate.getTime() - 24 * 3600 * 1000);
      } else {
        break;
      }
    }
  }

  let trend: 'improving' | 'steady' | 'needs_attention' = 'steady';
  if (onTimeRate >= 85) trend = 'improving';
  else if (onTimeRate < 70) trend = 'needs_attention';

  return {
    totalEvaluated,
    onTimeCount,
    lateCount,
    missedCount,
    onTimeRate,
    streakDays,
    periodLabel: 'This month',
    trend,
    hasData,
  };
}
