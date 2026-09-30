import React from 'react';
import { cn } from '@/lib/utils';

/** Shimmer base — shape skeletons after the real cards they replace. */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-xl bg-muted/70', className)} />
);

export const BoardSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="rounded-3xl border border-border/60 bg-card/70 p-5 space-y-3" aria-busy="true" aria-live="polite">
    <div className="flex items-center gap-2 pb-2 border-b border-border/40">
      <Skeleton className="w-8 h-8 rounded-xl" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2 w-48" />
      </div>
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/30">
        <Skeleton className="w-5 h-5 rounded-md shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-2.5 w-3/4" />
          <Skeleton className="h-2 w-1/3" />
        </div>
        <Skeleton className="h-2 w-14 shrink-0" />
      </div>
    ))}
  </div>
);

export const GridSkeleton: React.FC<{ cards?: number }> = ({ cards = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true">
    {Array.from({ length: cards }).map((_, i) => (
      <div key={i} className="rounded-3xl border border-border/60 bg-card/70 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-2xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2 w-20" />
          </div>
        </div>
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
    ))}
  </div>
);
