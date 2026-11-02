import { defaultIcons } from './utils/defaultIcons.ts';

export default defineNuxtConfig({
  // Cardan UI and the Cardan Auth UI layer, which is demoed on the Auth UI pages
  extends: ['..', '../auth'],

  $production: {
    image: {
      domains: ['i.ytimg.com', 'i.vimeocdn.com'],
    },
  },

  i18n: {
    defaultLocale: 'en',
  },

  app: {
    head: {
      title: 'Cardan UI',
      link: [{ rel: 'icon', href: 'favicon.svg', type: 'image/svg+xml' }],
      htmlAttrs: {
        lang: 'en',
      },
    },
  },

  modules: ['@nuxt/image', '@nuxt/scripts', 'nuxt-auth-sanctum'],

  // The Auth UI pages talk to the mock Fortify endpoints in server/routes.
  // Set NUXT_PUBLIC_SANCTUM_BASE_URL to the playground's own URL when it is
  // deployed elsewhere.
  sanctum: {
    baseUrl: 'http://localhost:3003',
    client: {
      initialRequest: false,
    },
    // Back to the Auth UI demo after signing in or skipping the MFA setup
    redirect: {
      onLogin: '/auth',
      onAuthOnly: '/',
      onGuestOnly: '/auth',
      onLogout: '/',
    },
  },

  // Auth UI is made for single-page apps, so its pages render on the client only
  routeRules: {
    '/auth': { ssr: false },
    '/auth/**': { ssr: false },
    '/login': { ssr: false },
    '/forgot-password': { ssr: false },
    '/reset-password': { ssr: false },
    '/two-factor-authentication': { ssr: false },
    '/mfa-setup': { ssr: false },
  },

  // Nuxt 4.6 fails the server build when it tries to inline the highlight.js
  // theme that Markdown/highlight.ts imports with ?url for md-editor-v3
  features: {
    inlineStyles: false,
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
      icons: defaultIcons,
    },
  },

  vite: {
    optimizeDeps: {
      include: [
        'markdown-it',
        'highlight.js/lib/core',
        'highlight.js/lib/languages/css',
        'highlight.js/lib/languages/javascript',
        'highlight.js/lib/languages/typescript',
        'highlight.js/lib/common',
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

  compatibilityDate: '2025-03-19',
});
