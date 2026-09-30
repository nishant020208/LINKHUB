import React from 'react';
import { MapPin, Video, ArrowUpRight, Clock, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCounter } from '@/components/ui/metric-counter';

export const EventsTimeline: React.FC = () => {
  const { items, accounts, briefing } = useAppStore();

  const events = items
    .filter((item) => item.type === 'event' && item.start_at)
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime());

  const calendarProviders = Array.from(
    new Set(
      accounts.map((a) => {
        if (a.provider === 'google') return `Google Calendar (${a.email})`;
        if (a.provider === 'microsoft') return `Outlook Calendar (${a.email})`;
        return a.label || a.provider;
      })
    )
  );

  const subtitleText =
    calendarProviders.length > 0
      ? `Combined ${calendarProviders.join(', ')} schedule`
      : 'Connect Google Calendar or Outlook to view your schedule';

  return (
    <Card variant="bento" className="space-y-4">
      <CardHeader>
        <div>
          <CardTitle>Today&apos;s Schedule</CardTitle>
          <CardDescription>
            {subtitleText}
          </CardDescription>
        </div>
        <Badge tone="info">
          <MetricCounter value={events.length} /> events
        </Badge>
      </CardHeader>

      <CardBody className="space-y-4 pt-0">
        {/* Free time window recommendation callout */}
        {briefing?.free_slots_summary && (
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-foreground">Open Focus Windows: </span>
              <span className="text-muted-foreground font-mono">{briefing.free_slots_summary}</span>
            </div>
          </div>
        )}

        {/* Timeline items */}
        {events.length > 0 ? (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
            {events.map((event) => {
              const account = accounts.find((a) => a.id === event.account_id);
              const startTime = new Date(event.start_at!).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const endTime = event.end_at
                ? new Date(event.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              const isVideoCall =
                event.url?.includes('zoom.us') ||
                event.url?.includes('meet.google') ||
                event.url?.includes('teams.microsoft');

              return (
                <div key={event.id} className="relative group">
                  {/* Account colored anchor dot on timeline */}
                  <div
                    className="absolute -left-[27px] top-2 w-3.5 h-3.5 rounded-full ring-4 ring-background transition-transform group-hover:scale-125"
                    style={{ backgroundColor: account?.color || 'var(--primary)' }}
                  />

                  <div className="p-3.5 rounded-2xl bg-card/60 border border-border/50 hover:border-border transition-all">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {startTime} {endTime ? `– ${endTime}` : ''}
                        </span>
                        {account && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {account.label}
                          </span>
                        )}
                      </div>

                      {event.url && (
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                        >
                          {isVideoCall ? <Video className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{isVideoCall ? 'Join Call' : 'Details'}</span>
                        </a>
                      )}
                    </div>

                    <h5 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {event.title}
                    </h5>

                    {event.metadata?.location && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{event.metadata.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs font-mono space-y-2 border border-dashed border-border/60 rounded-2xl p-6">
            <Calendar className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-foreground font-semibold">No scheduled events today</p>
            <p className="text-[11px] text-muted-foreground">
              Your Google Calendar and Microsoft Outlook events will sync and display here.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
