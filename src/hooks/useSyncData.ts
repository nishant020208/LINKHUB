import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useToastStore } from '@/components/ui/toast';
import { queryKeys } from '@/lib/queryKeys';
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
  const toast = useToastStore((s) => s.toast);

  // 1. Connected accounts — read under the user's session so RLS scopes to auth.uid()
  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: async (): Promise<ConnectedAccount[]> => {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch connected accounts:', error.message);
        return [];
      }
      return (data || []) as ConnectedAccount[];
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  // 2. Unified items
  const itemsQuery = useQuery({
    queryKey: queryKeys.items,
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('priority_score', { ascending: false })
        .limit(500);

      if (error) {
        console.warn('Failed to fetch items:', error.message);
        return [];
      }
      return (data || []) as Item[];
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  // 3. Per-stream sync logs
  const syncLogsQuery = useQuery({
    queryKey: queryKeys.syncLogs,
    queryFn: async (): Promise<SyncLogEntry[]> => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Failed to fetch sync logs:', error.message);
        return [];
      }
      return (data || []) as SyncLogEntry[];
    },
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });

  // Mirror server state into the Zustand store for the widgets
  useEffect(() => {
    if (accountsQuery.data) setAccounts(accountsQuery.data);
  }, [accountsQuery.data, setAccounts]);

  useEffect(() => {
    if (itemsQuery.data) setItems(itemsQuery.data);
  }, [itemsQuery.data, setItems]);

  // 4. Real sync mutation: dispatches every account to the sync-provider
  //    Edge Function, which routes to the per-provider sync function.
  const syncMutation = useMutation({
    mutationFn: async (accountId?: string) => {
      setSyncState(true);

      // Paused accounts (including retired providers) are intentionally not synced.
      const allAccounts = accountsQuery.data ?? [];
      const accountsToSync = accountId
        ? allAccounts.filter((a) => a.id === accountId)
        : allAccounts.filter((a) => a.status !== 'paused');

      if (accountsToSync.length === 0) {
        throw new Error('No connected accounts available to sync.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const results: { accountId: string; ok: boolean; upserted: number; error?: string }[] = [];

      for (const acc of accountsToSync) {
        try {
          const { data, error } = await supabase.functions.invoke('sync-provider', {
            body: { accountId: acc.id },
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          });
          if (error) {
            results.push({ accountId: acc.id, ok: false, upserted: 0, error: error.message });
          } else if (data?.error) {
            results.push({ accountId: acc.id, ok: false, upserted: 0, error: String(data.error) });
          } else {
            results.push({ accountId: acc.id, ok: Boolean(data?.success ?? true), upserted: Number(data?.totalUpserted ?? 0) });
          }
        } catch (e) {
          results.push({ accountId: acc.id, ok: false, upserted: 0, error: e instanceof Error ? e.message : String(e) });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const total = results.reduce((acc, r) => acc + r.upserted, 0);
      const failures = results.filter((r) => !r.ok);
      if (failures.length === results.length && results.length > 0) {
        toast({
          kind: 'error',
          title: 'Sync failed',
          message: failures[0].error ?? 'All providers returned errors. Check the Sync Status panel.',
        });
      } else if (total > 0) {
        toast({
          kind: 'success',
          title: 'Sync complete',
          message: `${total} item${total === 1 ? '' : 's'} upserted across ${results.length} account${results.length === 1 ? '' : 's'}.`,
        });
      } else if (failures.length === 0) {
        toast({ kind: 'info', title: 'Sync complete', message: 'No new items found — streams are up to date.' });
      }
    },
    onError: (err) => {
      toast({
        kind: 'error',
        title: 'Sync error',
        message: err instanceof Error ? err.message : 'Unknown sync failure',
      });
    },
    onSettled: () => {
      setSyncState(false);
      // Invalidate with the exact canonical keys so the UI refetches fresh rows.
      queryClient.invalidateQueries({ queryKey: queryKeys.items });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.syncLogs });
    },
  });

  // 5. Recurring background sync every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (accountsQuery.data && accountsQuery.data.length > 0 && !syncMutation.isPending) {
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
