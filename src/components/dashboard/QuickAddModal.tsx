import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, CheckSquare, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { useToastStore } from '@/components/ui/toast';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { queryKeys } from '@/lib/queryKeys';
import { ItemType, Item } from '@/types';

export const QuickAddModal: React.FC = () => {
  const queryClient = useQueryClient();
  const { isQuickAddOpen, setQuickAddOpen, accounts, addItem } = useAppStore();
  const toast = useToastStore((s) => s.toast);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [type, setType] = useState<ItemType>('deadline');
  const [dueDate, setDueDate] = useState('');
  const [priorityScore, setPriorityScore] = useState(80);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isQuickAddOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalTitle = title.trim();
      const finalDesc = description.trim();
      const finalDue = dueDate
        ? new Date(dueDate).toISOString()
        : new Date(Date.now() + 24 * 3600 * 1000).toISOString();

      let targetAccountId = accountId || (accounts.length > 0 ? accounts[0].id : '');

      if (env.isConfigured.supabase) {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        if (user) {
          // If no linked account exists or targetAccountId is empty, ensure personal account exists
          if (!targetAccountId) {
            const { data: existingAcc } = await supabase
              .from('connected_accounts')
              .select('id')
              .eq('user_id', user.id)
              .eq('provider', 'personal')
              .maybeSingle();

            if (existingAcc?.id) {
              targetAccountId = existingAcc.id;
            } else {
              const { data: createdAcc, error: createAccErr } = await supabase
                .from('connected_accounts')
                .insert({
                  user_id: user.id,
                  provider: 'personal',
                  email: user.email || 'personal@unifyhub.local',
                  label: 'Personal Tasks',
                  color: '#e8a54b',
                  status: 'connected',
                })
                .select('id')
                .single();

              if (createAccErr) {
                console.warn('Could not auto-create personal connected_account:', createAccErr.message);
              } else if (createdAcc?.id) {
                targetAccountId = createdAcc.id;
                queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
              }
            }
          }

          if (targetAccountId) {
            const { data: insertedItem, error: insertErr } = await supabase
              .from('items')
              .insert({
                user_id: user.id,
                account_id: targetAccountId,
                type,
                title: finalTitle,
                description: finalDesc || null,
                due_at: finalDue,
                priority_score: priorityScore,
                source_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                is_done: false,
                metadata: { created_manually: true },
              })
              .select()
              .single();

            if (insertErr) {
              throw new Error(insertErr.message);
            }

            if (insertedItem) {
              addItem(insertedItem as Item);
              queryClient.invalidateQueries({ queryKey: queryKeys.items });
            }
          }
        } else {
          // Local offline fallback
          addItem({
            title: finalTitle,
            description: finalDesc,
            account_id: targetAccountId || 'acc-1',
            type,
            due_at: finalDue,
            priority_score: priorityScore,
          });
        }
      } else {
        // Supabase not configured: local store only
        addItem({
          title: finalTitle,
          description: finalDesc,
          account_id: targetAccountId || 'acc-1',
          type,
          due_at: finalDue,
          priority_score: priorityScore,
        });
      }

      toast({
        kind: 'success',
        title: 'Item Created',
        message: `Saved "${finalTitle}" to your active list.`,
      });

      setTitle('');
      setDescription('');
      setDueDate('');
      setQuickAddOpen(false);
    } catch (err) {
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
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card border border-border/70 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg text-foreground">Create Deadline or Task</h3>
          </div>
          <button
            type="button"
            onClick={() => setQuickAddOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CS 4410 Problem Set 4 / Staging Release"
              className="w-full px-3.5 py-2.5 rounded-xl bg-card/60 border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1">Description (optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key notes, links, or submission instructions..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-card/60 border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">Target Account</label>
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
              <label className="block text-xs font-mono text-muted-foreground mb-1">Item Type</label>
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
              <label className="block text-xs font-mono text-muted-foreground mb-1">Due Date & Time</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-card/60 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">Priority (1-100)</label>
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

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <span className="text-xs font-mono text-muted-foreground">Priority Score: {priorityScore}</span>
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
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Item</span>
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
