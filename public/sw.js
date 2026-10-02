/**
 * UnifyHub service worker.
 *
 * Design goals, in priority order:
 *
 *  1. Never trap users on a stale build. This app previously shipped a bug that
 *     left users needing a manual hard refresh. Three mechanisms prevent it:
 *       - The precache name is suffixed with BUILD_ID, injected at build time
 *         from the real hashed asset list (see the vite plugin in
 *         vite.config.ts). Every deploy yields a new cache name, so a new
 *         deploy can never be served from a previous build's cache.
 *       - Navigations are network-first, so index.html is refreshed from the
 *         network on every load and a fresh deploy is picked up immediately.
 *       - Hashed assets under /assets/ are immutable and content-addressed, so
 *         cache-first can never serve a wrong or outdated bundle.
 *
 *  2. Never show a blank screen. Every fetch handler either resolves with a real
 *     response or an explicit offline document. respondWith() is never called
 *     with undefined, and API traffic is deliberately left to the network.
 *
 *  3. Update without hijacking the session. The worker does NOT call
 *     skipWaiting() on install. A new worker waits until the page explicitly
 *     asks it to take over (see src/registerServiceWorker.ts), which is what
 *     backs the "new version available - tap to refresh" prompt.
 */

/* Injected at build time by the `sw-precache-manifest` Vite plugin.
   The `self.*` fallbacks keep this file valid JavaScript in `vite dev`, where
   public/ is copied verbatim and no plugin runs. */
const BUILD_ID = self.__BUILD_ID__ || 'dev';
const PRECACHE_ASSETS = self.__PRECACHE_ASSETS__ || [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

const CACHE_PREFIX = 'unifyhub-precache-';
const CACHE_NAME = CACHE_PREFIX + BUILD_ID;
/** Stable, non-versioned cache for assets discovered at runtime (lazy route
 *  chunks, fonts). Versioning it would evict the offline copies users rely on. */
const RUNTIME_CACHE = 'unifyhub-runtime-v1';

/** How long a navigation waits on the network before falling back to cache. */
const NAVIGATION_TIMEOUT_MS = 4000;
/** Runtime cache entries older than this are pruned on activate, so an
 *  infrequently used route chunk can't pin storage forever. */
const RUNTIME_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ *
 * Install: precache the app shell
 * ------------------------------------------------------------------ */

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // addAll() is atomic: one 404 rejects the whole install. Add entries
      // individually so a single missing optional asset can't leave the app
      // with no precache at all.
      await Promise.all(
        PRECACHE_ASSETS.map(async (asset) => {
          try {
            await cache.add(new Request(asset, { cache: 'reload' }));
          } catch (err) {
            console.warn('[SW] Precache skipped', asset, err);
          }
        })
      );
    })()
  );
  // NOTE: intentionally no skipWaiting() here. The page decides when to swap.
});

/* ------------------------------------------------------------------ *
 * Activate: clean up and take control
 * ------------------------------------------------------------------ */

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          // Drop precaches from previous builds; keep the runtime cache.
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
            console.log('[SW] Removing precache from previous build:', key);
            return caches.delete(key);
          }
          return undefined;
        })
      );
      await pruneRuntimeCache();
      // Starts serving the precache immediately, so a first-time visitor who
      // installs the app is covered on the very next navigation.
      await self.clients.claim();
      if (self.navigationPreload) {
        try {
          await self.navigationPreload.enable();
        } catch {
          /* not supported on this browser */
        }
      }
    })()
  );
});

/** Delete stale runtime entries: dead responses and anything past max age. */
async function pruneRuntimeCache() {
  if (!(await caches.has(RUNTIME_CACHE))) return;
  const cache = await caches.open(RUNTIME_CACHE);
  const entries = await cache.keys();
  await Promise.all(
    entries.map(async (request) => {
      const cached = await cache.match(request);
      if (!cached || !cached.ok) return cache.delete(request);
      const storedAt = Number(cached.headers.get('sw-stored-at') || 0);
      if (storedAt && Date.now() - storedAt > RUNTIME_MAX_AGE_MS) return cache.delete(request);
      return undefined;
    })
  );
}

