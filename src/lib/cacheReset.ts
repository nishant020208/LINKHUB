import { queryClient } from './queryClient';

/**
 * Perform a true hard reset of the application:
 * 1. Unregisters any active service worker registrations
 * 2. Deletes all caches stored via the Cache Storage API
 * 3. Clears TanStack Query's in-memory and persisted cache
 * 4. Forces a real hard navigation to bypass any HTTP or service worker cache,
 *    equivalent to Ctrl+Shift+R / Cmd+Shift+R.
 */
export async function hardResetApp(): Promise<void> {
  console.log('[hardResetApp] Initiating complete application reset...');

  // 1. Clear TanStack Query cache
  try {
    queryClient.clear();
  } catch (err) {
    console.warn('[hardResetApp] QueryClient clear warning:', err);
  }

  // 2. Unregister all service workers
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (reg) => {
          console.log('[hardResetApp] Unregistering service worker:', reg.scope);
          return reg.unregister();
        })
      );
    }
  } catch (err) {
    console.warn('[hardResetApp] Service worker unregister warning:', err);
  }

  // 3. Clear Cache Storage API
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(
        keys.map(async (key) => {
          console.log('[hardResetApp] Deleting cache:', key);
          return window.caches.delete(key);
        })
      );
    }
  } catch (err) {
    console.warn('[hardResetApp] CacheStorage clear warning:', err);
  }

  // 4. Force hard navigation with cache-busting timestamp
  const target = new URL(window.location.href);
  target.searchParams.set('__hard_reset', Date.now().toString());
  window.location.replace(target.toString());
}
