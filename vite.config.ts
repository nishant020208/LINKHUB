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
    },
  };
});
