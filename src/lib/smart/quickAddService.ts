import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { queryKeys } from '@/lib/queryKeys';
import { Item, ItemType, ConnectedAccount } from '@/types';
import { QueryClient } from '@tanstack/react-query';

export interface CreateQuickAddInput {
  title: string;
  type?: ItemType;
  dueDate?: Date | string | null;
  priorityScore?: number;
  description?: string;
  accountId?: string;
  courseName?: string;
  accounts: ConnectedAccount[];
  queryClient?: QueryClient;
  addItemToStore: (item: Partial<Item>) => void;
}

export async function createQuickAddItem(params: CreateQuickAddInput): Promise<Item> {
  const {
    title,
    type = 'task',
    dueDate,
    priorityScore = 70,
    description = '',
    accountId,
    courseName,
    accounts,
    queryClient,
    addItemToStore,
  } = params;

  const finalTitle = title.trim();
  if (!finalTitle) {
    throw new Error('Title cannot be empty');
  }

  let finalDue: string | null = null;
  if (dueDate) {
    if (dueDate instanceof Date) {
      finalDue = isNaN(dueDate.getTime()) ? null : dueDate.toISOString();
    } else {
      const d = new Date(dueDate);
      finalDue = isNaN(d.getTime()) ? null : d.toISOString();
    }
  }

  let targetAccountId = accountId || (accounts.length > 0 ? accounts[0].id : '');

  if (env.isConfigured.supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (user) {
      // Ensure targetAccountId exists
      if (!targetAccountId) {
        const { data: existingAcc } = await supabase
          .from('connected_accounts')
          .select('id')
          .eq('user_id', user.id)
          .eq('provider', 'personal')
          .maybeSingle();

        if (existingAcc?.id) {
          targetAccountId = existingAcc.id;
        } else {
          const { data: createdAcc, error: createAccErr } = await supabase
            .from('connected_accounts')
            .insert({
              user_id: user.id,
              provider: 'personal',
              email: user.email || 'personal@unifyhub.local',
              label: 'Personal Tasks',
              color: '#e8a54b',
              status: 'connected',
            })
            .select('id')
            .single();

          if (!createAccErr && createdAcc?.id) {
            targetAccountId = createdAcc.id;
            queryClient?.invalidateQueries({ queryKey: queryKeys.accounts });
          }
        }
      }

      const metadata: Record<string, unknown> = {
        created_manually: true,
        source: 'manual',
      };
      if (courseName) {
        metadata.course_name = courseName;
      }

      const { data: insertedItem, error: insertErr } = await supabase
        .from('items')
        .insert({
          user_id: user.id,
          account_id: targetAccountId,
          type,
          title: finalTitle,
          description: description.trim() || null,
          due_at: finalDue,
          priority_score: priorityScore,
          source_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          is_done: false,
          metadata,
        })
        .select()
        .single();

      if (insertErr) {
        throw new Error(insertErr.message);
      }

      if (insertedItem) {
        addItemToStore(insertedItem as Item);
        queryClient?.invalidateQueries({ queryKey: queryKeys.items });
        return insertedItem as Item;
      }
    }
  }

  // Fallback for offline / demo mode
  const fallbackItem: Item = {
    id: `item-${Date.now()}`,
    user_id: 'demo-user-1',
    account_id: targetAccountId || 'acc-1',
    type,
    title: finalTitle,
    description: description.trim() || null,
    due_at: finalDue,
    priority_score: priorityScore,
    source_id: `manual-${Date.now()}`,
    is_done: false,
    metadata: {
      created_manually: true,
      source: 'manual',
      ...(courseName ? { course_name: courseName } : {}),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  addItemToStore(fallbackItem);
  return fallbackItem;
}
