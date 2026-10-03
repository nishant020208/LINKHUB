import * as chrono from 'chrono-node';
import { ItemType } from '@/types';

export interface ParsedQuickAddItem {
  raw: string;
  cleanTitle: string;
  type: ItemType;
  dueDate: Date | null;
  priorityScore: number;
  courseName?: string;
  hasTime: boolean;
  dateText?: string;
}

const DEADLINE_KEYWORDS = /\b(submit|submission|assignment|problem\s*set|pset|homework|hw|quiz|exam|midterm|final|project\s*due|due|deliverable|paper|essay)\b/i;
const EVENT_KEYWORDS = /\b(meeting|meet|call|sync|interview|catchup|coffee|lecture|webinar|class|session|discussion|office\s*hours)\b/i;
const URGENT_KEYWORDS = /\b(!|urgent|asap|high\s*priority|critical|emergency)\b/i;
const COURSE_REGEX = /\b([A-Z]{2,5}\s?\d{3,4}[A-Za-z]?)\b/i;

/**
 * Parses freeform natural language text into a structured item proposal.
 * Example inputs:
 *  - "Submit CS4820 problem set Friday at 5pm"
 *  - "Meeting with Sarah tomorrow at 10am"
 *  - "Fix database migration bug by tonight !urgent"
 */
export function parseNaturalLanguageInput(input: string): ParsedQuickAddItem {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      raw: '',
      cleanTitle: '',
      type: 'task',
      dueDate: null,
      priorityScore: 70,
      hasTime: false,
    };
  }

  // 1. Parse date/time expressions via chrono-node
  const chronoResults = chrono.parse(trimmed);
  let dueDate: Date | null = null;
  let dateText = '';
  let hasTime = false;

  if (chronoResults.length > 0) {
    const firstResult = chronoResults[0];
    dueDate = firstResult.start.date();
    dateText = firstResult.text;
    hasTime = firstResult.start.isCertain('hour');
  }

  // 2. Determine type
  let type: ItemType = 'task';
  if (EVENT_KEYWORDS.test(trimmed)) {
    type = 'event';
  } else if (DEADLINE_KEYWORDS.test(trimmed)) {
    type = 'deadline';
  }

  // 3. Determine priority
  let priorityScore = 70;
  if (URGENT_KEYWORDS.test(trimmed)) {
    priorityScore = 95;
  } else if (type === 'deadline') {
    priorityScore = 80;
  }

  // 4. Extract course code
  let courseName: string | undefined;
  const courseMatch = trimmed.match(COURSE_REGEX);
  if (courseMatch) {
    courseName = courseMatch[1].toUpperCase().replace(/\s+/g, '');
  }

  // 5. Clean up the title by stripping date tokens and prepositions
  let cleanTitle = trimmed;
  if (dateText) {
    cleanTitle = cleanTitle.replace(dateText, '');
  }

  // Strip urgency markers from title
  cleanTitle = cleanTitle.replace(URGENT_KEYWORDS, '');

  // Strip trailing connectors: "by", "at", "due", "on", "for"
  cleanTitle = cleanTitle
    .replace(/\s+(by|at|due\s+at|due\s+on|due|on|@)\s*$/i, '')
    .replace(/^\s*(by|at|due\s+at|due\s+on|due|on|@)\s+/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If stripping left title empty, fallback to raw
  if (!cleanTitle) {
    cleanTitle = trimmed;
  }

  return {
    raw: trimmed,
    cleanTitle,
    type,
    dueDate,
    priorityScore,
    courseName,
    hasTime,
    dateText: dateText || undefined,
  };
}
