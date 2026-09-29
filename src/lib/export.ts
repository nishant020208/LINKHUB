import { Item } from '@/types';

/**
 * Generates and downloads a standard RFC 5545 iCalendar (.ics) file
 * from active calendar events and deadlines.
 */
export function exportToICal(items: Item[], filename = 'unifyhub-agenda.ics'): void {
  const events = items.filter((i) => i.start_at || i.due_at);

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UnifyHub//Unified Agenda Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const formatICalDate = (isoStr: string): string => {
    return new Date(isoStr)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  for (const item of events) {
    const dtStart = item.start_at || item.due_at;
    if (!dtStart) continue;

    const dtEnd = item.end_at || new Date(new Date(dtStart).getTime() + 50 * 60000).toISOString();

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:${item.id}@unifyhub`);
    ics.push(`DTSTAMP:${formatICalDate(new Date().toISOString())}`);
    ics.push(`DTSTART:${formatICalDate(dtStart)}`);
    ics.push(`DTEND:${formatICalDate(dtEnd)}`);
    ics.push(`SUMMARY:${item.title.replace(/[\n\r]/g, ' ')}`);
    if (item.description) {
      ics.push(`DESCRIPTION:${item.description.replace(/[\n\r]/g, ' ')}`);
    }
    if (item.url) {
      ics.push(`URL:${item.url}`);
    }
    ics.push('END:VEVENT');
  }

  ics.push('END:VCALENDAR');

  const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a comma-separated values (CSV) spreadsheet of all items.
 */
export function exportToCSV(items: Item[], filename = 'unifyhub-export.csv'): void {
  const headers = ['Type', 'Title', 'Description', 'Due Date', 'Start Date', 'Priority', 'Completed', 'URL'];

  const rows = items.map((i) => [
    `"${i.type}"`,
    `"${(i.title || '').replace(/"/g, '""')}"`,
    `"${(i.description || '').replace(/"/g, '""')}"`,
    `"${i.due_at || ''}"`,
    `"${i.start_at || ''}"`,
    i.priority_score,
    i.is_done ? 'YES' : 'NO',
    `"${i.url || ''}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
