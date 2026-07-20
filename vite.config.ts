import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'icon.jpg', 'splash.jpg', 'apple-touch-icon.jpg', 'offline.html'],

        manifest: {
          name: 'Kanyoza Systems AI Platform',
          short_name: 'Kanyoza',
          description: 'Enterprise AI Command Console — real-time telemetry, AI orchestration, and security monitoring.',
          theme_color: '#0A0E1A',
          background_color: '#0A0E1A',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['productivity', 'utilities', 'business'],
          lang: 'en',

          // ── App Shortcuts (long-press / right-click the app icon) ──────
          shortcuts: [
            {
              name: 'AI Chat',
              short_name: 'Chat',
              description: 'Talk to the AI assistant',
              url: '/ai-chat',
              icons: [{ src: 'icon.jpg', sizes: '192x192' }],
            },
            {
              name: 'Content Studio',
              short_name: 'Posts',
              description: 'Create and manage social posts',
              url: '/posts',
              icons: [{ src: 'icon.jpg', sizes: '192x192' }],
            },
            {
              name: 'System Monitoring',
              short_name: 'Monitoring',
              description: 'View system health and metrics',
              url: '/monitoring',
              icons: [{ src: 'icon.jpg', sizes: '192x192' }],
            },
            {
              name: 'Security Center',
              short_name: 'Security',
              description: 'View security alerts and audit logs',
              url: '/security',
              icons: [{ src: 'icon.jpg', sizes: '192x192' }],
            },
          ],

          icons: [
            // SVG — scales perfectly at any size
            {
              src: 'icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            // JPEG icons — required for Android Chrome badge/splash
            {
              src: 'icon.jpg',
              sizes: '192x192',
              type: 'image/jpeg',
              purpose: 'any',
            },
            {
              src: 'icon.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any',
            },
            // Maskable — safe-zone version (fill the entire canvas)
            {
              src: 'icon.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'maskable',
            },
          ],
        },

        // Workbox runtime caching strategies
        workbox: {
          navigateFallback: '/offline.html',
          navigateFallbackDenylist: [/^\/api\//],

          runtimeCaching: [
            // App shell (JS/CSS/fonts) — stale-while-revalidate
            {
              urlPattern: /\.(?:js|css|woff2?|ttf|otf)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'kanyoza-assets-v1',
                expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
              },
            },
            // Images — cache-first, 30-day TTL
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'kanyoza-images-v1',
                expiration: { maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 },
              },
            },
            // REST API — network-first, 5s timeout then cache
            {
              urlPattern: /\/api\/v1\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'kanyoza-api-v1',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 30, maxAgeSeconds: 5 * 60 },
              },
            },
            // Third-party CDN — stale-while-revalidate
            {
              urlPattern: /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|ui-avatars\.com|images\.unsplash\.com)/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'kanyoza-cdn-v1',
                expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
          ],
        },
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              ignored: ['**/.local/**', '**/.agents/**', '**/.git/**', '**/.cache/**'],
            },
    },
  };
});
