import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckSquare,
  Calendar,
  Mail,
  FileText,
  RefreshCw,
  Sun,
  Moon,
  ShieldCheck,
  Sliders,
  Plus,
  ArrowRight,
  Layers,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useSyncData } from '@/hooks/useSyncData';
import { useNavigate } from 'react-router-dom';

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    items,
    workspaces,
    setActiveWorkspace,
    toggleTheme,
    theme,
    setQuickAddOpen,
  } = useAppStore();
  const { triggerSync } = useSyncData();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Aggregate searchable entries
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();

    // 1. Actions
    const staticActions = [
      {
        id: 'act-sync',
        category: 'Quick Actions',
        title: 'Sync All Accounts Now',
        icon: <RefreshCw className="w-4 h-4 text-primary" />,
        action: () => triggerSync(),
      },
      {
        id: 'act-add',
        category: 'Quick Actions',
        title: 'Create New Deadline or Task',
        icon: <Plus className="w-4 h-4 text-emerald-400" />,
        action: () => setQuickAddOpen(true),
      },
      {
        id: 'act-theme',
        category: 'Quick Actions',
        title: `Switch Theme to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-sky-400" />,
        action: () => toggleTheme(),
      },
      {
        id: 'act-calendar',
        category: 'Navigation',
        title: 'Go to Unified Calendar (Day / Week / Agenda)',
        icon: <Calendar className="w-4 h-4 text-sky-400" />,
        action: () => navigate('/calendar'),
      },
      {
        id: 'act-integrations',
        category: 'Navigation',
        title: 'Go to Integrations & Accounts Hub',
        icon: <Sliders className="w-4 h-4 text-indigo-400" />,
        action: () => navigate('/integrations'),
      },
      {
        id: 'act-privacy',
        category: 'Navigation',
        title: 'Go to Privacy & Data Transparency',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        action: () => navigate('/privacy'),
      },
    ];

    // 2. Workspaces
    const workspaceActions = workspaces.map((ws) => ({
      id: `ws-${ws.id}`,
      category: 'Workspaces',
      title: `Switch to "${ws.name}" Workspace`,
      icon: <Layers className="w-4 h-4 text-amber-400" />,
      action: () => {
        setActiveWorkspace(ws.id);
        navigate('/');
      },
    }));

    // 3. Synced Items
    const itemActions = items.map((item) => {
      let icon = <CheckSquare className="w-4 h-4 text-primary" />;
      if (item.type === 'event') icon = <Calendar className="w-4 h-4 text-sky-400" />;
      if (item.type === 'email') icon = <Mail className="w-4 h-4 text-indigo-400" />;
      if (item.type === 'file') icon = <FileText className="w-4 h-4 text-amber-400" />;

      return {
        id: `item-${item.id}`,
        category: item.type.toUpperCase() + 'S',
        title: item.title,
        subtitle: item.description || item.metadata?.course_name || '',
        icon,
        action: () => {
          if (item.url) window.open(item.url, '_blank');
        },
      };
    });

    const all = [...staticActions, ...workspaceActions, ...itemActions];

    if (!q) return all.slice(0, 12);

    return all.filter((entry) => {
      return (
        entry.title.toLowerCase().includes(q) ||
        (entry as { subtitle?: string }).subtitle?.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q)
      );
    }).slice(0, 16);
  }, [items, workspaces, query, theme, navigate, setActiveWorkspace, triggerSync, toggleTheme, setQuickAddOpen]);

  if (!isCommandPaletteOpen) return null;

  const handleSelect = (idx: number) => {
    const entry = results[idx];
    if (entry) {
      entry.action();
      setCommandPaletteOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-[12vh] px-3 sm:px-4">
      <div className="bg-card border border-border/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-border/40 flex items-center gap-3">
          <Search className="w-5 h-5 text-primary shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search deadlines, events, files..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching commands or items found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((entry, idx) => {
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={entry.id}
                  onClick={() => handleSelect(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-card/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-card/60 border border-border/40 shrink-0">
                      {entry.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">
                        {entry.title}
                      </div>
                      {(entry as { subtitle?: string }).subtitle && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {(entry as { subtitle?: string }).subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {entry.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Keyboard hints footer */}
        <div className="px-4 py-2 bg-muted/40 border-t border-border/30 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; navigate</span>
            <span>&crarr; select</span>
            <span>esc dismiss</span>
          </div>
          <span>UnifyHub Omnibox</span>
        </div>
      </div>
    </div>
  );
};
