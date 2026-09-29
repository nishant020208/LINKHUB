import { create } from 'zustand';
import { Item, ConnectedAccount, Workspace, DailyBriefing, ItemType, NotificationPreferences } from '@/types';

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  channels: {
    email: true,
    web_push: true,
    telegram: false,
    sms: false,
    whatsapp: false,
  },
  targets: {
    emailAddress: 'alex.chen@mit.edu',
    telegramChatId: '@alex_chen_dev',
    phoneNumber: '+1 (555) 234-5678',
    whatsappNumber: '+1 (555) 234-5678',
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
    allowCritical: true,
  },
  frequency: 'immediate',
};

interface AppState {
  activeWorkspaceId: string;
  selectedAccountIds: string[];
  selectedTypes: ItemType[];
  searchQuery: string;
  hideDone: boolean;
  theme: 'dark' | 'light';
  isCommandPaletteOpen: boolean;
  isQuickAddOpen: boolean;
  isNotificationModalOpen: boolean;

  // Domain data
  accounts: ConnectedAccount[];
  items: Item[];
  workspaces: Workspace[];
  briefing: DailyBriefing | null;
  isSyncing: boolean;
  lastSyncedAt: string;
  notificationPreferences: NotificationPreferences;

  // Actions
  setActiveWorkspace: (id: string) => void;
  toggleAccountFilter: (accountId: string) => void;
  toggleTypeFilter: (type: ItemType) => void;
  setSearchQuery: (query: string) => void;
  setHideDone: (hide: boolean) => void;
  toggleTheme: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setQuickAddOpen: (open: boolean) => void;
  setNotificationModalOpen: (open: boolean) => void;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
  markItemDone: (itemId: string, done: boolean) => void;
  snoozeItem: (itemId: string, hours: number) => void;
  addItem: (item: Partial<Item>) => void;
  deleteItem: (itemId: string) => void;
  triggerSync: (accountId?: string) => Promise<void>;
  addAccount: (account: ConnectedAccount) => void;
  toggleAccountSyncType: (accountId: string, type: ItemType) => void;
  disconnectAccount: (accountId: string) => void;
  reconnectAccount: (accountId: string) => void;
  wipeAccountData: (accountId: string) => void;
  wipeAllData: () => void;
}

const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: 'ws-all',
    user_id: 'user-default',
    name: 'All Items',
    slug: 'all',
    icon: 'Layers',
    account_ids: [],
    included_types: ['email', 'event', 'deadline', 'task', 'file'],
    is_default: true,
  },
  {
    id: 'ws-college',
    user_id: 'user-default',
    name: 'College',
    slug: 'college',
    icon: 'GraduationCap',
    account_ids: [],
    included_types: ['event', 'deadline', 'task', 'file'],
    is_default: false,
  },
  {
    id: 'ws-work',
    user_id: 'user-default',
    name: 'Work',
    slug: 'work',
    icon: 'Briefcase',
    account_ids: [],
    included_types: ['email', 'event', 'deadline', 'task'],
    is_default: false,
  },
  {
    id: 'ws-personal',
    user_id: 'user-default',
    name: 'Personal',
    slug: 'personal',
    icon: 'User',
    account_ids: [],
    included_types: ['email', 'event', 'task'],
    is_default: false,
  },
];

export const useAppStore = create<AppState>((set, get) => ({
  activeWorkspaceId: 'ws-all',
  selectedAccountIds: [],
  selectedTypes: [],
  searchQuery: '',
  hideDone: false,
  theme: 'dark',
  isCommandPaletteOpen: false,
  isQuickAddOpen: false,
  isNotificationModalOpen: false,

  accounts: [],
  items: [],
  workspaces: INITIAL_WORKSPACES,
  briefing: null,
  isSyncing: false,
  lastSyncedAt: new Date().toISOString(),
  notificationPreferences: DEFAULT_NOTIFICATION_PREFS,

  setNotificationModalOpen: (open) => set({ isNotificationModalOpen: open }),
  updateNotificationPreferences: (prefs) =>
    set((state) => ({
      notificationPreferences: {
        ...state.notificationPreferences,
        ...prefs,
        channels: { ...state.notificationPreferences.channels, ...prefs.channels },
        targets: { ...state.notificationPreferences.targets, ...prefs.targets },
        quietHours: { ...state.notificationPreferences.quietHours, ...prefs.quietHours },
      },
    })),

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
      const updatedAccounts: ConnectedAccount[] = state.accounts.map((acc) => {
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

  addAccount: (account) => {
    set((state) => ({
      accounts: [account, ...state.accounts],
    }));
  },

  toggleAccountSyncType: (accountId, type) => {
    set((state) => ({
      accounts: state.accounts.map((acc) => {
        if (acc.id !== accountId) return acc;
        const currentTypes = acc.sync_enabled_types || ['email', 'event', 'deadline', 'task', 'file'];
        const nextTypes = currentTypes.includes(type)
          ? currentTypes.filter((t) => t !== type)
          : [...currentTypes, type];
        return { ...acc, sync_enabled_types: nextTypes };
      }),
    }));
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
