import { Item } from '@/types';

export interface FreeTimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
  label: string;
}

/**
 * Computes contiguous open focus/study windows (min 45 mins)
 * during standard working/day hours (8:00 AM to 8:00 PM) for today.
 */
export function findFreeTimeSlots(items: Item[]): FreeTimeSlot[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0);

  // Today's events
  const todayEvents = items
    .filter((i) => i.type === 'event' && i.start_at)
    .map((ev) => {
      const start = new Date(ev.start_at!);
      const end = ev.end_at ? new Date(ev.end_at) : new Date(start.getTime() + 50 * 60000);
      return { start, end };
    })
    .filter((ev) => ev.end > todayStart && ev.start < todayEnd)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const slots: FreeTimeSlot[] = [];
  let pointer = Math.max(now.getTime(), todayStart.getTime());

  for (const ev of todayEvents) {
    const evStart = ev.start.getTime();
    const evEnd = ev.end.getTime();

    if (evStart > pointer) {
      const gapMinutes = Math.round((evStart - pointer) / 60000);
      if (gapMinutes >= 45) {
        const slotStart = new Date(pointer);
        const slotEnd = new Date(evStart);
        slots.push({
          start: slotStart,
          end: slotEnd,
          durationMinutes: gapMinutes,
          label: `${slotStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${slotEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (${gapMinutes}m)`,
        });
      }
    }
    pointer = Math.max(pointer, evEnd);
  }

  // Final window until 8 PM
  if (todayEnd.getTime() > pointer) {
    const remainingMins = Math.round((todayEnd.getTime() - pointer) / 60000);
    if (remainingMins >= 45) {
      const slotStart = new Date(pointer);
      slots.push({
        start: slotStart,
        end: todayEnd,
        durationMinutes: remainingMins,
        label: `${slotStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${todayEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (${remainingMins}m)`,
      });
    }
  }

  return slots;
}
