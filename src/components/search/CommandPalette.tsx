import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
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
  Sparkles,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { useToastStore } from '@/components/ui/toast';
import { useSyncData } from '@/hooks/useSyncData';
import { useNavigate } from 'react-router-dom';
import { parseNaturalLanguageInput } from '@/lib/smart/quickAddParser';
import { createQuickAddItem } from '@/lib/smart/quickAddService';
import { formatDate } from '@/lib/utils';

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isCommandPaletteOpen) setQuery('');
  }, [isCommandPaletteOpen]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();

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
        icon: <Plus className="w-4 h-4 text-status-connected" />,
        action: () => setQuickAddOpen(true),
      },
      {
        id: 'act-theme',
        category: 'Quick Actions',
        title: `Switch Theme to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        icon: theme === 'dark' ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />,
        action: () => toggleTheme(),
      },
      {
        id: 'act-calendar',
        category: 'Navigation',
        title: 'Go to Unified Calendar (Day / Week / Agenda)',
        icon: <Calendar className="w-4 h-4 text-status-syncing" />,
        action: () => navigate('/calendar'),
      },
      {
        id: 'act-integrations',
        category: 'Navigation',
        title: 'Go to Integrations & Accounts Hub',
        icon: <Sliders className="w-4 h-4 text-primary" />,
        action: () => navigate('/integrations'),
      },
      {
        id: 'act-privacy',
        category: 'Navigation',
        title: 'Go to Privacy & Data Transparency',
        icon: <ShieldCheck className="w-4 h-4 text-status-connected" />,
        action: () => navigate('/privacy'),
      },
    ];

    const workspaceActions = workspaces.map((ws) => ({
      id: `ws-${ws.id}`,
      category: 'Workspaces',
      title: `Switch to "${ws.name}" Workspace`,
      icon: <Layers className="w-4 h-4 text-primary" />,
      action: () => {
        setActiveWorkspace(ws.id);
        navigate('/dashboard');
      },
    }));

    const itemActions = items.map((item) => {
      let icon = <CheckSquare className="w-4 h-4 text-primary" />;
      if (item.type === 'event') icon = <Calendar className="w-4 h-4 text-status-syncing" />;
      if (item.type === 'email') icon = <Mail className="w-4 h-4 text-primary" />;
      if (item.type === 'file') icon = <FileText className="w-4 h-4 text-status-warning" />;

      return {
        id: `item-${item.id}`,
        category: item.type.toUpperCase() + 'S',
        title: item.title,
        subtitle: item.description || item.metadata?.course_name || '',
        icon,
        action: () => {
          useAppStore.getState().setActiveItemId(item.id);
        },
      };
    });

    const all = [...staticActions, ...workspaceActions, ...itemActions];

    if (!q) return all.slice(0, 12);

    const matches = all.filter((entry) => {
      return (
        entry.title.toLowerCase().includes(q) ||
        (entry as { subtitle?: string }).subtitle?.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q)
      );
    });

    // If query has at least 2 characters, provide instant Natural Language Quick-Add option
    if (query.trim().length >= 2) {
      const parsed = parseNaturalLanguageInput(query);
      const dateLabel = parsed.dueDate ? ` · Due ${formatDate(parsed.dueDate.toISOString())}` : '';

      const nlOption = {
        id: 'act-nl-create',
        category: 'Quick-Add via Natural Language',
        title: `Add ${parsed.type.toUpperCase()}: "${parsed.cleanTitle}"${dateLabel}`,
        subtitle: 'Press Enter to create with detected deadline and course tag',
        icon: <Sparkles className="w-4 h-4 text-primary" />,
        action: async () => {
          try {
            await createQuickAddItem({
              title: parsed.cleanTitle,
              type: parsed.type,
              dueDate: parsed.dueDate,
              priorityScore: parsed.priorityScore,
              courseName: parsed.courseName,
              accounts: useAppStore.getState().accounts,
              queryClient,
              addItemToStore: (newItem) => useAppStore.getState().addItem(newItem),
            });
            useToastStore.getState().toast({
              kind: 'success',
              title: 'Item Created',
              message: `Saved "${parsed.cleanTitle}" to active items.`,
            });
          } catch (err: unknown) {
            useToastStore.getState().toast({
              kind: 'error',
              title: 'Error creating item',
              message: err instanceof Error ? err.message : 'Failed to save item',
            });
          }
        },
      };

      return [nlOption, ...matches.slice(0, 15)];
    }

    return matches.slice(0, 16);
  }, [items, workspaces, query, theme, navigate, setActiveWorkspace, triggerSync, toggleTheme, setQuickAddOpen, queryClient]);

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
      setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <motion.div
          className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-md flex items-stretch sm:items-start justify-center sm:pt-[10vh] p-0 sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.12 : 0.18 }}
          onClick={() => setCommandPaletteOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.94 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            transition={reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 380, damping: 26, mass: 0.85 }}
            className="bg-card border-0 sm:border border-border/80 rounded-none sm:rounded-2xl w-full sm:max-w-2xl h-full sm:h-auto shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-4 sm:p-4 border-b border-border/40 flex items-center gap-3 min-h-[56px]">
              <Search className="w-5 h-5 text-primary shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search deadlines, events, files..."
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-base sm:text-sm focus:outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(false)}
                className="p-2 min-w-[44px] min-h-[44px] rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors inline-flex items-center justify-center"
                aria-label="Close command palette"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 max-h-none sm:max-h-96 overflow-y-auto p-2 space-y-1">
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
                      type="button"
                      onClick={() => handleSelect(idx)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full p-3 sm:p-2.5 min-h-[48px] rounded-xl text-left flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-card/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-lg bg-card/60 border border-border/40 shrink-0">
                          {entry.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm sm:text-xs font-medium text-foreground truncate">
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
                        <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {entry.category}
                        </span>
                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2 bg-muted/40 border-t border-border/30 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <div className="hidden sm:flex items-center gap-3">
                <span>&uarr;&darr; navigate</span>
                <span>&crarr; select</span>
                <span>esc dismiss</span>
              </div>
              <span className="sm:hidden">tap to select</span>
              <span>UnifyHub Omnibox</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
