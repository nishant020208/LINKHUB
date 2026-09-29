import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { ConnectedAccount, Item } from '@/types';
import { useEffect } from 'react';

export interface SyncLogEntry {
  id: string;
  account_id: string;
  data_type: string;
  status: 'success' | 'partial_error' | 'failed';
  items_fetched: number;
  items_upserted: number;
  error_message: string | null;
  started_at: string;
  finished_at: string;
  created_at: string;
}

export function useSyncData() {
  const queryClient = useQueryClient();
  const { setSyncState, setAccounts, setItems } = useAppStore();

  // 1. Query Connected Accounts
  const accountsQuery = useQuery({
    queryKey: ['connected_accounts'],
    queryFn: async (): Promise<ConnectedAccount[]> => {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch connected accounts from Supabase:', error.message);
        return [];
      }
      return (data || []) as ConnectedAccount[];
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refresh every minute
  });

  // 2. Query Unified Items
  const itemsQuery = useQuery({
    queryKey: ['items'],
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('priority_score', { ascending: false });

      if (error) {
        console.warn('Failed to fetch items from Supabase:', error.message);
        return [];
      }
      return (data || []) as Item[];
    },
    staleTime: 1000 * 20,
    refetchInterval: 1000 * 45,
  });

  // 3. Query Detailed Sync Logs
  const syncLogsQuery = useQuery({
    queryKey: ['sync_logs'],
    queryFn: async (): Promise<SyncLogEntry[]> => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.warn('Failed to fetch sync logs:', error.message);
        return [];
      }
      return (data || []) as SyncLogEntry[];
    },
    staleTime: 1000 * 15,
  });

  // Sync with Zustand Store whenever queries succeed
  useEffect(() => {
    if (accountsQuery.data) {
      setAccounts(accountsQuery.data);
    }
  }, [accountsQuery.data, setAccounts]);

  useEffect(() => {
    if (itemsQuery.data) {
      setItems(itemsQuery.data);
    }
  }, [itemsQuery.data, setItems]);

  // 4. Real Sync Mutation calling Edge Function
  const syncMutation = useMutation({
    mutationFn: async (accountId?: string) => {
      setSyncState(true);

      const accountsToSync = accountId
        ? [{ id: accountId }]
        : accountsQuery.data || [];

      if (accountsToSync.length === 0) {
        throw new Error('No connected accounts available to sync.');
      }

      const results = [];
      for (const acc of accountsToSync) {
        console.log(`[Sync] Invoking sync-provider Edge Function for ${acc.id}...`);
        const { data, error } = await supabase.functions.invoke('sync-provider', {
          body: { accountId: acc.id },
        });

        if (error) {
          console.error('[Sync Edge Function Error]:', error);
          results.push({ accountId: acc.id, success: false, error: error.message });
        } else {
          results.push({ accountId: acc.id, success: true, data });
        }
      }

      return results;
    },
    onSettled: () => {
      setSyncState(false);
      // Invalidate queries so UI immediately re-renders with fresh data
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['connected_accounts'] });
      queryClient.invalidateQueries({ queryKey: ['sync_logs'] });
    },
  });

  // 5. Scheduled Sync every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (accountsQuery.data && accountsQuery.data.length > 0 && !syncMutation.isPending) {
        console.log('[Scheduled Sync] Triggering 15-minute recurring sync pipeline...');
        syncMutation.mutate();
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accountsQuery.data, syncMutation]);

  return {
    accounts: accountsQuery.data || [],
    items: itemsQuery.data || [],
    syncLogs: syncLogsQuery.data || [],
    isLoading: accountsQuery.isLoading || itemsQuery.isLoading,
    isSyncing: syncMutation.isPending,
    syncError: syncMutation.error ? (syncMutation.error as Error).message : null,
    triggerSync: (accountId?: string) => syncMutation.mutateAsync(accountId),
    refetchAll: () => {
      accountsQuery.refetch();
      itemsQuery.refetch();
      syncLogsQuery.refetch();
    },
  };
}
