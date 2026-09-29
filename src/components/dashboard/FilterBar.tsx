import React from 'react';
import {
  CheckSquare,
  Calendar,
  Mail,
  FileText,
  Filter,
  EyeOff,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { ItemType } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const TYPE_CONFIG: { type: ItemType; label: string; icon: React.ReactNode }[] = [
  { type: 'deadline', label: 'Deadlines', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { type: 'event', label: 'Events', icon: <Calendar className="w-3.5 h-3.5" /> },
  { type: 'email', label: 'Emails', icon: <Mail className="w-3.5 h-3.5" /> },
  { type: 'file', label: 'Files', icon: <FileText className="w-3.5 h-3.5" /> },
];

export const FilterBar: React.FC = () => {
  const {
    accounts,
    selectedAccountIds,
    toggleAccountFilter,
    selectedTypes,
    toggleTypeFilter,
    hideDone,
    setHideDone,
  } = useAppStore();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl glass-panel-subtle border border-border/50 mb-6">
      {/* Account filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-mono text-muted-foreground mr-1 hidden sm:inline">
          Accounts:
        </span>
        {accounts.map((acc) => {
          const isSelected = selectedAccountIds.includes(acc.id);
          return (
            <button
              key={acc.id}
              onClick={() => toggleAccountFilter(acc.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                isSelected
                  ? 'border-sky-500/40 bg-sky-500/10 text-foreground font-semibold shadow-sm'
                  : 'border-border/40 bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/70'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: acc.color }}
              />
              <span>{acc.label}</span>
            </button>
          );
        })}
      </div>

      {/* Type filter buttons & hide done toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/50 border border-border/40">
          {TYPE_CONFIG.map(({ type, label, icon }) => {
            const isSelected = selectedTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleTypeFilter(type)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-card text-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setHideDone(!hideDone)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
            hideDone
              ? 'bg-card border-border text-foreground font-medium'
              : 'border-border/40 bg-card/30 text-muted-foreground hover:text-foreground'
          }`}
          title="Toggle visibility of completed tasks and deadlines"
        >
          {hideDone ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{hideDone ? 'Done hidden' : 'Showing all'}</span>
        </button>
      </div>
    </div>
  );
};
