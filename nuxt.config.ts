// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: false,
  srcDir: '.',

  app: {
    baseURL: process.env.NUXT_APP_BASE_URL ?? '/',
  },
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
  },
  modules: ['@nuxt/ui', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],

  nitro: {
    // No static preset — the Nitro server is required to proxy Lasso API
    // requests server-side (avoids CORS). Deploy to Vercel, Netlify, Railway,
    // or any Node-capable host. GitHub Pages (static-only) is not supported.
  },

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
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      navigateFallback: '/',
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          urlPattern: /^https?:\/\/.+\/api\//,
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
})
