import { resolve } from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: false,
  srcDir: '.',
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
  },
  modules: ['@nuxt/ui', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'ShowMasters → Lasso',
      short_name: 'SM Lasso',
      description: 'Import ShowMasters CSV job data into Lasso Workforce',
      theme_color: '#0f1117',
      background_color: '#0f1117',
      display: 'standalone',
      orientation: 'portrait-primary',
      icons: [
        { src: 'icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Cache the app shell and API responses that are safe to cache
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      // Don't cache Lasso API calls — they must always be live
      navigateFallback: '/',
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          urlPattern: /^\/api\//,
          handler: 'NetworkOnly',
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      type: 'module',
    },
  },

  runtimeConfig: {
    // Private keys available only on the server
    lassoApiKey: process.env.LASSO_API_KEY || '',
    lassoBaseUrl: process.env.LASSO_BASE_URL || 'https://test1.lasso.io/api/v1',
    divisionId: process.env.DIVISION_ID || '',
  },

  nitro: {
    // Allow server routes to require() CJS modules from ../src
    externals: {
      external: ['csv-parse', 'axios', 'dotenv'],
    },
  },

  alias: {
    // Resolve the shared src/ directory from server utilities
    '#lasso-src': resolve(__dirname, '../src'),
  },
})
