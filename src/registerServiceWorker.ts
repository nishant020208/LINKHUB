import { hardResetApp } from './lib/cacheReset';
import { SW_UPDATE_EVENT } from './hooks/useServiceWorkerUpdate';

/**
 * Register the service worker with prompt-then-swap update handling, and bind
 * global auto-recovery handlers for post-deployment dynamic chunk 404s.
 *
 * Update policy (deliberately changed from skipWaiting-on-install):
 *   A new worker installs and waits. It takes over only when the user accepts
 *   the "new version available - tap to refresh" prompt, which posts
 *   SKIP_WAITING. Silent immediate activation is what used to swap the app out
 *   from under a running session, and conversely a never-activated worker is
 *   what pinned users to a stale bundle until they hard-refreshed. This flow
 *   avoids both: nothing changes mid-task, and the update is always applied.
 *
 * Everything here is feature-detected and non-fatal. A browser without service
 * worker support, or a registration that fails, must never stop the app from
 * rendering.
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

  // 2. Service worker registration & update hand-off
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // A worker may already be waiting from a previous visit.
          if (registration.waiting) {
            announceUpdate();
          }

          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state !== 'installed') return;
              if (!navigator.serviceWorker.controller) {
                // First install: nothing to swap, it activates on its own.
                console.log('[SW] First install complete.');
                return;
              }
              // An updated worker is now waiting. Tell the UI, and take over.
              console.log('[SW] New version waiting; awaiting user confirmation.');
              announceUpdate();
            });
          });

          // Check for a newer build when the tab regains focus, so a long-lived
          // installed app (which is often never reloaded by hand) still picks
          // up deploys.
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') registration.update().catch(() => {});
          });
        })
        .catch((err) => {
          console.warn('[SW] Registration non-fatal error:', err);
        });

      // Do NOT reload here. The new worker takes control on its own schedule;
      // the reload happens only when the user accepts the update prompt.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed; new worker is now in charge.');
      });
    });
  }
}

/** Tell the UI a new build is installed and waiting. */
function announceUpdate() {
  window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT));
}
