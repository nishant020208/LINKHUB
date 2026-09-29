import { Item } from '@/types';

export interface SmartReminder {
  id: string;
  itemId: string;
  title: string;
  triggerAt: Date;
  offsetLabel: '1 day before' | '3 hours before' | '30 minutes before';
  dueAt: Date;
}

/**
 * Calculates smart milestone reminders for deadlines at 24h, 3h, and 30m prior to due dates.
 */
export function calculateSmartReminders(items: Item[]): SmartReminder[] {
  const now = Date.now();
  const reminders: SmartReminder[] = [];

  const deadlines = items.filter(
    (i) => (i.type === 'deadline' || i.type === 'task') && !i.is_done && i.due_at
  );

  for (const item of deadlines) {
    const dueTime = new Date(item.due_at!).getTime();

    // 1 Day (24h) reminder
    const time24h = dueTime - 24 * 3600 * 1000;
    if (time24h > now) {
      reminders.push({
        id: `rem-24h-${item.id}`,
        itemId: item.id,
        title: item.title,
        triggerAt: new Date(time24h),
        offsetLabel: '1 day before',
        dueAt: new Date(dueTime),
      });
    }

    // 3 Hours reminder
    const time3h = dueTime - 3 * 3600 * 1000;
    if (time3h > now) {
      reminders.push({
        id: `rem-3h-${item.id}`,
        itemId: item.id,
        title: item.title,
        triggerAt: new Date(time3h),
        offsetLabel: '3 hours before',
        dueAt: new Date(dueTime),
      });
    }

    // 30 Minutes reminder
    const time30m = dueTime - 30 * 60 * 1000;
    if (time30m > now) {
      reminders.push({
        id: `rem-30m-${item.id}`,
        itemId: item.id,
        title: item.title,
        triggerAt: new Date(time30m),
        offsetLabel: '30 minutes before',
        dueAt: new Date(dueTime),
      });
    }
  }

  return reminders.sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime());
}
