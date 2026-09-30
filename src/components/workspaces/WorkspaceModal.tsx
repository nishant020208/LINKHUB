import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, Plus, Check } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ItemType } from '@/types';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_TYPES: { type: ItemType; label: string }[] = [
  { type: 'deadline', label: 'Deadlines' },
  { type: 'event', label: 'Calendar Events' },
  { type: 'email', label: 'Emails' },
  { type: 'task', label: 'Tasks' },
  { type: 'file', label: 'Files' },
];

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({ isOpen, onClose }) => {
  const { accounts, workspaces } = useAppStore();
  const [name, setName] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(accounts.map((a) => a.id));
  const [selectedTypes, setSelectedTypes] = useState<ItemType[]>([
    'deadline',
    'event',
    'email',
    'task',
    'file',
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleType = (t: ItemType) => {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newWorkspace = {
      id: `ws-${Date.now()}`,
      user_id: 'demo-user-1',
      name: name.trim(),
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      icon: 'Layers',
      account_ids: selectedAccounts,
      included_types: selectedTypes,
      is_default: false,
    };

    useAppStore.setState({
      workspaces: [...workspaces, newWorkspace],
      activeWorkspaceId: newWorkspace.id,
    });

    setName('');
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border/70 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg text-foreground">Create Custom Workspace</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Master Thesis / Startup / Athletics"
              className="w-full px-3.5 py-2.5 rounded-xl bg-card/60 border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">
              Include Accounts
            </label>
            <div className="space-y-1.5">
              {accounts.map((acc) => {
                const isSelected = selectedAccounts.includes(acc.id);

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => toggleAccount(acc.id)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-border/40 bg-card/20 text-muted-foreground hover:bg-card/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: acc.color }} />
                      <span>{acc.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">
              Included Types
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TYPES.map(({ type, label }) => {
                const isSelected = selectedTypes.includes(type);

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-card/40 border border-border/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Workspace</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
