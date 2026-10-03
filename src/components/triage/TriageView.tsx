import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useReducedMotion,
  PanInfo,
  animate,
} from 'framer-motion';
import {
  Star,
  X,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Mail,
  Calendar,
  CheckSquare,
  FileText,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { useToastStore } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { queryKeys } from '@/lib/queryKeys';
import { formatDueCountdown, cn } from '@/lib/utils';
import { Item, ItemType } from '@/types';

interface TriageHistoryEntry {
  item: Item;
  direction: 'important' | 'not_important';
  previousPriority: number;
  previousMetadata: Record<string, unknown>;
}

type TriageFilter = 'all' | 'emails' | 'deadlines';

interface TriageViewProps {
  filteredItems: Item[];
  onExitTriage?: () => void;
}

export const TriageView: React.FC<TriageViewProps> = ({ filteredItems, onExitTriage }) => {
  const queryClient = useQueryClient();
  const { accounts } = useAppStore();
  const toast = useToastStore((s) => s.toast);
  const reduce = useReducedMotion();

  const [filter, setFilter] = useState<TriageFilter>('all');
  const [history, setHistory] = useState<TriageHistoryEntry[]>([]);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Filter items that are uncompleted and not explicitly triaged in this session
  const triageQueue = useMemo(() => {
    return filteredItems.filter((item) => {
      if (item.is_done) return false;

      // Filter by type selection
      if (filter === 'emails' && item.type !== 'email') return false;
      if (filter === 'deadlines' && item.type !== 'deadline' && item.type !== 'task') return false;

      // If already triaged in this session, skip
      const alreadyTriaged = history.some((h) => h.item.id === item.id);
      return !alreadyTriaged;
    });
  }, [filteredItems, filter, history]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Keep index in bounds if queue changes
  useEffect(() => {
    if (currentIndex >= triageQueue.length && triageQueue.length > 0) {
      setCurrentIndex(0);
    }
  }, [triageQueue.length, currentIndex]);

  const currentItem = triageQueue[currentIndex] ?? null;
  const nextItem = triageQueue[currentIndex + 1] ?? null;
  const thirdItem = triageQueue[currentIndex + 2] ?? null;

  // Account associated with current item
  const currentAccount = useMemo(() => {
    return currentItem ? accounts.find((a) => a.id === currentItem.account_id) : null;
  }, [currentItem, accounts]);

  // Motion values for touch & drag physics
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const rightOverlayOpacity = useTransform(x, [20, 90], [0, 0.95]);
  const leftOverlayOpacity = useTransform(x, [-90, -20], [0.95, 0]);

  // ALWAYS guarantee card is centered when mounted or current item changes
  useEffect(() => {
    x.set(0);
    setExitDirection(null);
    setIsAnimating(false);
  }, [currentItem?.id, x]);

  // Safe haptic feedback trigger
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Safe fallback
      }
    }
  }, []);

  // Commit triage action
  const handleTriageCommit = useCallback(
    async (direction: 'important' | 'not_important') => {
      if (!currentItem) return;

      const previousPriority = currentItem.priority_score ?? 50;
      const previousMetadata = { ...(currentItem.metadata || {}) };

      // Calculate new score & metadata
      const newScore =
        direction === 'important'
          ? Math.min(100, Math.max(85, previousPriority + 20))
          : Math.min(25, Math.max(10, previousPriority - 35));

      const updatedMetadata = {
        ...previousMetadata,
        is_user_flagged_important: direction === 'important',
        triaged_at: new Date().toISOString(),
      };

      // Record to history for Undo
      setHistory((prev) => [
        {
          item: currentItem,
          direction,
          previousPriority,
          previousMetadata,
        },
        ...prev,
      ]);

      // Optimistic in-memory update
      const updatedItem: Item = {
        ...currentItem,
        priority_score: newScore,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      };

      useAppStore.setState((state) => ({
        items: state.items.map((i) => (i.id === currentItem.id ? updatedItem : i)),
      }));

      // Persist to Supabase if configured
      if (env.isConfigured.supabase) {
        try {
          await supabase
            .from('items')
            .update({
              priority_score: newScore,
              metadata: updatedMetadata,
              updated_at: new Date().toISOString(),
            })
            .eq('id', currentItem.id);

          queryClient.invalidateQueries({ queryKey: queryKeys.items });
        } catch (err) {
          console.warn('Failed to update triaged item in database:', err);
        }
      }
    },
    [currentItem, queryClient]
  );

  // Trigger triage programmatically with smooth outward animation
  const handleTriggerTriage = useCallback(
    async (direction: 'important' | 'not_important') => {
      if (isAnimating || !currentItem) return;
      setIsAnimating(true);
      triggerHaptic();
      setExitDirection(direction === 'important' ? 'right' : 'left');

      if (!reduce) {
        await animate(x, direction === 'important' ? 450 : -450, {
          duration: 0.22,
          ease: [0.32, 0, 0.67, 0],
        });
      }

      await handleTriageCommit(direction);
      x.set(0);
      setIsAnimating(false);
    },
    [isAnimating, currentItem, triggerHaptic, reduce, x, handleTriageCommit]
  );

  // Handle Drag End: swipe out or bounce back to dead center
  const handleDragEnd = async (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isAnimating) return;
    const threshold = 80;
    const velocityThreshold = 350;

    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      // Swiped right -> Important
      setIsAnimating(true);
      triggerHaptic();
      setExitDirection('right');
      await animate(x, 450, { duration: 0.22, ease: [0.32, 0, 0.67, 0] });
      await handleTriageCommit('important');
      x.set(0);
      setIsAnimating(false);
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      // Swiped left -> Not Important
      setIsAnimating(true);
      triggerHaptic();
      setExitDirection('left');
      await animate(x, -450, { duration: 0.22, ease: [0.32, 0, 0.67, 0] });
      await handleTriageCommit('not_important');
      x.set(0);
      setIsAnimating(false);
    } else {
      // Released without sufficient swipe distance -> strictly spring back to center!
      animate(x, 0, { type: 'spring', stiffness: 550, damping: 28 });
    }
  };

  // Undo last action
  const handleUndo = async () => {
    if (history.length === 0 || isAnimating) return;

    const [lastAction, ...remainingHistory] = history;
    setHistory(remainingHistory);

    // Revert in memory
    const restoredItem: Item = {
      ...lastAction.item,
      priority_score: lastAction.previousPriority,
      metadata: lastAction.previousMetadata,
      updated_at: new Date().toISOString(),
    };

    useAppStore.setState((state) => ({
      items: state.items.map((i) => (i.id === lastAction.item.id ? restoredItem : i)),
    }));

    if (env.isConfigured.supabase) {
      try {
        await supabase
          .from('items')
          .update({
            priority_score: lastAction.previousPriority,
            metadata: lastAction.previousMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lastAction.item.id);

        queryClient.invalidateQueries({ queryKey: queryKeys.items });
      } catch (err) {
        console.warn('Failed to revert item in database:', err);
      }
    }

    toast({
      kind: 'info',
      title: 'Action Undone',
      message: `Restored "${lastAction.item.title}".`,
    });
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleTriggerTriage('important');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleTriggerTriage('not_important');
      } else if (e.key === 'z' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTriggerTriage, handleUndo]);

  const typeIcon = (type: ItemType) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4 text-sky-400" />;
      case 'deadline':
      case 'task':
        return <CheckSquare className="w-4 h-4 text-status-warning" />;
      case 'event':
        return <Calendar className="w-4 h-4 text-primary" />;
      case 'file':
        return <FileText className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      {/* Triage Header & Scope Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-foreground tracking-tight">
              Triage Station
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              {triageQueue.length} item{triageQueue.length === 1 ? '' : 's'} remaining &middot;{' '}
              {history.length} processed
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border border-border/50 self-start sm:self-auto">
          {(['all', 'emails', 'deadlines'] as TriageFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-mono capitalize transition-all cursor-pointer',
                filter === f
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? 'All Unsorted' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Main Card Deck Area */}
      <div className="relative min-h-[380px] sm:min-h-[420px] flex items-center justify-center">
        {/* Empty state when all caught up */}
        {!currentItem ? (
          <Card variant="bento" className="p-8 sm:p-10 text-center w-full space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-status-connected/15 text-status-connected border border-status-connected/30 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display font-extrabold text-2xl text-foreground">
                All caught up!
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                You have triaged every pending item in this workspace. No backlogged items need
                review right now.
              </p>
            </div>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-2.5">
              {history.length > 0 && (
                <Button variant="secondary" size="sm" onClick={handleUndo} className="gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Last ({history[0].item.title.slice(0, 16)}...)</span>
                </Button>
              )}
              {onExitTriage && (
                <Button variant="primary" size="sm" onClick={onExitTriage} className="gap-1.5">
                  <span>Return to List View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="relative w-full h-[380px] sm:h-[420px]">
            {/* Third Card behind (shadow layer) */}
            {thirdItem && (
              <div
                className="absolute inset-0 rounded-3xl border border-border/20 bg-card/40 backdrop-blur-xs pointer-events-none"
                style={{
                  transform: 'scale(0.90) translateY(24px)',
                  zIndex: 1,
                  opacity: 0.5,
                }}
              />
            )}

            {/* Next Card behind (stack layer) */}
            {nextItem && (
              <div
                className="absolute inset-0 rounded-3xl border border-border/40 bg-card/70 backdrop-blur-md shadow-card pointer-events-none p-6 flex flex-col justify-between"
                style={{
                  transform: 'scale(0.95) translateY(12px)',
                  zIndex: 2,
                  opacity: 0.8,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
                    Next in queue
                  </span>
                  <Badge tone="neutral">{nextItem.type}</Badge>
                </div>
                <div>
                  <h4 className="font-display font-bold text-base text-foreground line-clamp-2">
                    {nextItem.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {nextItem.description || 'No description provided'}
                  </p>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Swipe current card to inspect
                </div>
              </div>
            )}

            {/* Top Interactive Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentItem.id}
                style={reduce ? undefined : { x, rotate, zIndex: 10 }}
                drag={reduce || isAnimating ? false : 'x'}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                dragTransition={{ bounceStiffness: 600, bounceDamping: 25 }}
                onDragEnd={handleDragEnd}
                initial={reduce ? { opacity: 0 } : { scale: 0.96, y: 12, opacity: 0, x: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1, x: 0 }}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : {
                        x: exitDirection === 'right' ? 500 : -500,
                        rotate: exitDirection === 'right' ? 20 : -20,
                        opacity: 0,
                        transition: { duration: 0.2 },
                      }
                }
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute inset-0 rounded-3xl border border-border/70 bg-card/90 backdrop-blur-2xl shadow-2xl p-5 sm:p-7 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none overflow-hidden"
              >
                {/* Visual commit feedback overlays */}
                <motion.div
                  style={{ opacity: rightOverlayOpacity }}
                  className="absolute inset-0 bg-status-connected/15 border-2 border-status-connected/60 rounded-3xl pointer-events-none flex items-center justify-start p-6 z-30"
                >
                  <div className="bg-status-connected text-black px-4 py-2 rounded-2xl font-display font-extrabold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-status-connected/20">
                    <Star className="w-4 h-4 fill-current" />
                    <span>Important</span>
                  </div>
                </motion.div>

                <motion.div
                  style={{ opacity: leftOverlayOpacity }}
                  className="absolute inset-0 bg-status-error/15 border-2 border-status-error/60 rounded-3xl pointer-events-none flex items-center justify-end p-6 z-30"
                >
                  <div className="bg-status-error text-white px-4 py-2 rounded-2xl font-display font-extrabold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-status-error/20">
                    <X className="w-4 h-4" />
                    <span>Not Important</span>
                  </div>
                </motion.div>

                {/* Card Top Strip */}
                <div className="flex items-center justify-between gap-2 z-10">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-muted/60 border border-border/50">
                      {typeIcon(currentItem.type)}
                    </div>
                    {currentAccount && (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-border/60"
                        style={{
                          backgroundColor: `${currentAccount.color}15`,
                          color: currentAccount.color,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: currentAccount.color }}
                        />
                        {currentAccount.label}
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest font-medium">
                    {currentItem.type}
                  </span>
                </div>

                {/* Card Middle: Title, Preview, Metadata */}
                <div className="space-y-3 z-10 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-extrabold text-lg sm:text-xl text-foreground leading-snug tracking-tight">
                      {currentItem.title}
                    </h3>
                    {currentItem.url && (
                      <a
                        href={currentItem.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/60 transition-colors shrink-0"
                        title="Open external link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-4">
                    {currentItem.description || 'No additional content provided for this item.'}
                  </p>

                  {/* Course / Sender / Location badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {currentItem.metadata?.course_name && (
                      <Badge tone="accent">
                        {String(currentItem.metadata.course_name)}
                      </Badge>
                    )}
                    {currentItem.metadata?.sender && (
                      <Badge tone="neutral">
                        From: {String(currentItem.metadata.sender)}
                      </Badge>
                    )}
                    {currentItem.due_at && (
                      <Badge tone={formatDueCountdown(currentItem.due_at).isOverdue ? 'danger' : 'warning'}>
                        <Clock className="w-3 h-3 mr-1 inline" />
                        Due {formatDueCountdown(currentItem.due_at).label}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Micro instructions */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground z-10">
                  <span className="hidden sm:inline font-mono text-[11px]">
                    &larr; Swipe left to dismiss &middot; Swipe right to keep &rarr;
                  </span>
                  <span className="sm:hidden font-mono text-[11px]">
                    Drag left/right to sort
                  </span>
                  <span className="font-mono text-[11px] text-foreground font-semibold">
                    Score: {currentItem.priority_score}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Desktop / Touch Action Buttons Bar */}
      {currentItem && (
        <div className="flex items-center justify-between gap-3 pt-2">
          {/* Reject / Not Important Button */}
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleTriggerTriage('not_important')}
            disabled={isAnimating}
            className="flex-1 py-3 border-status-error/30 hover:bg-status-error/10 hover:text-status-error hover:border-status-error/50 font-mono text-xs gap-2 cursor-pointer transition-all disabled:opacity-50"
            title="Mark as not important (or press Left Arrow)"
          >
            <X className="w-4 h-4 text-status-error" />
            <span>Not Important</span>
            <span className="hidden sm:inline text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
              &larr;
            </span>
          </Button>

          {/* Undo Action */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={history.length === 0 || isAnimating}
            className="px-3 min-h-[44px] rounded-2xl text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-40"
            title="Undo last swipe (Z)"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          {/* Accept / Important Button */}
          <Button
            variant="primary"
            size="md"
            onClick={() => handleTriggerTriage('important')}
            disabled={isAnimating}
            className="flex-1 py-3 bg-status-connected hover:bg-status-connected/90 text-black font-semibold font-mono text-xs gap-2 cursor-pointer shadow-md shadow-status-connected/20 transition-all disabled:opacity-50"
            title="Mark as important (or press Right Arrow)"
          >
            <Star className="w-4 h-4 fill-current" />
            <span>Mark Important</span>
            <span className="hidden sm:inline text-[10px] bg-black/20 text-black px-1.5 py-0.5 rounded">
              &rarr;
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};
