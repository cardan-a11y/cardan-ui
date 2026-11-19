export default defineNuxtConfig({
  extends: ['..', '../auth'],

  $production: {
    image: {
      domains: ['i.ytimg.com', 'i.vimeocdn.com'],
    },

    // Cached like cardan-cms-nuxt's pages, so a component that renders per
    // visitor shows up here first; the mock endpoints answer per session
    routeRules: {
      '/**': { isr: 3600 },
      '/api/**': { isr: false },
      '/sanctum/**': { isr: false },
    },
  },

  i18n: {
    defaultLocale: 'en',
  },

  app: {
    head: {
      titleTemplate: '%s | Cardan UI',
      title: 'Cardan UI',
      link: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    },
  },

  modules: ['@nuxt/image', '@nuxt/scripts', 'nuxt-auth-sanctum'],

  // Deployed elsewhere: NUXT_PUBLIC_SANCTUM_BASE_URL is the playground's own URL
  sanctum: {
    baseUrl: 'http://localhost:3003',
    client: {
      initialRequest: false,
    },
    redirect: {
      onLogin: '/auth',
      onAuthOnly: '/',
      onGuestOnly: '/auth',
      onLogout: '/',
    },
  },

  routeRules: {
    '/auth': { ssr: false },
    '/auth/**': { ssr: false },
    '/login': { ssr: false },
    '/forgot-password': { ssr: false },
    '/reset-password': { ssr: false },
    '/two-factor-authentication': { ssr: false },
    '/mfa-setup': { ssr: false },
  },

  // Netlify builds from the repository root, so it looks for the publish
  // directory and the server function there, not in .playground
  nitro: process.env.NETLIFY
    ? {
        output: {
          dir: '../.netlify/functions-internal',
          publicDir: '../dist',
        },
      }
    : {},

  css: ['~/assets/playground.css'],

  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 256,
    },
  },

  vite: {
    optimizeDeps: {
      include: [
        'markdown-it',
        'highlight.js/lib/core',
        'highlight.js/lib/languages/xml',
        'highlight.js/lib/languages/css',
        'highlight.js/lib/languages/javascript',
        'highlight.js/lib/languages/typescript',
        'highlight.js/lib/languages/json',
        'highlight.js/lib/languages/bash',
        '@mdit/plugin-attrs',
        '@mdit/plugin-mark',
        'vue-axe',
        'date-fns/locale',
        '@vuepic/vue-datepicker',
        '@vueform/multiselect',
        'compressorjs',
      ],
    },
  },

  devServer: {
    port: 3003,
  },

  // As in cardan-academy-nuxt and cardan-auditor-nuxt
  future: {
    compatibilityVersion: 5,
  },

  experimental: {
    // compatibilityVersion 5 drops the server auto-imports that @nuxtjs/i18n
    // and @nuxt/image still need. Tripwire: test/tripwires.test.ts.
    nitroAutoImports: true,
  },

  compatibilityDate: '2025-03-19',
});
