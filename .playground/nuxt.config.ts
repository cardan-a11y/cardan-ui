import { AUTH_PAGES } from '../auth/app/utils/authPages.ts';

function isAuthDemoPath(path: string) {
  return (
    AUTH_PAGES.includes(path) || path === '/auth' || path.startsWith('/auth/')
  );
}

export default defineNuxtConfig({
  extends: ['..', '../auth'],

  $production: {
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

  modules: ['@nuxt/image', '@nuxt/scripts'],

  // Deployed elsewhere: NUXT_PUBLIC_SANCTUM_BASE_URL is the playground's own URL
  sanctum: {
    baseUrl: 'http://localhost:3003',
    // The documentation pages are for everyone
    globalMiddleware: {
      enabled: false,
    },
    redirect: {
      onLogin: '/auth',
      onAuthOnly: '/',
      onGuestOnly: '/auth',
      onLogout: '/',
    },
  },

  hooks: {
    // The documentation pages render without waiting for the user
    'pages:extend'(pages) {
      for (const page of pages) {
        if (!isAuthDemoPath(page.path)) {
          page.meta = { ...page.meta, waitForIdentity: false };
        }
      }
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

  // The layer adds the packages of its components (modules/optimize-deps.ts)
  vite: {
    optimizeDeps: {
      include: ['vue-axe'],
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
    // and @nuxt/image still need: goes once the build in CI passes without it
    nitroAutoImports: true,
  },

  compatibilityDate: '2025-03-19',
});
