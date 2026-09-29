import React from 'react';
import {
  Receipt,
  Plane,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTimeAgo } from '@/lib/utils';

export const KeyEmailsBoard: React.FC = () => {
  const { items, accounts, addItem } = useAppStore();

  const emails = items.filter((item) => item.type === 'email');

  const handleConvertToTask = (emailItem: (typeof items)[0]) => {
    addItem({
      type: 'deadline',
      account_id: emailItem.account_id,
      title: `Action: ${emailItem.title}`,
      description: emailItem.description,
      due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      priority_score: 80,
      metadata: {
        urgent_keywords: ['converted from email'],
      },
    });
  };

  return (
    <div className="rounded-2xl glass-panel border border-border/60 p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Actionable Emails</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key notices, exam schedules, bills & travel across all inboxes
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          {emails.length} critical
        </span>
      </div>

      <div className="space-y-3">
        {emails.map((email) => {
          const account = accounts.find((a) => a.id === email.account_id);
          const hasTravel = email.metadata?.travel_data;
          const hasBill = email.metadata?.bill_data;

          return (
            <div
              key={email.id}
              className="p-3.5 rounded-xl bg-card/40 border border-border/40 hover:border-border/80 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {account && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border border-border/60"
                      style={{ backgroundColor: `${account.color}15`, color: account.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: account.color }} />
                      {account.label}
                    </span>
                  )}
                  {email.metadata?.sender && (
                    <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[150px]">
                      {email.metadata.sender}
                    </span>
                  )}
                </div>

                <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                  {formatTimeAgo(email.created_at)}
                </span>
              </div>

              <h4 className="font-medium text-sm text-foreground line-clamp-2">{email.title}</h4>

              {email.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{email.description}</p>
              )}

              {/* Special Smart Badges (Travel / Bill) */}
              {hasTravel && (
                <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs text-sky-300">
                  <div className="flex items-center gap-2">
                    <Plane className="w-3.5 h-3.5" />
                    <span>{hasTravel.flight_or_hotel}</span>
                  </div>
                  <span className="font-mono font-semibold">{hasTravel.booking_ref}</span>
                </div>
              )}

              {hasBill && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{hasBill.merchant}</span>
                  </div>
                  <span className="font-mono font-bold">{hasBill.amount}</span>
                </div>
              )}

              {/* Action row: Convert to deadline & View email */}
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-border/30">
                <button
                  onClick={() => handleConvertToTask(email)}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Convert to Deadline</span>
                </button>

                {email.url && (
                  <a
                    href={email.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Open original thread"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
