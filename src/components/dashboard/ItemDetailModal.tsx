import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  ExternalLink,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  MessageSquare,
  Paperclip,
  Download,
  FileText,
  Eye,
  AlertCircle,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { ItemContent, ItemAttachment, ItemComment } from '@/types';
import { ProviderLogo } from '@/components/ui/provider-logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTimeAgo, formatDate, cn } from '@/lib/utils';

// Regex pattern to detect dates and deadlines from body text
const DATE_DETECTION_PATTERNS = [
  /(?:due(?:\s+by|\s+on|\s+date)?:?\s*)([A-Z][a-z]{2,8}\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|tomorrow|today|tonight|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
  /(?:deadline:?\s*)([A-Z][a-z]{2,8}\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
  /(?:exam|midterm|quiz|final)\s+(?:on\s+)?([A-Z][a-z]{2,8}\s+\d{1,2})/i,
];

export const ItemDetailModal: React.FC = () => {
  const { activeItemId, setActiveItemId, items, accounts, markItemDone } = useAppStore();
  const reduce = useReducedMotion();

  const item = useMemo(() => items.find((i) => i.id === activeItemId), [items, activeItemId]);
  const account = useMemo(() => (item ? accounts.find((a) => a.id === item.account_id) : null), [accounts, item]);

  const [content, setContent] = useState<ItemContent | null>(null);
  const [attachments, setAttachments] = useState<ItemAttachment[]>([]);
  const [comments, setComments] = useState<ItemComment[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  // Load content, attachments, comments from Supabase when an item opens
  useEffect(() => {
    if (!item?.id) {
      setContent(null);
      setAttachments([]);
      setComments([]);
      setSignedUrls({});
      return;
    }

    let isCancelled = false;
    setLoading(true);

    const loadData = async () => {
      try {
        const [contentRes, attRes, commRes] = await Promise.all([
          supabase.from('item_contents').select('*').eq('item_id', item.id).maybeSingle(),
          supabase.from('item_attachments').select('*').eq('item_id', item.id),
          supabase.from('item_comments').select('*').eq('item_id', item.id).order('created_at', { ascending: true }),
        ]);

        if (isCancelled) return;

        if (contentRes.data) setContent(contentRes.data);
        if (attRes.data) {
          setAttachments(attRes.data);
          // Generate signed URLs for attachments in storage bucket
          const urls: Record<string, string> = {};
          for (const att of attRes.data) {
            if (att.storage_path) {
              const { data: urlData } = await supabase.storage
                .from('unifyhub-content')
                .createSignedUrl(att.storage_path, 3600);
              if (urlData?.signedUrl) {
                urls[att.id] = urlData.signedUrl;
              }
            } else if (att.external_url) {
              urls[att.id] = att.external_url;
            }
          }
          if (!isCancelled) setSignedUrls(urls);
        }
        if (commRes.data) setComments(commRes.data);
      } catch (err) {
        console.error('Error fetching item details:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [item?.id]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveItemId(null);
    };
    if (activeItemId) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeItemId, setActiveItemId]);

  // Detect dates from full text
  const detectedDate = useMemo(() => {
    const text = `${item?.title ?? ''} ${content?.body_text ?? item?.description ?? ''}`;
    for (const pattern of DATE_DETECTION_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  }, [item?.title, item?.description, content?.body_text]);

  const handleCopyLink = () => {
    if (item?.url) {
      navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddLocalComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !item) return;

    const newComment: ItemComment = {
      id: `comm-local-${Date.now()}`,
      item_id: item.id,
      user_id: item.user_id,
      account_id: item.account_id,
      author_name: 'You',
      body: newCommentText.trim(),
      created_at: new Date().toISOString(),
    };

    setComments((prev) => [...prev, newComment]);
    setNewCommentText('');

    supabase
      .from('item_comments')
      .insert({
        item_id: item.id,
        user_id: item.user_id,
        account_id: item.account_id,
        author_name: 'You',
        body: newComment.body,
        created_at: newComment.created_at,
      })
      .then(({ error }) => {
        if (error) console.warn('Could not persist comment:', error.message);
      });
  };

  if (!item) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.01 : 0.2 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-md"
          onClick={() => setActiveItemId(null)}
          aria-hidden="true"
        />

        {/* Modal Window */}
        <motion.div
          initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: reduce ? 0.01 : 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge tone="accent" className="capitalize">
                {item.type}
              </Badge>

              {account && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-border/60"
                  style={{ backgroundColor: `${account.color}15`, color: account.color }}
                >
                  <ProviderLogo provider={account.provider} className="w-3.5 h-3.5" />
                  <span className="font-semibold">{account.label}</span>
                </span>
              )}

              {content?.sync_status === 'too_large' && (
                <Badge tone="warning" icon={<AlertCircle className="w-3 h-3" />}>
                  Oversized ({content.skip_reason || 'File exceeds 10MB limit'})
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {item.url && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleCopyLink}
                  title="Copy provider URL"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              )}

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in {account?.provider ? account.provider.toUpperCase() : 'Source'}</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setActiveItemId(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ml-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Title and Metadata Strip */}
          <div className="p-6 border-b border-border/40 space-y-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => markItemDone(item.id, !item.is_done)}
                className="mt-1 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                title={item.is_done ? 'Mark incomplete' : 'Mark complete'}
              >
                {item.is_done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <h2
                  className={cn(
                    'font-display font-bold text-xl sm:text-2xl text-foreground leading-snug',
                    item.is_done && 'line-through text-muted-foreground'
                  )}
                >
                  {item.title}
                </h2>
              </div>
            </div>

            {/* Metadata Tags */}
            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground flex-wrap pt-1">
              {item.due_at && (
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due: {formatDate(item.due_at)}</span>
                </div>
              )}

              {item.start_at && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDate(item.start_at)}</span>
                </div>
              )}

              {item.metadata?.sender && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">From:</span>
                  <span>{item.metadata.sender}</span>
                </div>
              )}

              {item.metadata?.repository && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">Repo:</span>
                  <span>{item.metadata.repository}</span>
                </div>
              )}

              {item.metadata?.project && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">Project:</span>
                  <span>{item.metadata.project}</span>
                </div>
              )}

              <div className="text-muted-foreground/60">
                Synced {formatTimeAgo(item.updated_at || item.created_at)}
              </div>
            </div>

            {/* Smart Date Detection Bar */}
            {detectedDate && !item.due_at && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Detected deadline in body text:{' '}
                    <strong className="underline underline-offset-2">{detectedDate}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* View Mode Toggle for rich text vs raw */}
            {(content?.body_html || content?.body_markdown) && (
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Original Content
                </span>
                <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/40">
                  <button
                    type="button"
                    onClick={() => setViewMode('formatted')}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-lg transition-colors',
                      viewMode === 'formatted'
                        ? 'bg-card text-foreground shadow-sm font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Formatted
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('raw')}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-lg transition-colors',
                      viewMode === 'raw'
                        ? 'bg-card text-foreground shadow-sm font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Plain Text
                  </button>
                </div>
              </div>
            )}

            {/* Main Content Rendering */}
            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-muted-foreground space-y-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Loading full synchronized content...</p>
              </div>
            ) : content?.body_html && viewMode === 'formatted' ? (
              <div
                className="prose prose-invert max-w-none text-sm text-foreground/90 leading-relaxed bg-background/40 p-4 rounded-2xl border border-border/40 overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: content.body_html }}
              />
            ) : content?.body_markdown || content?.body_text || item.description ? (
              <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans bg-background/40 p-4 rounded-2xl border border-border/40 overflow-x-auto">
                {content?.body_markdown || content?.body_text || item.description}
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-mono text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/50">
                No description or body content available for this item.
              </div>
            )}

            {/* Inline Attachments / Files */}
            {attachments.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm text-foreground">
                    Stored Attachments & Files ({attachments.length})
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((att) => {
                    const downloadUrl = signedUrls[att.id] || att.external_url;
                    const isImg = att.mime_type?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(att.name);

                    return (
                      <div
                        key={att.id}
                        className="p-3.5 rounded-2xl bg-card/60 border border-border/60 hover:border-primary/40 transition-colors flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                            {isImg ? <Eye className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {att.name}
                            </p>
                            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              {att.size_bytes > 0
                                ? `${Math.round(att.size_bytes / 1024)} KB`
                                : att.storage_path
                                ? 'Encrypted Blob'
                                : 'Cloud File'}
                            </p>
                          </div>
                        </div>

                        {/* Inline Image Preview */}
                        {isImg && downloadUrl && (
                          <div className="rounded-xl overflow-hidden max-h-48 border border-border/40 bg-black/20">
                            <img
                              src={downloadUrl}
                              alt={att.name}
                              className="w-full h-full object-cover object-center"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {downloadUrl && (
                          <a
                            href={downloadUrl}
                            download={att.name}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-muted/60 hover:bg-muted text-foreground transition-colors w-full"
                          >
                            <Download className="w-3.5 h-3.5 text-primary" />
                            <span>Download File</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comments Thread */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">
                  Comments & Activity ({comments.length})
                </h4>
              </div>

              {comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-card/60 border border-border/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {c.author_avatar ? (
                            <img
                              src={c.author_avatar}
                              alt={c.author_name || 'User'}
                              className="w-4 h-4 rounded-full"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[9px]">
                              {(c.author_name || 'U')[0]}
                            </div>
                          )}
                          <span className="font-semibold text-foreground">
                            {c.author_name || 'Author'}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {formatTimeAgo(c.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed pl-6">
                        {c.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-mono">No comments synced yet.</p>
              )}

              {/* Add Comment Form */}
              <form onSubmit={handleAddLocalComment} className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Add a comment or note..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" variant="primary" size="xs" disabled={!newCommentText.trim()}>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </Button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
