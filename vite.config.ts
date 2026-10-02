import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

export default defineConfig(({ mode }) => {
  const envVars = loadEnv(mode, process.cwd(), '');
  const verificationTag = envVars.VITE_GOOGLE_SITE_VERIFICATION || process.env.VITE_GOOGLE_SITE_VERIFICATION || '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html-transform-google-verification',
        transformIndexHtml(html) {
          if (verificationTag) {
            return html.replace(
              '</head>',
              `    <meta name="google-site-verification" content="${verificationTag}" />\n  </head>`
            );
          }
          return html;
        },
      },
      swPrecacheManifest(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      allowedHosts: ['.monkeycode-ai.live'],
    },
    build: {
      rollupOptions: {
        output: {
          /**
           * Vendor splitting: stable frameworks land in their own cached
           * chunks, so app-code changes don't invalidate the framework cache
           * and the initial download stays small. Route chunks are produced
           * by React.lazy in src/App.tsx.
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            // Order matters: most-specific package names FIRST — e.g.
            // 'lucide-react' also contains 'react', so it must be tested
            // before the broad react-family match.
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@tanstack')) return 'vendor-query';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('zustand')) return 'vendor-zustand';
            if (id.includes('react') || id.includes('scheduler')) {
              // react, react-dom, react-router-dom
              return 'vendor-react';
            }
            return 'vendor-misc';
          },
        },
      },
    },
  };
});

/**
 * Inject the real, hashed build output into public/sw.js.
 *
 * public/sw.js ships with `self.__PRECACHE_ASSETS__` / `self.__BUILD_ID__`
 * placeholders so the file stays valid JavaScript in dev (where public/ is
 * copied verbatim and no plugin runs). At build time we replace them with:
 *
 *   - the actual emitted JS/CSS filenames, so the app shell is precached
 *     instead of being discovered lazily, which is what Chrome's installability
 *     audit and a reliable offline first paint both depend on; and
 *   - a build id derived from those filenames, so every deploy that changes the
 *     bundle produces a new precache name and the old one is deleted on
 *     activate. That is what stops a stale bundle from being served forever.
 */
function swPrecacheManifest(): Plugin {
  return {
    name: 'sw-precache-manifest',
    apply: 'build',
    // writeBundle, not generateBundle: files from public/ are copied straight
    // to the output directory and never appear in the Rollup bundle, so
    // sw.js has to be patched on disk after it has been written.
    writeBundle(options, bundle) {
      if (!options.dir) {
        this.warn('Build output directory unknown; service worker precache not injected.');
        return;
      }

      const assets = Object.keys(bundle)
        .filter((fileName) => /\.(js|css)$/.test(fileName))
        .map((fileName) => `/${fileName}`);

      // Static shell entries. '/' is a real precache target so a cold offline
      // launch on the scope root resolves without a network round trip.
      const precache = [
        '/',
        '/index.html',
        '/manifest.json',
        '/favicon.svg',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/icon-maskable-512.png',
        '/icons/apple-touch-icon.png',
        ...assets.sort(),
      ];

      // Content-derived id: changes exactly when the emitted bundle changes.
      const buildId = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12);

      const swPath = path.resolve(options.dir, 'sw.js');
      if (!fs.existsSync(swPath)) {
        this.warn('sw.js not found in build output; service worker precache not injected.');
        return;
      }

      const original = fs.readFileSync(swPath, 'utf8');
      const source = original
        .replace('self.__PRECACHE_ASSETS__', JSON.stringify(precache))
        .replace('self.__BUILD_ID__', JSON.stringify(buildId));

      if (source === original) {
        this.warn('sw.js placeholders not found; service worker precache not injected.');
        return;
      }

      fs.writeFileSync(swPath, source);
      this.info?.(`sw.js precache manifest injected (build ${buildId}, ${precache.length} entries)`);
    },
  };
}
