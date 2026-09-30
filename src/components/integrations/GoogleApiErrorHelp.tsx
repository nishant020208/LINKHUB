import React from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';

/**
 * Splits the joined per-stream error summary stored on the account row
 * ("calendar: ... | gmail: ... | ...") and renders a compact recovery card.
 *
 * When a segment contains a Google "enable this API" console URL (the signature
 * of the 403 accessNotConfigured / SERVICE_DISABLED failure), it is rendered as
 * a one-click Enable button for that exact API instead of raw error text.
 */

const ENABLE_URL_RE =
  /https:\/\/console\.developers\.google\.com\/apis\/api\/([a-z0-9.\-]+)(?:\/[^\s"'<>\\]*)?\?[^\s"'<>\\]+/i;

const API_LABELS: Record<string, string> = {
  'calendar-json': 'Google Calendar',
  'gmail': 'Gmail',
  'drive': 'Google Drive',
  'tasks': 'Google Tasks',
  'classroom': 'Google Classroom',
};

interface StreamErrorPart {
  dataType: string;
  message: string;
  enableUrl: string | null;
  apiName: string | null;
}

export function splitAccountError(joined: string | null | undefined): StreamErrorPart[] {
  if (!joined) return [];
  return joined
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const sep = part.indexOf(':');
      const dataType = sep > 0 ? part.slice(0, sep).trim() : 'stream';
      const message = sep > 0 ? part.slice(sep + 1).trim() : part;
      const enableMatch = message.match(ENABLE_URL_RE);
      return {
        dataType,
        message,
        enableUrl: enableMatch ? enableMatch[0] : null,
        apiName: enableMatch ? API_LABELS[enableMatch[1]] ?? enableMatch[1] : null,
      };
    });
}

export const GoogleApiErrorHelp: React.FC<{ errorMessage: string | null | undefined }> = ({
  errorMessage,
}) => {
  const parts = splitAccountError(errorMessage);
  if (parts.length === 0) return null;

  const failing = parts.filter((p) => p.message && !/^null$/i.test(p.message));
  if (failing.length === 0) return null;

  return (
    <div className="space-y-2">
      {failing.map((part, idx) => (
        <div
          key={`${part.dataType}-${idx}`}
          className="text-xs text-rose-300/90 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl space-y-2"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-400" />
            <div className="min-w-0">
              <span className="font-mono font-semibold text-rose-300">{part.dataType}</span>
              <span className="text-rose-200/80"> — {part.message}</span>
            </div>
          </div>

          {part.enableUrl && part.apiName && (
            <a
              href={part.enableUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-300 text-[11px] font-semibold hover:bg-sky-500/25 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Enable {part.apiName} on Google Cloud
            </a>
          )}
        </div>
      ))}
    </div>
  );
};
