import { Item } from '@/types';

/**
 * Merges duplicate items across accounts (e.g. same calendar meeting in Google & Outlook,
 * or identical assignment synced from both Canvas and an iCal link).
 */
export function deduplicateItems(items: Item[]): Item[] {
  const seenMap = new Map<string, Item>();

  for (const item of items) {
    // Generate normalized comparison signature
    const normTitle = item.title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const normDate = item.start_at
      ? new Date(item.start_at).toISOString().slice(0, 16)
      : item.due_at
      ? new Date(item.due_at).toISOString().slice(0, 16)
      : 'no-date';

    const key = `${item.type}-${normTitle}-${normDate}`;

    if (!seenMap.has(key)) {
      seenMap.set(key, item);
    } else {
      // Merge descriptions and maintain highest priority
      const existing = seenMap.get(key)!;
      seenMap.set(key, {
        ...existing,
        priority_score: Math.max(existing.priority_score, item.priority_score),
        description: existing.description || item.description,
        url: existing.url || item.url,
      });
    }
  }

  return Array.from(seenMap.values());
}