/* ------------------------------------------------------------------ *
 * Message channel: the only path to skipWaiting
 * ------------------------------------------------------------------ */

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', buildId: BUILD_ID });
  }
});

/* ------------------------------------------------------------------ *
 * Fetch
 * ------------------------------------------------------------------ */

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never touch non-GET, and never cache API traffic: Supabase responses are
  // per-user, auth-scoped and frequently mutated. Passing them through keeps
  // offline behavior at the app layer (last-loaded state) rather than serving
  // stale rows from the HTTP cache.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) return;
  if (url.origin !== self.location.origin && !isFontRequest(url)) return;

  // 1. Navigations: network-first, so a new deploy is always picked up.
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  // 2. Hashed build output: immutable, safe to serve cache-first.
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 3. Everything else same-origin (icons, manifest, fonts, svg): stale-while-
  //    revalidate, so a repeat visit is instant but content still converges.
  event.respondWith(staleWhileRevalidate(request));
});

function isFontRequest(url) {
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

async function handleNavigation(event) {
  const { request } = event;
  const network = fetchWithTimeout(event, NAVIGATION_TIMEOUT_MS);

  try {
    const response = await network;
    if (response && response.ok) {
      // Keep the freshest index.html in the precache for the offline fallback.
      const cache = await caches.open(CACHE_NAME);
      cache.put('/index.html', response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    console.warn('[SW] Navigation fell back to cache:', err);
    const cached =
      (await caches.match('/index.html')) ||
      (await caches.match(request)) ||
      (await caches.match('/'));
    if (cached) return cached;
    return offlineResponse();
  }
}

/**
 * Network fetch for a navigation, racing a timeout so a dead connection on
 * mobile surfaces the cached shell in ~4s instead of hanging on the browser's
 * spinner until it times out.
 */
function fetchWithTimeout(event, timeoutMs) {
  // navigationPreload warms the connection during the load; use it when ready.
  const preload = event.preloadResponse || Promise.resolve(undefined);
  const request = (async () => {
    const preloaded = await preload;
    return preloaded || fetch(event.request);
  })();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('navigation timeout')), timeoutMs);
    request.then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    console.warn('[SW] Asset fetch failed and nothing cached:', request.url, err);
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        const headers = new Headers(response.headers);
        headers.set('sw-stored-at', String(Date.now()));
        const stamped = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
        cache.put(request, stamped.clone()).catch(() => {});
      }
      return response;
    })
    .catch((err) => {
      console.warn('[SW] Background refresh failed:', request.url, err);
      return undefined;
    });

  if (cached) {
    // Refresh in the background; the user gets the cached copy immediately.
    network.catch(() => {});
    return cached;
  }

  const response = await network;
  if (response) return response;
  return Response.error();
}

function offlineResponse() {
  return new Response(
    `<!doctype html>
<html lang="en" style="background-color:#0c0b0a;color:#f4efe6;">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="theme-color" content="#0c0b0a">
    <title>UnifyHub - Offline</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: #0c0b0a;
        color: #f4efe6;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
        text-align: center;
        padding: 24px;
      }
      .logo {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: #e8a54b;
        color: #1a1208;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 26px;
        margin-bottom: 20px;
      }
      h2 { margin: 0 0 8px; font-size: 19px; }
      p { margin: 0; font-size: 13px; color: #a89f93; max-width: 320px; line-height: 1.55; }
      .btn {
        margin-top: 22px;
        padding: 12px 24px;
        border-radius: 14px;
        background: #e8a54b;
        color: #1a1208;
        font-weight: 700;
        font-size: 14px;
        border: none;
        cursor: pointer;
      }
      .hint { margin-top: 16px; font-size: 11px; color: #6b6459; }
    </style>
  </head>
  <body>
    <div class="logo">U</div>
    <h2>You're offline</h2>
    <p>
      UnifyHub needs a connection to load your dashboard. Anything already
      downloaded stays available once you're back on a network.
    </p>
    <button class="btn" onclick="location.reload()">Try again</button>
    <div class="hint">UnifyHub &middot; Personal Command Center</div>
  </body>
</html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}
