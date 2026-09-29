import { Item } from '@/types';

const URGENT_KEYWORDS = [
  'exam',
  'midterm',
  'final',
  'quiz',
  'assignment',
  'due',
  'submit',
  'invoice',
  'payment',
  'urgent',
  'flight',
  'presentation',
];

/**
 * Calculates priority score (0 to 100) based on closeness to due date,
 * important keywords, instructor senders, and manual flags.
 */
export function calculatePriorityScore(item: Partial<Item>): number {
  let score = 50;

  // 1. Due date proximity
  if (item.due_at) {
    const dueTime = new Date(item.due_at).getTime();
    const now = Date.now();
    const diffHours = (dueTime - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
      score += 40; // Overdue items take urgent priority
    } else if (diffHours <= 6) {
      score += 35; // Due within 6 hours
    } else if (diffHours <= 24) {
      score += 25; // Due within 24 hours
    } else if (diffHours <= 72) {
      score += 15; // Due within 3 days
    }
  }

  // 2. Keyword detection in title and description
  const content = `${item.title || ''} ${item.description || ''}`.toLowerCase();
  const matchedKeywords = URGENT_KEYWORDS.filter((kw) => content.includes(kw));
  if (matchedKeywords.length > 0) {
    score += Math.min(matchedKeywords.length * 8, 20);
  }

  // 3. Sender importance (professors, automated billing)
  const sender = item.metadata?.sender?.toLowerCase() || '';
  if (sender.includes('.edu') || sender.includes('prof') || sender.includes('billing')) {
    score += 12;
  }

  // 4. Completed items drop priority
  if (item.is_done) {
    score = Math.max(10, score - 50);
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}
