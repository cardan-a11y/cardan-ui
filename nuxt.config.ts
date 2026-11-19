import { bundledIcons } from './app/utils/icons.ts';

export default defineNuxtConfig({
  $development: {
    modules: ['@nuxtjs/html-validator'],

    // A config key rather than inline module options, so projects can override these rules
    htmlValidator: {
      usePrettier: true,
      options: {
        rules: {
          'no-redundant-role': 'off',
          'no-implicit-input-type': 'off',
          'heading-level': 'off',
          'unique-landmark': 'off',
          'prefer-native-element': 'off',
          'no-missing-references': 'off',
          'long-title': 'off',
        },
      },
    },
  },

  pages: true,

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@vueuse/nuxt',
  ],

  // Fonts are only downloaded when a project's CSS uses them, e.g. via --font-family in main.css
  fonts: {
    defaults: {
      weights: ['400 700'],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'],
    },
  },

  typescript: {
    includeWorkspace: true,
  },

  hooks: {
    // A project's typecheck reads this layer's files too, whose vue-router
    // comes from the layer's own node_modules. TypeScript takes that copy
    // for the project's only when its version and its peers (vue, vite, …)
    // match, so otherwise the project's typed routes don't reach the
    // layer's files.
    // Map vue-router to the folder of the project's copy, which Nuxt resolves
    // as #vue-router (at this point its runtime file, without types)
    'prepare:types'({ tsConfig }) {
      const paths = tsConfig.compilerOptions?.paths;
      const project = paths?.['#vue-router']?.[0]?.match(
        /^.*node_modules\/vue-router(?=\/|$)/,
      )?.[0];
      if (paths && project) paths['vue-router'] = [project];
    },
  },

  colorMode: {
    classSuffix: '-mode',
  },

  // See bundledIcons; a project's own list is merged with it
  icon: {
    clientBundle: {
      icons: bundledIcons,
    },
  },

  runtimeConfig: {
    public: {
      // The Google Tag Manager container of CookiesDialog, NUXT_PUBLIC_GTM_ID
      // in a project's environment
      gtmId: '',
    },
  },

  i18n: {
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
    defaultLocale: 'nl',
    locales: [
      { code: 'en', language: 'en', file: 'en.json', name: 'English' },
      { code: 'nl', language: 'nl', file: 'nl.json', name: 'Nederlands' },
    ],
  },

  devtools: {
    enabled: false,
  },

  compatibilityDate: '2026-04-03',
});
