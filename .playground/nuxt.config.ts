export default defineNuxtConfig({
  // Cardan UI and the Cardan Auth UI layer, which is demoed on the Auth UI pages
  extends: ['..', '../auth'],

  $production: {
    image: {
      domains: ['i.ytimg.com', 'i.vimeocdn.com'],
    },

    // Cached on Netlify like the pages of cardan-cms-nuxt, so a component that
    // renders differently per visitor or over time shows up here first. The
    // mock endpoints answer per session, so they are never cached.
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
      // In the config, not a layout or app.vue, so the error page has it too
      titleTemplate: '%s | Cardan UI',
      title: 'Cardan UI',
      link: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
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

  // As in cardan-academy-nuxt and cardan-auditor-nuxt, so the layer's typecheck
  // and build see what theirs see, such as typed routes
  future: {
    compatibilityVersion: 5,
  },

  experimental: {
    // compatibilityVersion 5 turns off the auto-imports of the server bundle,
    // which the server runtime of @nuxtjs/i18n and @nuxt/image still relies
    // on: without them the build fails ("useRuntimeConfig" is not exported by
    // "#imports")
    nitroAutoImports: true,
  },

  compatibilityDate: '2025-03-19',
});
