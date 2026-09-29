import React from 'react';
import { X, Check, Sliders, RotateCcw } from 'lucide-react';

export interface WidgetVisibility {
  hero: boolean;
  deadlines: boolean;
  timeline: boolean;
  emails: boolean;
  pinnedFiles: boolean;
}

interface WidgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: WidgetVisibility;
  onChange: (updated: WidgetVisibility) => void;
  onReset: () => void;
}

export const WidgetSettingsModal: React.FC<WidgetSettingsModalProps> = ({
  isOpen,
  onClose,
  visibility,
  onChange,
  onReset,
}) => {
  if (!isOpen) return null;

  const toggle = (key: keyof WidgetVisibility) => {
    onChange({
      ...visibility,
      [key]: !visibility[key],
    });
  };

  const sections: { key: keyof WidgetVisibility; label: string; desc: string }[] = [
    { key: 'hero', label: 'Right Now & Daily Focus Hero', desc: 'Next meeting, urgent countdown timer, and AI briefing summary.' },
    { key: 'deadlines', label: 'Unified Deadlines Board', desc: 'Overdue, today, and this week coursework grouped with progress.' },
    { key: 'timeline', label: 'Today Events & Focus Windows', desc: 'Combined calendar events on one chronological timeline.' },
    { key: 'emails', label: 'Actionable Inboxes & Smart Bills', desc: 'High priority professor notices, receipts, and flight cards.' },
    { key: 'pinnedFiles', label: 'Pinned Files & Course Syllabi', desc: 'Quick-access cheat sheets, documents, and Figma links.' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f1626] border border-border/70 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-400" />
            <h3 className="font-heading font-bold text-lg text-white">Customize Dashboard Layout</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Show or hide Bento cards to tailor your information density.
        </p>

        <div className="space-y-2.5">
          {sections.map(({ key, label, desc }) => {
            const isVisible = visibility[key];

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isVisible
                    ? 'border-sky-500/50 bg-sky-500/10'
                    : 'border-border/40 bg-card/20 opacity-60 hover:opacity-80'
                }`}
              >
                <div>
                  <h4 className="font-heading font-semibold text-xs text-foreground">{label}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-3 ${
                    isVisible
                      ? 'bg-sky-500 border-sky-500 text-slate-950 font-bold'
                      : 'border-border text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-border/40">
          <button
            onClick={onReset}
            className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
