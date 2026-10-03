import React, { useState, useMemo } from 'react';
import {
  Mail,
  Star,
  X,
  ExternalLink,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  CheckSquare,
  FileText,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { useToastStore } from '@/components/ui/toast';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollablePanel } from '@/components/ui/scrollable-panel';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { queryKeys } from '@/lib/queryKeys';
import { formatTimeAgo, cn } from '@/lib/utils';
import { Item, ItemType } from '@/types';

type NoticeFilter = 'all' | 'important' | 'not_important' | 'unsorted' | 'emails';

interface PriorityNoticesListProps {
  items: Item[];
  onStartTriage?: () => void;
}

export const PriorityNoticesList: React.FC<PriorityNoticesListProps> = ({ items, onStartTriage }) => {
  const queryClient = useQueryClient();
  const { accounts, setActiveItemId } = useAppStore();
  const toast = useToastStore((s) => s.toast);

  const [activeFilter, setActiveFilter] = useState<NoticeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(30);

  // Filter only notice-like items: emails, messages, or items with priority/urgent flags
  const noticeItems = useMemo(() => {
    return (items || []).filter((item) => {
      if (!item) return false;
      return (
        item.type === 'email' ||
        (Array.isArray(item.metadata?.urgent_keywords) && item.metadata.urgent_keywords.length > 0) ||
        item.metadata?.is_user_flagged_important !== undefined ||
        item.priority_score >= 70
      );
    });
  }, [items]);

  // Counts for the filter tabs
  const importantCount = useMemo(
    () =>
      noticeItems.filter(
        (i) => i.metadata?.is_user_flagged_important === true || i.priority_score >= 80
      ).length,
    [noticeItems]
  );

  const notImportantCount = useMemo(
    () =>
      noticeItems.filter(
        (i) => i.metadata?.is_user_flagged_important === false || i.priority_score <= 30
      ).length,
    [noticeItems]
  );

  const unsortedCount = useMemo(
    () =>
      noticeItems.filter(
        (i) =>
          i.metadata?.is_user_flagged_important === undefined &&
          i.priority_score > 30 &&
          i.priority_score < 80
      ).length,
    [noticeItems]
  );

  const emailCount = useMemo(
    () => noticeItems.filter((i) => i.type === 'email').length,
    [noticeItems]
  );

  // Apply active filter and search query
  const filteredNotices = useMemo(() => {
    return noticeItems.filter((item) => {
      // Filter tab
      if (activeFilter === 'important') {
        const isImp = item.metadata?.is_user_flagged_important === true || item.priority_score >= 80;
        if (!isImp) return false;
      } else if (activeFilter === 'not_important') {
        const isNotImp = item.metadata?.is_user_flagged_important === false || item.priority_score <= 30;
        if (!isNotImp) return false;
      } else if (activeFilter === 'unsorted') {
        const isUnsorted =
          item.metadata?.is_user_flagged_important === undefined &&
          item.priority_score > 30 &&
          item.priority_score < 80;
        if (!isUnsorted) return false;
      } else if (activeFilter === 'emails') {
        if (item.type !== 'email') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const senderMatch = String(item.metadata?.sender || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !senderMatch) return false;
      }

      return true;
    });
  }, [noticeItems, activeFilter, searchQuery]);

  const visibleNotices = useMemo(() => {
    return filteredNotices.slice(0, displayLimit);
  }, [filteredNotices, displayLimit]);

  // Fast triage toggle: Important
  const handleToggleImportant = async (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    const currentlyImportant =
      item.metadata?.is_user_flagged_important === true || item.priority_score >= 80;

    const newScore = currentlyImportant ? 50 : 95;
    const newMetadata = {
      ...(item.metadata || {}),
      is_user_flagged_important: !currentlyImportant,
      triaged_at: new Date().toISOString(),
    };

    // Optimistic update
    const updated: Item = {
      ...item,
      priority_score: newScore,
      metadata: newMetadata,
      updated_at: new Date().toISOString(),
    };

    useAppStore.setState((state) => ({
      items: state.items.map((i) => (i.id === item.id ? updated : i)),
    }));

    if (env.isConfigured.supabase) {
      try {
        await supabase
          .from('items')
          .update({
            priority_score: newScore,
            metadata: newMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.items });
      } catch (err) {
        console.warn('Failed to update item priority:', err);
      }
    }

    toast({
      kind: 'success',
      title: currentlyImportant ? 'Removed from Important' : 'Marked as Important',
      message: `Updated priority for "${item.title.slice(0, 32)}".`,
    });
  };

  // Fast triage toggle: Not Important
  const handleToggleNotImportant = async (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    const currentlyNotImportant =
      item.metadata?.is_user_flagged_important === false || item.priority_score <= 30;

    const newScore = currentlyNotImportant ? 50 : 20;
    const newMetadata = {
      ...(item.metadata || {}),
      is_user_flagged_important: !currentlyNotImportant ? false : undefined,
      triaged_at: new Date().toISOString(),
    };

    const updated: Item = {
      ...item,
      priority_score: newScore,
      metadata: newMetadata,
      updated_at: new Date().toISOString(),
    };

    useAppStore.setState((state) => ({
      items: state.items.map((i) => (i.id === item.id ? updated : i)),
    }));

    if (env.isConfigured.supabase) {
      try {
        await supabase
          .from('items')
          .update({
            priority_score: newScore,
            metadata: newMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.items });
      } catch (err) {
        console.warn('Failed to update item priority:', err);
      }
    }

    toast({
      kind: 'info',
      title: currentlyNotImportant ? 'Unflagged' : 'Marked Not Important',
      message: `Updated status for "${item.title.slice(0, 32)}".`,
    });
  };

  const typeIcon = (type: ItemType) => {
    switch (type) {
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-sky-400" />;
      case 'deadline':
      case 'task':
        return <CheckSquare className="w-3.5 h-3.5 text-status-warning" />;
      case 'event':
        return <Calendar className="w-3.5 h-3.5 text-primary" />;
      case 'file':
        return <FileText className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <Card variant="bento" className="space-y-4">
      {/* Header */}
      <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-status-connected" />
            <CardTitle>Priority Notices & Inboxes</CardTitle>
          </div>
          <CardDescription>
            {noticeItems.length} streams items &middot; {importantCount} flagged important &middot; {unsortedCount} unsorted
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onStartTriage && (
            <Button
              variant="primary"
              size="sm"
              onClick={onStartTriage}
              className="gap-1.5 text-xs font-mono bg-status-connected hover:bg-status-connected/90 text-black shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Triage Deck</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardBody className="pt-0 space-y-3">
        {/* Filter Chips & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer',
                activeFilter === 'all'
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70'
              )}
            >
              All ({noticeItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('important')}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1',
                activeFilter === 'important'
                  ? 'bg-status-connected/20 text-status-connected border border-status-connected/40 font-semibold'
                  : 'text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70'
              )}
            >
              <Star className="w-3 h-3 fill-current text-status-connected" />
              <span>Important ({importantCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('not_important')}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1',
                activeFilter === 'not_important'
                  ? 'bg-status-error/20 text-status-error border border-status-error/40 font-semibold'
                  : 'text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70'
              )}
            >
              <X className="w-3 h-3" />
              <span>Not Important ({notImportantCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('unsorted')}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer',
                activeFilter === 'unsorted'
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70'
              )}
            >
              Unsorted ({unsortedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('emails')}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer',
                activeFilter === 'emails'
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70'
              )}
            >
              Emails ({emailCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[180px] sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notices..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-card/60 border border-border/50 text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Notices Scrollable List */}
        {visibleNotices.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-border/40 rounded-2xl">
            <CheckCircle2 className="w-8 h-8 text-status-connected mx-auto" />
            <p className="text-sm font-medium text-foreground">No notices found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? 'Try broadening your search term.'
                : 'No items match the selected filter category.'}
            </p>
          </div>
        ) : (
          <ScrollablePanel maxHeight="max-h-[500px]" ariaLabel="Priority notices list" className="space-y-2.5">
            {visibleNotices.map((item) => {
              const account = accounts.find((a) => a.id === item.account_id);
              const isImportant =
                item.metadata?.is_user_flagged_important === true || item.priority_score >= 80;
              const isNotImportant =
                item.metadata?.is_user_flagged_important === false || item.priority_score <= 30;

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveItemId(item.id)}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all space-y-2 group cursor-pointer',
                    isImportant
                      ? 'bg-status-connected/5 border-status-connected/30 hover:border-status-connected/60 hover:bg-status-connected/10'
                      : isNotImportant
                      ? 'bg-card/40 border-border/40 opacity-75 hover:opacity-100 hover:bg-card/70'
                      : 'bg-card/60 border-border/50 hover:border-primary/40 hover:bg-card/90'
                  )}
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

                      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        {typeIcon(item.type)}
                        {item.type}
                      </span>

                      {/* Important Status Badge */}
                      {isImportant && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-status-connected/15 text-status-connected border border-status-connected/30">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>Important</span>
                        </span>
                      )}

                      {isNotImportant && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/50">
                          <X className="w-2.5 h-2.5" />
                          <span>Not Important</span>
                        </span>
                      )}

                      {!isImportant && !isNotImportant && (
                        <span className="text-[10px] font-mono text-muted-foreground/60 px-1.5">
                          Unsorted
                        </span>
                      )}
                    </div>

                    {/* Quick 1-click Action Buttons on Row */}
                    <div className="flex items-center gap-1">
                      {/* Mark Important toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleImportant(e, item)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors cursor-pointer',
                          isImportant
                            ? 'bg-status-connected text-black'
                            : 'text-muted-foreground hover:text-status-connected hover:bg-status-connected/10'
                        )}
                        title={isImportant ? 'Unmark important' : 'Mark as important'}
                      >
                        <Star className={cn('w-3.5 h-3.5', isImportant && 'fill-current')} />
                      </button>

                      {/* Mark Not Important toggle */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleNotImportant(e, item)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors cursor-pointer',
                          isNotImportant
                            ? 'bg-status-error text-white'
                            : 'text-muted-foreground hover:text-status-error hover:bg-status-error/10'
                        )}
                        title={isNotImportant ? 'Unmark not important' : 'Mark as not important'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* External Link if URL exists */}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors"
                          title="Open external source"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Title & Preview */}
                  <div>
                    <h4 className="font-display font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {item.description || 'No message preview available.'}
                    </p>
                  </div>

                  {/* Footer metadata: sender & time */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/30">
                    <div className="flex items-center gap-2 truncate">
                      {item.metadata?.sender && (
                        <span className="truncate">From: {String(item.metadata.sender)}</span>
                      )}
                      {!item.metadata?.sender && (
                        <span>Priority Score: {item.priority_score}</span>
                      )}
                    </div>
                    <span>{formatTimeAgo(item.updated_at || item.created_at)}</span>
                  </div>
                </div>
              );
            })}

            {/* Pagination / Load more */}
            {filteredNotices.length > displayLimit && (
              <div className="text-center pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDisplayLimit((prev) => prev + 30)}
                  className="text-xs font-mono cursor-pointer"
                >
                  Show More ({filteredNotices.length - displayLimit} remaining)
                </Button>
              </div>
            )}
          </ScrollablePanel>
        )}
      </CardBody>
    </Card>
  );
};
