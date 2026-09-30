import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

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
