import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh
      fastRefresh: true,
      // Babel optimizations for production
      babel: {
        compact: true,
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Bvmbino AI Elite',
        short_name: 'Bvmbino AI',
        description: 'Multi-model AI business assistant with elite capabilities',
        theme_color: '#e8a912',
        background_color: '#06080a',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
  ],
  root: './',
  build: {
    outDir: 'dist',
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Optimize chunk splitting
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-scroll-area', '@radix-ui/react-toast'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging (disable in production if needed)
    sourcemap: false,
    // Optimize assets
    assetsInlineLimit: 4096,
  },
  server: {
    port: 3000,
    host: true, // Listen on all addresses for mobile access
    cors: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'lucide-react'],
  },
});
