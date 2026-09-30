import React, { useState } from 'react';
import { X, Plus, CheckSquare } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ItemType } from '@/types';

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, setQuickAddOpen, accounts, addItem } = useAppStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [type, setType] = useState<ItemType>('deadline');
  const [dueDate, setDueDate] = useState('');
  const [priorityScore, setPriorityScore] = useState(80);

  if (!isQuickAddOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addItem({
      title: title.trim(),
      description: description.trim(),
      account_id: accountId || accounts[0]?.id,
      type,
      due_at: dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      priority_score: priorityScore,
    });

    setTitle('');
    setDescription('');
    setQuickAddOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border/70 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-bold text-lg text-foreground">Create Deadline or Task</h3>
          </div>
          <button
            onClick={() => setQuickAddOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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
                className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Item</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
