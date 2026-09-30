import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Video,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

type ViewMode = 'agenda' | 'week' | 'day';

export const CalendarPage: React.FC = () => {
  const { items, accounts, briefing } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const events = items
    .filter((item) => item.type === 'event' && item.start_at)
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime());

  // Hours for Day View
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

  // Days for Week View
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-6">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h2 className="font-heading font-bold text-2xl text-foreground">Unified Calendar</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Merged view across Google, Microsoft, and academic timetables
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center p-1 rounded-xl bg-card border border-border/50">
            {(['agenda', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const prev = new Date(currentDate);
                prev.setDate(prev.getDate() - (viewMode === 'week' ? 7 : 1));
                setCurrentDate(prev);
              }}
              className="p-2 rounded-xl bg-card border border-border/50 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1.5 rounded-xl bg-card border border-border/50 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => {
                const next = new Date(currentDate);
                next.setDate(next.getDate() + (viewMode === 'week' ? 7 : 1));
                setCurrentDate(next);
              }}
              className="p-2 rounded-xl bg-card border border-border/50 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Free Slots Callout */}
      {briefing?.free_slots_summary && (
        <div className="p-3.5 rounded-2xl glass-panel border border-sky-500/20 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-sky-300">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Open Study & Focus Slots Today:</span>
            <strong className="font-mono text-white">{briefing.free_slots_summary}</strong>
          </div>
        </div>
      )}

      {/* 1. AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const account = accounts.find((a) => a.id === event.account_id);
            const start = new Date(event.start_at!);
            const end = event.end_at ? new Date(event.end_at) : null;
            const isVideo =
              event.url?.includes('zoom') ||
              event.url?.includes('meet') ||
              event.url?.includes('teams');

            return (
              <div
                key={event.id}
                className="p-5 rounded-2xl glass-panel border border-border/60 hover:border-sky-500/40 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
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
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                    >
                      {isVideo ? <Video className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      <span>{isVideo ? 'Join Call' : 'Open Details'}</span>
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. WEEK VIEW — horizontal scroll on phones so columns stay readable */}
      {viewMode === 'week' && (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[640px] sm:min-w-0">
          {weekDays.map((day, idx) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const dayEvents = events.filter((e) => {
              const evDate = new Date(e.start_at!);
              return evDate.toDateString() === day.toDateString();
            });

            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl glass-panel border min-h-[300px] flex flex-col justify-between ${
                  isToday ? 'border-sky-500/50 bg-sky-500/5' : 'border-border/40'
                }`}
              >
                <div className="text-center pb-2 border-b border-border/30">
                  <div className="text-[11px] font-mono uppercase text-muted-foreground">
                    {day.toLocaleDateString([], { weekday: 'short' })}
                  </div>
                  <div
                    className={`text-base font-heading font-bold mt-0.5 ${
                      isToday ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>

                <div className="space-y-1.5 my-2 flex-1">
                  {dayEvents.map((ev) => {
                    const acc = accounts.find((a) => a.id === ev.account_id);
                    return (
                      <div
                        key={ev.id}
                        className="p-2 rounded-xl bg-card/60 border border-border/50 text-[11px] space-y-1"
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: acc?.color || '#38bdf8' }}
                          />
                          <span className="font-mono text-[10px] text-muted-foreground truncate">
                            {new Date(ev.start_at!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="font-medium text-foreground line-clamp-2 leading-tight">
                          {ev.title}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[10px] font-mono text-center text-muted-foreground/60">
                  {dayEvents.length} events
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* 3. DAY VIEW */}
      {viewMode === 'day' && (
        <div className="rounded-2xl glass-panel border border-border/60 p-5 space-y-3">
          <div className="font-heading font-semibold text-sm text-foreground pb-2 border-b border-border/40">
            {currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>

          <div className="space-y-2">
            {hours.map((hour) => {
              const hourLabel = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
              const slotEvents = events.filter((ev) => {
                const evDate = new Date(ev.start_at!);
                return evDate.getHours() === hour;
              });

              return (
                <div key={hour} className="flex items-start gap-4 p-2 rounded-xl hover:bg-card/30 transition-colors">
                  <div className="w-18 font-mono text-xs text-muted-foreground text-right shrink-0 pt-1">
                    {hourLabel}
                  </div>

                  <div className="flex-1 space-y-2">
                    {slotEvents.length === 0 ? (
                      <div className="h-6 border-b border-border/20" />
                    ) : (
                      slotEvents.map((ev) => {
                        const acc = accounts.find((a) => a.id === ev.account_id);
                        return (
                          <div
                            key={ev.id}
                            className="p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc?.color }} />
                                <span className="font-medium text-xs text-foreground">{ev.title}</span>
                              </div>
                              {ev.metadata?.location && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {ev.metadata.location}
                                </p>
                              )}
                            </div>

                            {ev.url && (
                              <a
                                href={ev.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline font-mono"
                              >
                                Join
                              </a>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
