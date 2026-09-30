import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Sun, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface SnoozeModalProps {
  itemId: string | null;
  onClose: () => void;
}

export const SnoozeModal: React.FC<SnoozeModalProps> = ({ itemId, onClose }) => {
  const { snoozeItem, items } = useAppStore();
  const [customHours, setCustomHours] = useState('4');

  useEffect(() => {
    if (!itemId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itemId, onClose]);

  if (!itemId || typeof document === 'undefined') return null;

  const targetItem = items.find((i) => i.id === itemId);

  const handleSnooze = (hours: number) => {
    snoozeItem(itemId, hours);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border/70 rounded-3xl max-w-sm w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-bold text-base text-foreground">Snooze Deadline</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {targetItem && (
          <p className="text-xs text-muted-foreground line-clamp-1 italic">
            &ldquo;{targetItem.title}&rdquo;
          </p>
        )}

        <div className="space-y-2">
          <button
            onClick={() => handleSnooze(3)}
            className="w-full p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-card flex items-center justify-between text-xs text-foreground cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Later today
            </span>
            <span className="font-mono text-muted-foreground">+3 hours</span>
          </button>

          <button
            onClick={() => handleSnooze(24)}
            className="w-full p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-card flex items-center justify-between text-xs text-foreground cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Tomorrow morning
            </span>
            <span className="font-mono text-muted-foreground">+24 hours</span>
          </button>

          <button
            onClick={() => handleSnooze(72)}
            className="w-full p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-card flex items-center justify-between text-xs text-foreground cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              This weekend
            </span>
            <span className="font-mono text-muted-foreground">+3 days</span>
          </button>
        </div>

        <div className="pt-2 border-t border-border/40 flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="168"
            value={customHours}
            onChange={(e) => setCustomHours(e.target.value)}
            className="w-20 px-3 py-1.5 rounded-xl bg-card border border-border text-foreground text-xs font-mono focus:outline-none"
          />
          <span className="text-xs font-mono text-muted-foreground">hours</span>

          <button
            onClick={() => handleSnooze(Number(customHours) || 4)}
            className="ml-auto px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 cursor-pointer"
          >
            Set Custom
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
