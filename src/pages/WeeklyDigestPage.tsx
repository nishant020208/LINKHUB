import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, CheckCircle2, AlertTriangle, MessageSquare, GitPullRequest, RefreshCw, Mail, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';

interface WeeklyDigest {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  title: string;
  summary_markdown: string;
  stats: {
    completed_deadlines?: number;
    missed_deadlines?: number;
    upcoming_deadlines?: number;
    unactioned_messages?: number;
    open_pull_requests?: number;
    upcoming_events?: number;
  };
  created_at: string;
}

export const WeeklyDigestPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [digests, setDigests] = useState<WeeklyDigest[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchDigests = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weekly_digests')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start_date', { ascending: false });

      if (data && !error) {
        setDigests(data as WeeklyDigest[]);
      }
    } catch (e) {
      console.error('Failed to load digests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigests();
  }, [user?.id]);

  const handleGenerate = async () => {
    if (!user?.id) return;
    setGenerating(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.functions.invoke('weekly-digest', {
        body: { user_id: user.id },
      });

      if (error) {
        setFeedback(`Generation failed: ${error.message}`);
      } else if (data?.digest) {
        setFeedback('Weekly digest synthesized successfully!');
        await fetchDigests();
        setSelectedIndex(0);
      }
    } catch (err) {
      setFeedback(`Generation error: ${String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    const current = digests[selectedIndex];
    if (!current || !user?.email) return;
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('dispatch-notification', {
        body: {
          channel: 'email',
          recipient: user.email,
          title: current.title,
          body: current.summary_markdown,
          priority: 'normal',
        },
      });

      if (error) {
        setFeedback(`Failed to send email: ${error.message}`);
      } else {
        setFeedback(`Digest dispatched to ${user.email}!`);
      }
    } catch (e) {
      setFeedback(`Email error: ${String(e)}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopy = () => {
    const current = digests[selectedIndex];
    if (!current) return;
    navigator.clipboard.writeText(`${current.title}\n\n${current.summary_markdown}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentDigest = digests[selectedIndex];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-2xl">Weekly Executive Digest</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-ecosystem AI synthesis across Google, GitHub, Notion, Todoist, Slack, and Jira
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={generating}
          className="gap-2 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Synthesizing with Gemini...' : 'Generate New Digest'}
        </Button>
      </div>

      {feedback && (
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-xs font-mono text-primary flex items-center justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="underline ml-2 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs font-mono text-muted-foreground">Loading executive digests...</p>
        </div>
      ) : digests.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-display font-bold text-base">No Weekly Digests Generated Yet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                UnifyHub analyzes your completed vs missed deadlines, upcoming project tickets, open GitHub PRs, and meeting loads to formulate a high-leverage weekly strategic briefing.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={generating}
              className="gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Synthesizing...' : 'Generate Your First Digest'}
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* History Sidebar */}
          <div className="space-y-3 lg:col-span-1">
            <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Digest Archive
            </h4>
            <div className="space-y-2">
              {digests.map((d, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary/40 bg-primary/10 font-semibold'
                        : 'border-border/60 bg-card/60 hover:bg-card hover:border-border text-muted-foreground'
                    }`}
                  >
                    <div className="text-xs font-display text-foreground">{d.title}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>{d.week_start_date} to {d.week_end_date}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Digest View */}
          <div className="space-y-4 lg:col-span-3">
            {currentDigest && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                    <div>
                      <h3 className="font-display font-bold text-lg text-foreground">
                        {currentDigest.title}
                      </h3>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        Week of {currentDigest.week_start_date} &ndash; {currentDigest.week_end_date} &bull; Generated {new Date(currentDigest.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCopy}
                        className="text-xs h-8 cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSendEmail}
                        disabled={sendingEmail}
                        className="text-xs h-8 cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {sendingEmail ? 'Sending...' : 'Email'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="space-y-6">
                  {/* High-Level Stat Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 pb-3 border-b border-border/40">
                    <div className="p-2.5 rounded-xl bg-card/60 border border-border/40 text-center">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Done</div>
                      <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {currentDigest.stats.completed_deadlines ?? 0}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card/60 border border-border/40 text-center">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Slipped</div>
                      <div className="text-sm font-mono font-bold text-rose-400 mt-0.5 flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {currentDigest.stats.missed_deadlines ?? 0}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card/60 border border-border/40 text-center">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Upcoming</div>
                      <div className="text-sm font-mono font-bold text-primary mt-0.5">
                        {currentDigest.stats.upcoming_deadlines ?? 0}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card/60 border border-border/40 text-center">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Notices</div>
                      <div className="text-sm font-mono font-bold text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {currentDigest.stats.unactioned_messages ?? 0}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card/60 border border-border/40 text-center">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Open PRs</div>
                      <div className="text-sm font-mono font-bold text-sky-400 mt-0.5 flex items-center justify-center gap-1">
                        <GitPullRequest className="w-3.5 h-3.5" />
                        {currentDigest.stats.open_pull_requests ?? 0}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card/60 border border-border/40 text-center">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Meetings</div>
                      <div className="text-sm font-mono font-bold text-foreground mt-0.5">
                        {currentDigest.stats.upcoming_events ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Markdown Narrative Rendering */}
                  <div className="prose prose-invert max-w-none text-xs sm:text-sm text-foreground/90 space-y-4 leading-relaxed font-sans">
                    {currentDigest.summary_markdown.split('\n\n').map((paragraph, pIdx) => {
                      if (paragraph.startsWith('### ')) {
                        return (
                          <h4 key={pIdx} className="font-display font-bold text-base text-primary mt-6 mb-2 border-b border-border/30 pb-1">
                            {paragraph.replace('### ', '')}
                          </h4>
                        );
                      }
                      if (paragraph.startsWith('- ')) {
                        return (
                          <ul key={pIdx} className="space-y-1.5 list-disc list-inside text-muted-foreground my-2">
                            {paragraph.split('\n').map((bullet, bIdx) => (
                              <li key={bIdx} className="text-xs sm:text-sm text-foreground/90">
                                <span dangerouslySetInnerHTML={{ __html: bullet.replace(/^- /, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
                              </li>
                            ))}
                          </ul>
                        );
                      }
                      if (/^\d+\.\s/.test(paragraph)) {
                        return (
                          <ol key={pIdx} className="space-y-2 list-decimal list-inside text-foreground/90 my-2">
                            {paragraph.split('\n').map((line, lIdx) => (
                              <li key={lIdx} className="text-xs sm:text-sm">
                                <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
                              </li>
                            ))}
                          </ol>
                        );
                      }
                      return (
                        <p key={pIdx} className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                          <span dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
                        </p>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
