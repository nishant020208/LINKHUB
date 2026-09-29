import React from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Video, ArrowUpRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export const CalendarPage: React.FC = () => {
  const { items, accounts } = useAppStore();

  const events = items
    .filter((item) => item.type === 'event' && item.start_at)
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div>
          <h2 className="font-heading font-bold text-2xl text-foreground">Unified Calendar</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Aggregated timetable across Google Calendar, Outlook, and Course Schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-sky-500/10 text-sky-400 font-mono text-xs border border-sky-500/20">
            Agenda View
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => {
          const account = accounts.find((a) => a.id === event.account_id);
          const start = new Date(event.start_at!);
          const end = event.end_at ? new Date(event.end_at) : null;

          return (
            <div
              key={event.id}
              className="p-5 rounded-2xl glass-panel border border-border/60 hover:border-sky-500/40 transition-all flex flex-col justify-between group shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-semibold text-primary">
                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {end ? ` - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </span>

                  {account && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border border-border/60"
                      style={{ backgroundColor: `${account.color}15`, color: account.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: account.color }} />
                      {account.label}
                    </span>
                  )}
                </div>

                <h4 className="font-heading font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                  {event.title}
                </h4>

                {event.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {event.metadata?.location && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                    <span>{event.metadata.location}</span>
                  </div>
                )}
              </div>

              {event.url && (
                <div className="mt-4 pt-3 border-t border-border/30 flex justify-end">
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    <span>Open meeting link</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
