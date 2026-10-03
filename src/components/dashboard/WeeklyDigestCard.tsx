import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';

export const WeeklyDigestCard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [digest, setDigest] = useState<{
    id: string;
    title: string;
    summary_markdown: string;
    stats: {
      completed_deadlines?: number;
      missed_deadlines?: number;
      upcoming_deadlines?: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('weekly_digests')
      .select('id, title, summary_markdown, stats')
      .eq('user_id', user.id)
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDigest(data as any);
        setLoading(false);
      });
  }, [user?.id]);

  if (loading || !digest) return null;

  // Extract the first descriptive paragraph
  const firstParagraph = digest.summary_markdown
    .split('\n\n')
    .find((p) => !p.startsWith('#') && !p.startsWith('-')) || '';
  const snippet = firstParagraph.replace(/\*\*([^*]+)\*\*/g, '$1').slice(0, 180);

  return (
    <Card className="border-primary/30 bg-primary/5 hover:border-primary/50 transition-all">
      <CardBody className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-sm text-foreground">
                {digest.title}
              </span>
              <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                <span className="flex items-center gap-0.5 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> {digest.stats.completed_deadlines ?? 0} done
                </span>
                {Boolean(digest.stats.missed_deadlines) && (
                  <span className="flex items-center gap-0.5 text-rose-400">
                    <AlertTriangle className="w-3 h-3" /> {digest.stats.missed_deadlines} missed
                  </span>
                )}
              </div>
            </div>
            {snippet && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {snippet}…
              </p>
            )}
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/digest')}
          className="text-xs h-8 cursor-pointer shrink-0 gap-1.5 self-start sm:self-center"
        >
          <span>Read digest</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </CardBody>
    </Card>
  );
};
