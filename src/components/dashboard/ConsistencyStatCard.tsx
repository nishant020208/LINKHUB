import React from 'react';
import { Target, Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ConsistencyStats } from '@/lib/smart/consistencyMetrics';
import { cn } from '@/lib/utils';

interface ConsistencyStatCardProps {
  stats: ConsistencyStats;
  className?: string;
}

export const ConsistencyStatCard: React.FC<ConsistencyStatCardProps> = ({
  stats,
  className,
}) => {
  const {
    totalEvaluated,
    onTimeCount,
    lateCount,
    missedCount,
    onTimeRate,
    streakDays,
    periodLabel,
    hasData,
  } = stats;

  const onTimePct = totalEvaluated > 0 ? (onTimeCount / totalEvaluated) * 100 : 100;
  const latePct = totalEvaluated > 0 ? (lateCount / totalEvaluated) * 100 : 0;
  const missedPct = totalEvaluated > 0 ? (missedCount / totalEvaluated) * 100 : 0;

  return (
    <Card variant="bento" className={cn('p-4 sm:p-5 flex flex-col justify-between', className)}>
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
              Execution Reliability
            </span>
          </div>

          {streakDays > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-status-connected/10 text-status-connected border border-status-connected/20 font-medium">
              <Flame className="w-3 h-3 text-status-connected" />
              <span>{streakDays}d active</span>
            </span>
          )}
        </div>

        <div className="pt-3 pb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold tracking-tight text-foreground font-mono">
              {hasData ? `${onTimeRate}%` : '100%'}
            </span>
            <span className="text-xs font-mono text-muted-foreground">on-time delivery</span>
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {hasData
              ? `${periodLabel}: ${onTimeCount} of ${totalEvaluated} deadlines resolved on schedule.`
              : `${periodLabel}: No overdue or completed items to track.`}
          </p>
        </div>

        {/* Proportional Segment Bar */}
        {hasData && (
          <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden flex my-2 border border-border/40">
            {onTimePct > 0 && (
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${onTimePct}%` }}
                title={`${onTimeCount} on time`}
              />
            )}
            {latePct > 0 && (
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${latePct}%` }}
                title={`${lateCount} late`}
              />
            )}
            {missedPct > 0 && (
              <div
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${missedPct}%` }}
                title={`${missedCount} missed`}
              />
            )}
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center gap-4 pt-2 text-[11px] font-mono text-muted-foreground border-t border-border/40 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{onTimeCount} on-time</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>{lateCount} late</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>{missedCount} overdue</span>
        </span>
      </div>
    </Card>
  );
};
