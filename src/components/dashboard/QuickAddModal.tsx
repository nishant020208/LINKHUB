import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  CheckSquare,
  Loader2,
  Sparkles,
  Calendar,
  Clock,
  BookOpen,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { useToastStore } from '@/components/ui/toast';
import { parseNaturalLanguageInput } from '@/lib/smart/quickAddParser';
import { createQuickAddItem } from '@/lib/smart/quickAddService';
import { ItemType } from '@/types';
import { formatDate } from '@/lib/utils';

export const QuickAddModal: React.FC = () => {
  const queryClient = useQueryClient();
  const { isQuickAddOpen, setQuickAddOpen, accounts, addItem } = useAppStore();
  const toast = useToastStore((s) => s.toast);

  // Natural language query input
  const [naturalInput, setNaturalInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced / manual fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [type, setType] = useState<ItemType>('deadline');
  const [dueDate, setDueDate] = useState('');
  const [priorityScore, setPriorityScore] = useState(80);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live natural language parser
  const parsed = useMemo(() => parseNaturalLanguageInput(naturalInput), [naturalInput]);

  // Sync manual form when typing natural text (if advanced hasn't manually overridden yet)
  useEffect(() => {
    if (naturalInput.trim()) {
      setTitle(parsed.cleanTitle);
      setType(parsed.type);
      setPriorityScore(parsed.priorityScore);
      if (parsed.dueDate) {
        // Convert to local datetime-local format: YYYY-MM-DDTHH:mm
        const d = parsed.dueDate;
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formattedLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
          d.getDate()
        )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setDueDate(formattedLocal);
      }
    }
  }, [naturalInput, parsed]);

  if (!isQuickAddOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetTitle = (title.trim() || parsed.cleanTitle || naturalInput).trim();
    if (!targetTitle || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalDue = dueDate ? new Date(dueDate) : parsed.dueDate;

      await createQuickAddItem({
        title: targetTitle,
        description,
        type,
        dueDate: finalDue,
        priorityScore,
        accountId,
        courseName: parsed.courseName,
        accounts,
        queryClient,
        addItemToStore: (newItem) => addItem(newItem),
      });

      toast({
        kind: 'success',
        title: 'Item Created',
        message: `Saved "${targetTitle}" to your command queue.`,
      });

      setNaturalInput('');
      setTitle('');
      setDescription('');
      setDueDate('');
      setQuickAddOpen(false);
    } catch (err: unknown) {
      console.error('Failed to create item:', err);
      toast({
        kind: 'error',
        title: 'Could not create item',
        message: err instanceof Error ? err.message : 'Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) setQuickAddOpen(false);
      }}
    >
      <div className="bg-card border border-border/70 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg text-foreground">
              Quick-Add Task or Deadline
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setQuickAddOpen(false)}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Natural Language Smart Input */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Natural Language Input</span>
              <span className="text-[11px] text-primary/90 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-detects dates, tags & urgency
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={naturalInput}
                onChange={(e) => setNaturalInput(e.target.value)}
                placeholder="e.g. Submit CS4820 problem set Friday at 5pm"
                className="w-full px-4 py-3 rounded-2xl bg-card/60 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              />
            </div>

            {/* Live Parsing Badges */}
            {naturalInput.trim().length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                {parsed.dueDate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 font-mono text-[11px]">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(parsed.dueDate.toISOString())}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/60 text-muted-foreground border border-border/50 font-mono text-[11px] capitalize">
                  <CheckSquare className="w-3 h-3 text-status-connected" />
                  <span>Type: {parsed.type}</span>
                </span>
                {parsed.courseName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-status-syncing/10 text-status-syncing border border-status-syncing/20 font-mono text-[11px]">
                    <BookOpen className="w-3 h-3" />
                    <span>{parsed.courseName}</span>
                  </span>
                )}
                {parsed.priorityScore >= 90 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>High Priority</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Toggle Advanced / Manual Details */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Detailed Controls' : 'Edit Detailed Fields & Account'}</span>
              {showAdvanced ? (
                <ChevronUp className="w-3 h-3 ml-0.5" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-0.5" />
              )}
            </button>
          </div>

          {/* Detailed / Manual Fields */}
          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t border-border/40 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">
                  Title Override
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full px-3 py-2 rounded-xl bg-card/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key notes, links, or instructions..."
                  className="w-full px-3 py-2 rounded-xl bg-card/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1">
                    Target Account
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-card/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {accounts.length === 0 && (
                      <option value="">Personal Tasks (Built-in)</option>
                    )}
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.label} ({acc.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1">
                    Item Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ItemType)}
                    className="w-full px-3 py-2 rounded-xl bg-card/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="deadline">Course Deadline</option>
                    <option value="task">General Task</option>
                    <option value="event">Scheduled Event</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-card/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1">
                    Priority (1-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={priorityScore}
                    onChange={(e) => setPriorityScore(Number(e.target.value) || 70)}
                    className="w-full px-3 py-2 rounded-xl bg-card/60 border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <span className="text-xs font-mono text-muted-foreground">
              Priority: {priorityScore}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!naturalInput.trim() && !title.trim())}
                className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Item</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
