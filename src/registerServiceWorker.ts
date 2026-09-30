import { hardResetApp } from './lib/cacheReset';

/**
 * Register Service Worker with active update management, and bind global
 * auto-recovery handlers for post-deployment dynamic chunk 404s.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  // 1. Detect failed dynamic import / chunk load errors (Vite post-deploy 404s)
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[SW/Vite] Detected Vite chunk preload error, triggering automatic hard reset:', event);
    // Prevent default error popups and immediately reload fresh bundle
    event.preventDefault();
    hardResetApp();
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('error loading dynamically imported module')
    ) {
      console.warn('[SW/Window] Dynamic import failure detected:', msg);
      hardResetApp();
    }
  });

  // 2. Service Worker registration & updates
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // If a new worker is waiting, activate it immediately
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[SW] New version available. Sending SKIP_WAITING...');
                  installingWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[SW] Registration failed:', err);
        });

      // Reload on controller change ONLY if upgrading from a previous worker.
      // On first visit, controller starts null and claiming it should NOT interrupt the initial load.
      let hadController = Boolean(navigator.serviceWorker.controller);
      let refreshing = false;

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController) {
          // Initial claim on first visit — already has freshest bundle from network
          hadController = true;
          return;
        }
        if (!refreshing) {
          refreshing = true;
          console.log('[SW] Controller changed, reloading page...');
          window.location.reload();
        }
      });
    });
  }
}
