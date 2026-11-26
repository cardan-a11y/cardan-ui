import { fileURLToPath } from 'node:url';

// The API's origin, so the browser opens its connection while the SPA loads
const apiOrigin = process.env.NUXT_PUBLIC_SANCTUM_BASE_URL;

const globalTypes = fileURLToPath(
  new URL('./app/types/index.ts', import.meta.url),
);

export default defineNuxtConfig({
  pages: true,

  modules: ['nuxt-auth-sanctum'],

  // What every app sets the same; an app adds `baseUrl`, `origin`,
  // `endpoints.user` and its own redirects
  sanctum: {
    endpoints: {
      csrf: '/sanctum/csrf-cookie',
      login: '/api/login',
      logout: '/api/logout',
    },
    client: {
      // The layer's identity plugin loads the user, in the browser only
      initialRequest: false,
    },
    redirect: {
      keepRequestedRoute: true,
      onAuthOnly: '/login',
      onLogout: '/login',
    },
    globalMiddleware: {
      enabled: true,
      allow404WithoutAuth: false,
    },
  },

  app: {
    head: {
      link: apiOrigin ? [{ rel: 'preconnect', href: apiOrigin }] : [],
    },
  },

  typescript: {
    includeWorkspace: true,
  },

  hooks: {
    // Nuxt 4.6's generated tsconfig excludes the project's `node_modules`, where the layer
    // lives, and the projects' typecheck fails; can go once it passes without this hook.
    'prepare:types'({ references }) {
      references.push({ path: globalTypes });
    },
  },

  // Only the locale files: the rest of the i18n setup is the app's
  i18n: {
    locales: [
      { code: 'nl', language: 'nl', file: 'nl.json', name: 'Nederlands' },
      { code: 'en', language: 'en', file: 'en.json', name: 'English' },
    ],
  },

  compatibilityDate: '2026-04-03',
});
