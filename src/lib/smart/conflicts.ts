import { Item } from '@/types';

export interface CalendarConflict {
  id: string;
  eventA: Item;
  eventB: Item;
  overlapMinutes: number;
}

/**
 * Detects overlapping calendar events scheduled across different connected accounts.
 */
export function detectCalendarConflicts(items: Item[]): CalendarConflict[] {
  const events = items
    .filter((item) => item.type === 'event' && item.start_at)
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime());

  const conflicts: CalendarConflict[] = [];

  for (let i = 0; i < events.length; i++) {
    const a = events[i];
    const aStart = new Date(a.start_at!).getTime();
    // Default duration: 50 minutes if end_at is missing
    const aEnd = a.end_at ? new Date(a.end_at).getTime() : aStart + 50 * 60 * 1000;

    for (let j = i + 1; j < events.length; j++) {
      const b = events[j];
      const bStart = new Date(b.start_at!).getTime();
      const bEnd = b.end_at ? new Date(b.end_at).getTime() : bStart + 50 * 60 * 1000;

      // Stop scanning if next event starts after event A ends
      if (bStart >= aEnd) break;

      // Clash detected if events belong to distinct accounts and overlap in time
      if (a.account_id !== b.account_id && bStart < aEnd && bEnd > aStart) {
        const overlapStart = Math.max(aStart, bStart);
        const overlapEnd = Math.min(aEnd, bEnd);
        const overlapMinutes = Math.round((overlapEnd - overlapStart) / 60000);

        if (overlapMinutes > 5) {
          conflicts.push({
            id: `conflict-${a.id}-${b.id}`,
            eventA: a,
            eventB: b,
            overlapMinutes,
          });
        }
      }
    }
  }

  return conflicts;
}
