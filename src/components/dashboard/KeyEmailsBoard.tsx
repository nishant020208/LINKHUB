import React from 'react';
import {
  Receipt,
  Plane,
  Plus,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTimeAgo } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetricCounter } from '@/components/ui/metric-counter';
import { useLiveAnnouncer } from '@/components/ui/live-announcer';

export const KeyEmailsBoard: React.FC = () => {
  const { items, accounts, addItem } = useAppStore();
  const { announce } = useLiveAnnouncer();

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
    announce(`Created deadline task from email: "${emailItem.title}"`);
  };

  const emailProviders = Array.from(
    new Set(
      accounts.map((a) => {
        if (a.provider === 'google') return `Gmail (${a.email})`;
        if (a.provider === 'microsoft') return `Outlook (${a.email})`;
        return a.email || a.provider;
      })
    )
  );

  const subtitleText =
    emailProviders.length > 0
      ? `Key notices, deadlines & travel from ${emailProviders.join(', ')}`
      : 'Connect Gmail or Outlook to triage critical incoming emails';

  return (
    <Card variant="bento" className="space-y-4">
      <CardHeader>
        <div>
          <CardTitle>Actionable Emails</CardTitle>
          <CardDescription>
            {subtitleText}
          </CardDescription>
        </div>
        <Badge tone="accent">
          <MetricCounter value={emails.length} /> critical
        </Badge>
      </CardHeader>

      <CardBody className="space-y-3 pt-0">
        {emails.length > 0 ? (
          emails.map((email) => {
            const account = accounts.find((a) => a.id === email.account_id);
            const hasTravel = email.metadata?.travel_data;
            const hasBill = email.metadata?.bill_data;

            return (
              <div
                key={email.id}
                className="p-3.5 rounded-2xl bg-card/60 border border-border/50 hover:border-border transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {account && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border border-border/60"
                        style={{ backgroundColor: `${account.color}15`, color: account.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: account.color }} />
                        {account.label}
                      </span>
                    )}
                    {hasTravel && (
                      <Badge tone="info" icon={<Plane className="w-2.5 h-2.5" />}>
                        Flight / Travel
                      </Badge>
                    )}
                    {hasBill && (
                      <Badge tone="warning" icon={<Receipt className="w-2.5 h-2.5" />}>
                        Due / Statement
                      </Badge>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-muted-foreground">
                    {email.updated_at ? formatTimeAgo(email.updated_at) : 'Recent'}
                  </span>
                </div>

                <div>
                  <h5 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {email.title}
                  </h5>
                  {email.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {email.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/30">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleConvertToTask(email)}
                    title="Convert this email into a deadline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create Task</span>
                  </Button>

                  {email.url && (
                    <a
                      href={email.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-xs inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs font-mono space-y-2 border border-dashed border-border/60 rounded-2xl p-6">
            <Mail className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-foreground font-semibold">Inbox zero for action items</p>
            <p className="text-[11px] text-muted-foreground">
              Only high-priority emails with tasks, bills, or receipts will appear here.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
