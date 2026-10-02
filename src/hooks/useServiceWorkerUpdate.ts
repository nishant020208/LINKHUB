import { useCallback, useEffect, useState } from 'react';

/**
 * Bridges the non-React service worker registration (src/registerServiceWorker.ts)
 * to the UI, and owns the "tap to refresh" hand-off.
 *
 * The contract:
 *   - a new worker installs and *waits*; it never takes over on its own;
 *   - this hook surfaces that pending state so the UI can offer a refresh;
 *   - accepting posts SKIP_WAITING and reloads exactly once, on controllerchange.
 *
 * Reloading exactly once matters. Reloading on every controllerchange (or in the
 * naive way, from the registration callback) is what previously left users
 * staring at a blank screen on mobile: a reload during the initial load aborts
 * the active document. Reload only in response to a user action, and only after
 * the new worker has actually taken control.
 */

export const SW_UPDATE_EVENT = 'unifyhub:sw-update-ready';

/** Guards against a double reload if the effect is re-run (e.g. StrictMode). */
let reloadRequested = false;

export type ServiceWorkerUpdateState = {
  /** A newer build is installed and waiting for the user to accept it. */
  isUpdateReady: boolean;
  /** Accept the update: activate the waiting worker and reload once. */
  applyUpdate: () => void;
  /** Ignore for now; the update stays installed and applies on a later reload. */
  dismissUpdate: () => void;
};

export function useServiceWorkerUpdate(): ServiceWorkerUpdateState {
  const [isUpdateReady, setIsUpdateReady] = useState(false);

  useEffect(() => {
    const onUpdateReady = () => setIsUpdateReady(true);
    window.addEventListener(SW_UPDATE_EVENT, onUpdateReady);

    // A pending worker can already exist before this component mounts (e.g. the
    // user navigated from a screen that was rendered earlier). Ask the
    // registration directly instead of relying purely on the event.
    let cancelled = false;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (!cancelled && registration?.waiting) setIsUpdateReady(true);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      window.removeEventListener(SW_UPDATE_EVENT, onUpdateReady);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (reloadRequested) return;
    reloadRequested = true;

    if (!('serviceWorker' in navigator)) {
      window.location.reload();
      return;
    }

    let reloaded = false;
    const reloadOnce = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    // The new worker only takes control after it is told to skip waiting.
    // controllerchange is the reliable signal that it is now in charge, and
    // only then is a reload safe.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      reloadOnce();
    });

    navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          // Nothing waiting (already activated, or update raced us): a plain
          // reload is enough to pick up the new build.
          reloadOnce();
        }
      })
      .catch(() => reloadOnce());

    // Safety net: if controllerchange never arrives (some embedded webviews),
    // refresh anyway rather than stranding the user on the old shell.
    window.setTimeout(() => reloadOnce(), 3000);
  }, []);

  const dismissUpdate = useCallback(() => setIsUpdateReady(false), []);

  return { isUpdateReady, applyUpdate, dismissUpdate };
}
