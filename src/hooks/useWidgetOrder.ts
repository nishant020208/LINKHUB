import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { useAuthStore } from '@/store/useAuthStore';

const LOCAL_KEY = 'unifyhub.widget_order';

/**
 * Persists dashboard widget order per user:
 *  - Supabase `user_settings.widget_order` (JSONB) when configured & signed in
 *  - localStorage fallback otherwise
 */
export function useWidgetOrder() {
  const user = useAuthStore((s) => s.user);
  const [order, setOrderState] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]');
    } catch {
      return [];
    }
  });

  // Hydrate from Supabase when available
  useEffect(() => {
    if (!env.isConfigured.supabase || !user) return;
    supabase
      .from('user_settings')
      .select('widget_order')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const saved = (data?.widget_order as string[] | null) ?? [];
        if (Array.isArray(saved) && saved.length > 0) {
          setOrderState(saved);
        }
      });
  }, [user]);

  const setOrder = useCallback(
    (next: string[]) => {
      setOrderState(next);
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      if (env.isConfigured.supabase && user) {
        supabase
          .from('user_settings')
          .upsert({ user_id: user.id, widget_order: next }, { onConflict: 'user_id' })
          .then(({ error }) => {
            if (error) console.warn('Failed to persist widget order:', error.message);
          });
      }
    },
    [user]
  );

  return { order, setOrder };
}
