export default defineNuxtConfig({
  pages: true,

  typescript: {
    includeWorkspace: true,
  },

  // Only the locale files: the rest of the i18n setup is the app's
  i18n: {
    locales: [
      { code: 'en', language: 'en', file: 'en.json', name: 'English' },
      { code: 'nl', language: 'nl', file: 'nl.json', name: 'Nederlands' },
    ],
  },

  compatibilityDate: '2026-04-03',
});
