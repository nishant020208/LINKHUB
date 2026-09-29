import React from 'react';
import { MapPin, Video, ArrowUpRight, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export const EventsTimeline: React.FC = () => {
  const { items, accounts, briefing } = useAppStore();

  const events = items
    .filter((item) => item.type === 'event' && item.start_at)
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime());

  return (
    <div className="rounded-2xl glass-panel border border-border/60 p-5 shadow-xl space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Today&apos;s Schedule</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Combined college, personal, and work calendars
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
          {events.length} events
        </span>
      </div>

      {/* Free time window recommendation callout */}
      {briefing?.free_slots_summary && (
        <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-foreground">Open Focus Windows: </span>
            <span className="text-muted-foreground font-mono">{briefing.free_slots_summary}</span>
          </div>
        </div>
      )}

      {/* Timeline items */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
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
                className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-background transition-transform group-hover:scale-125"
                style={{ backgroundColor: account?.color || '#38bdf8' }}
              />

              <div className="p-3.5 rounded-xl bg-card/40 border border-border/40 hover:border-border/80 transition-all">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {startTime} {endTime ? `- ${endTime}` : ''}
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
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    >
                      {isVideoCall ? <Video className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      <span>{isVideoCall ? 'Join Call' : 'Details'}</span>
                    </a>
                  )}
                </div>

                <h4 className="font-medium text-sm text-foreground">{event.title}</h4>

                {event.metadata?.location && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{event.metadata.location}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {events.length === 0 && (
          <div className="py-8 text-center text-xs font-mono text-muted-foreground border border-dashed border-border/50 rounded-xl p-4">
            <p className="text-foreground font-medium mb-1">No scheduled events</p>
            <p className="text-[11px]">Connect your Google or Outlook calendar to view your schedule.</p>
          </div>
        )}
      </div>
    </div>
  );
};
