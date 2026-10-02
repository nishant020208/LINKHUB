import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return 'never';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'never';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDueCountdown(dueDateStr: string | null | undefined): {
  label: string;
  isOverdue: boolean;
  urgency: 'critical' | 'high' | 'medium' | 'low';
} {
  if (!dueDateStr) {
    return { label: 'No due date', isOverdue: false, urgency: 'low' };
  }

  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) {
    return { label: 'No due date', isOverdue: false, urgency: 'low' };
  }
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absHours = Math.abs(diffMs) / (1000 * 60 * 60);

  let urgency: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (isOverdue) urgency = 'critical';
  else if (absHours <= 6) urgency = 'critical';
  else if (absHours <= 24) urgency = 'high';
  else if (absHours <= 72) urgency = 'medium';

  if (isOverdue) {
    if (absHours < 1) return { label: `${Math.round(Math.abs(diffMs) / 60000)}m overdue`, isOverdue, urgency };
    if (absHours < 24) return { label: `${Math.floor(absHours)}h overdue`, isOverdue, urgency };
    return { label: `${Math.floor(absHours / 24)}d overdue`, isOverdue, urgency };
  }

  if (absHours < 1) return { label: `in ${Math.max(1, Math.round(diffMs / 60000))}m`, isOverdue, urgency };
  if (absHours < 24) return { label: `in ${Math.floor(absHours)}h ${Math.round((absHours % 1) * 60)}m`, isOverdue, urgency };
  const days = Math.floor(absHours / 24);
  return { label: `in ${days}d`, isOverdue, urgency };
}

export function getProviderBadgeStyle(provider: string): { bg: string; text: string; border: string } {
  switch (provider) {
    case 'google':
      return { bg: 'bg-status-connected/10', text: 'text-status-connected', border: 'border-status-connected/30' };
    case 'github':
      return { bg: 'bg-muted', text: 'text-foreground', border: 'border-border/30' };
    case 'moodle':
      return { bg: 'bg-status-warning/10', text: 'text-status-warning', border: 'border-status-warning/30' };
    case 'notion':
      return { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' };
    default:
      return { bg: 'bg-accent', text: 'text-accent-foreground', border: 'border-border/30' };
  }
}
