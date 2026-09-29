import { create } from 'zustand';
import { Item, ConnectedAccount, Workspace, DailyBriefing, ItemType } from '@/types';
import { DEMO_ACCOUNTS, DEMO_ITEMS, DEMO_WORKSPACES, DEMO_BRIEFING } from '@/lib/demo-data';

interface AppState {
  activeWorkspaceId: string;
  selectedAccountIds: string[];
  selectedTypes: ItemType[];
  searchQuery: string;
  hideDone: boolean;
  theme: 'dark' | 'light';
  isCommandPaletteOpen: boolean;
  isQuickAddOpen: boolean;

  // Domain data
  accounts: ConnectedAccount[];
  items: Item[];
  workspaces: Workspace[];
  briefing: DailyBriefing | null;
  isSyncing: boolean;
  lastSyncedAt: string;

  // Actions
  setActiveWorkspace: (id: string) => void;
  toggleAccountFilter: (accountId: string) => void;
  toggleTypeFilter: (type: ItemType) => void;
  setSearchQuery: (query: string) => void;
  setHideDone: (hide: boolean) => void;
  toggleTheme: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setQuickAddOpen: (open: boolean) => void;
  markItemDone: (itemId: string, done: boolean) => void;
  snoozeItem: (itemId: string, hours: number) => void;
  addItem: (item: Partial<Item>) => void;
  deleteItem: (itemId: string) => void;
  triggerSync: (accountId?: string) => Promise<void>;
  disconnectAccount: (accountId: string) => void;
  reconnectAccount: (accountId: string) => void;
  wipeAccountData: (accountId: string) => void;
  wipeAllData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeWorkspaceId: 'ws-all',
  selectedAccountIds: [],
  selectedTypes: [],
  searchQuery: '',
  hideDone: false,
  theme: 'dark',
  isCommandPaletteOpen: false,
  isQuickAddOpen: false,

  accounts: DEMO_ACCOUNTS,
  items: DEMO_ITEMS,
  workspaces: DEMO_WORKSPACES,
  briefing: DEMO_BRIEFING,
  isSyncing: false,
  lastSyncedAt: new Date().toISOString(),

  setActiveWorkspace: (id) => {
    const ws = get().workspaces.find((w) => w.id === id);
    if (ws) {
      set({
        activeWorkspaceId: id,
        selectedAccountIds: ws.slug === 'all' ? [] : ws.account_ids,
      });
    }
  },

  toggleAccountFilter: (accountId) => {
    set((state) => {
      const exists = state.selectedAccountIds.includes(accountId);
      return {
        selectedAccountIds: exists
          ? state.selectedAccountIds.filter((id) => id !== accountId)
          : [...state.selectedAccountIds, accountId],
      };
    });
  },

  toggleTypeFilter: (type) => {
    set((state) => {
      const exists = state.selectedTypes.includes(type);
      return {
        selectedTypes: exists
          ? state.selectedTypes.filter((t) => t !== type)
          : [...state.selectedTypes, type],
      };
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setHideDone: (hide) => set({ hideDone: hide }),

  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      }
      return { theme: nextTheme };
    });
  },

  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setQuickAddOpen: (open) => set({ isQuickAddOpen: open }),

  markItemDone: (itemId, done) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? { ...item, is_done: done, updated_at: new Date().toISOString() }
          : item
      ),
    }));
  },

  snoozeItem: (itemId, hours) => {
    const snoozeUntil = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? { ...item, snoozed_until: snoozeUntil, updated_at: new Date().toISOString() }
          : item
      ),
    }));
  },

  addItem: (itemData) => {
    const newItem: Item = {
      id: `item-${Date.now()}`,
      user_id: 'demo-user-1',
      account_id: itemData.account_id || 'acc-1',
      type: itemData.type || 'task',
      title: itemData.title || 'Untitled item',
      description: itemData.description || '',
      due_at: itemData.due_at || null,
      start_at: itemData.start_at || null,
      end_at: itemData.end_at || null,
      url: itemData.url || null,
      source_id: `custom-${Date.now()}`,
      priority_score: itemData.priority_score || 70,
      is_done: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: itemData.metadata || {},
    };
    set((state) => ({ items: [newItem, ...state.items] }));
  },

  deleteItem: (itemId) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    }));
  },

  triggerSync: async (accountId) => {
    set({ isSyncing: true });
    // Simulate real network fetch with smooth completion
    await new Promise((resolve) => setTimeout(resolve, 1100));

    set((state) => {
      const updatedAccounts = state.accounts.map((acc) => {
        if (!accountId || acc.id === accountId) {
          return {
            ...acc,
            status: acc.status === 'error' ? 'error' : ('connected' as const),
            last_synced_at: new Date().toISOString(),
          };
        }
        return acc;
      });

      return {
        isSyncing: false,
        accounts: updatedAccounts,
        lastSyncedAt: new Date().toISOString(),
      };
    });
  },

  disconnectAccount: (accountId) => {
    set((state) => ({
      accounts: state.accounts.map((acc) =>
        acc.id === accountId ? { ...acc, status: 'paused' as const } : acc
      ),
    }));
  },

  reconnectAccount: (accountId) => {
    set((state) => ({
      accounts: state.accounts.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              status: 'connected' as const,
              error_message: null,
              last_synced_at: new Date().toISOString(),
            }
          : acc
      ),
    }));
  },

  wipeAccountData: (accountId) => {
    set((state) => ({
      items: state.items.filter((item) => item.account_id !== accountId),
    }));
  },

  wipeAllData: () => {
    set({
      items: [],
      briefing: null,
    });
  },
}));
