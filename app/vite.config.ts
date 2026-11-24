/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GBM Relevé DAB',
        short_name: 'Relevé DAB',
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#0b4f8a',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg}'], globIgnores: ['**/xlsx-*.js', '**/export-*.js'], navigateFallback: 'index.html' },
    }),
  ],
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] },
});
