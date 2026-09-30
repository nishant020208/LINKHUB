import { hardResetApp } from './lib/cacheReset';

/**
 * Register Service Worker with safe update management, and bind global
 * auto-recovery handlers for post-deployment dynamic chunk 404s.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  // 1. Detect failed dynamic import / chunk load errors (Vite post-deploy 404s)
  // Guard with session retry flag so mobile connections don't enter reload loops
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[SW/Vite] Detected Vite chunk preload error:', event);
    event.preventDefault();
    try {
      const hasRetried = sessionStorage.getItem('unifyhub-preload-retried');
      if (!hasRetried) {
        sessionStorage.setItem('unifyhub-preload-retried', '1');
        hardResetApp();
      }
    } catch {
      hardResetApp();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('error loading dynamically imported module')
    ) {
      console.warn('[SW/Window] Dynamic import failure detected:', msg);
      try {
        const hasRetried = sessionStorage.getItem('unifyhub-preload-retried');
        if (!hasRetried) {
          sessionStorage.setItem('unifyhub-preload-retried', '1');
          hardResetApp();
        }
      } catch {
        hardResetApp();
      }
    }
  });

  // 2. Service Worker registration & updates
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // If a new worker is waiting, activate it
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[SW] New version ready in background.');
                  installingWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[SW] Registration non-fatal error:', err);
        });

      // DO NOT call window.location.reload() on controllerchange!
      // On mobile browsers, reloading during initial load aborts the active document
      // and causes a blank white screen. The new worker will control subsequent requests smoothly.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Service worker controller updated smoothly in background.');
      });
    });
  }
}
