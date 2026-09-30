const CACHE_NAME = 'unifyhub-v4';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache pre-fill non-fatal warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Listen for skipWaiting messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Navigation requests (HTML pages): NETWORK FIRST
  // Always fetch the freshest index.html so deployments are instantly reflected.
  // NEVER resolve with undefined — that results in a blank white screen on mobile.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone))
              .catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          try {
            const cached = await caches.match(event.request);
            if (cached) return cached;
            const fallback = (await caches.match('/index.html')) || (await caches.match('/'));
            if (fallback) return fallback;
          } catch {
            // Ignore cache errors in restricted environments
          }

          // Guaranteed dark HTML offline fallback page if network drops completely
          return new Response(
            `<!doctype html>
<html lang="en" style="background-color:#0c0b0a;color:#f4efe6;">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>UnifyHub</title>
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
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        padding: 24px;
      }
      .logo {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: #e8a54b;
        color: #1a1208;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 20px;
        margin-bottom: 16px;
      }
      .btn {
        margin-top: 18px;
        padding: 10px 20px;
        border-radius: 12px;
        background: #e8a54b;
        color: #1a1208;
        font-weight: 600;
        font-size: 13px;
        border: none;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="logo">U</div>
    <h2 style="margin: 0 0 8px; font-size: 18px;">Connection Offline</h2>
    <p style="margin: 0; font-size: 13px; color: #a89f93; max-width: 300px;">
      UnifyHub is waiting for a network connection to load the dashboard.
    </p>
    <button class="btn" onclick="location.reload()">Retry Connection</button>
  </body>
</html>`,
            {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
          );
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, images, fonts): CACHE FIRST with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            url.origin === location.origin
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone))
              .catch(() => {});
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('[SW] Static asset fetch error:', event.request.url, err);
          // Return Response.error() so the browser handles it naturally,
          // rather than returning a 408 text/plain that crashes ES module script tags.
          return Response.error();
        });
    })
  );
});
