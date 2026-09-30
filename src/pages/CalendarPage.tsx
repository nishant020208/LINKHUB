import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Video,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
          <h2 className="font-display font-bold text-2xl text-foreground">Unified Calendar</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Merged view across Google, Microsoft, and academic timetables
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-card border border-border/50">
            {(['agenda', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
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
            <Button
              variant="secondary"
              size="sm"
              iconOnly
              onClick={() => {
                const prev = new Date(currentDate);
                prev.setDate(prev.getDate() - (viewMode === 'week' ? 7 : 1));
                setCurrentDate(prev);
              }}
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="font-mono text-xs"
            >
              Today
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconOnly
              onClick={() => {
                const next = new Date(currentDate);
                next.setDate(next.getDate() + (viewMode === 'week' ? 7 : 1));
                setCurrentDate(next);
              }}
              title="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Free Slots Callout */}
      {briefing?.free_slots_summary && (
        <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Zap className="w-4 h-4 shrink-0" />
            <span>Open Study &amp; Focus Windows:</span>
            <strong className="font-mono text-foreground font-bold">{briefing.free_slots_summary}</strong>
          </div>
        </div>
      )}

      {/* 1. AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.length > 0 ? (
            events.map((event) => {
              const account = accounts.find((a) => a.id === event.account_id);
              const start = new Date(event.start_at!);
              const end = event.end_at ? new Date(event.end_at) : null;
              const isVideo =
                event.url?.includes('zoom') ||
                event.url?.includes('meet') ||
                event.url?.includes('teams');

              return (
                <Card
                  key={event.id}
                  variant="bento"
                  interactive
                  className="p-5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-semibold text-primary flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {end ? ` – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
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

                    <h4 className="font-display font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                      {event.title}
                    </h4>

                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {event.metadata?.location && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                        <span className="truncate">{event.metadata.location}</span>
                      </div>
                    )}
                  </div>

                  {event.url && (
                    <div className="mt-4 pt-3 border-t border-border/30 flex justify-end">
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                      >
                        {isVideo ? <Video className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        <span>{isVideo ? 'Join Call' : 'Open Details'}</span>
                      </a>
                    </div>
                  )}
                </Card>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-xs font-mono space-y-2 border border-dashed border-border/60 rounded-2xl p-6">
              <CalendarIcon className="w-6 h-6 text-muted-foreground mx-auto" />
              <p className="text-foreground font-semibold">No calendar events found</p>
              <p className="text-[11px] text-muted-foreground">
                Connect your Google or Outlook calendar to view unified agenda items.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-7 gap-2 min-w-[680px]">
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
                    isToday ? 'border-primary/50 bg-primary/5 shadow-sm' : 'border-border/40'
                  }`}
                >
                  <div className="text-center pb-2 border-b border-border/30">
                    <div className="text-[11px] font-mono uppercase text-muted-foreground">
                      {day.toLocaleDateString([], { weekday: 'short' })}
                    </div>
                    <div
                      className={`text-base font-display font-bold mt-0.5 ${
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
                          className="p-2 rounded-xl bg-card/70 border border-border/50 text-[11px] space-y-1"
                        >
                          <div className="flex items-center gap-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: acc?.color || 'var(--primary)' }}
                            />
                            <span className="font-semibold text-foreground line-clamp-1 truncate">
                              {ev.title}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-primary">
                            {new Date(ev.start_at!).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center pt-1 text-[10px] font-mono text-muted-foreground">
                    {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DAY VIEW */}
      {viewMode === 'day' && (
        <Card variant="bento" className="p-4 sm:p-6 space-y-3">
          <div className="space-y-2">
            {hours.map((hour) => {
              const hourEvents = events.filter((e) => {
                const d = new Date(e.start_at!);
                return (
                  d.toDateString() === currentDate.toDateString() &&
                  d.getHours() === hour
                );
              });

              return (
                <div key={hour} className="flex gap-4 items-start py-2 border-b border-border/30 last:border-none">
                  <div className="w-16 text-right font-mono text-xs text-muted-foreground shrink-0 pt-0.5">
                    {hour % 12 || 12} {hour >= 12 ? 'PM' : 'AM'}
                  </div>
                  <div className="flex-1 space-y-2 min-h-[32px]">
                    {hourEvents.map((ev) => {
                      const acc = accounts.find((a) => a.id === ev.account_id);
                      return (
                        <div
                          key={ev.id}
                          className="p-2.5 rounded-xl bg-card/80 border border-primary/20 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: acc?.color || 'var(--primary)' }}
                            />
                            <span className="font-medium text-xs text-foreground">{ev.title}</span>
                          </div>
                          <span className="text-[11px] font-mono text-primary font-medium">
                            {new Date(ev.start_at!).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
