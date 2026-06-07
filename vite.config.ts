import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const REPO = 'diatone'; // GitHub Pages project path: https://<user>.github.io/diatone/

export default defineConfig({
  base: `/${REPO}/`,
  define: {
    // Build timestamp so the app can show which version is installed.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' so we control when the new version is applied (manual button +
      // an "update available" banner) instead of a silent reload mid-drill.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Diatone',
        short_name: 'Diatone',
        description: 'Roman-numeral ↔ chord drill in all 12 major keys.',
        start_url: `/${REPO}/`,
        scope: `/${REPO}/`,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0C10',
        theme_color: '#0A0C10',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: `/${REPO}/index.html`,
        // Once the waiting worker is told to skipWaiting (via the Update button),
        // claim open pages so control hands over and the reload actually fires.
        clientsClaim: true,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
