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
    // Without it a project's typecheck reads the layer's own vue-router unless
    // versions and peers match, and its typed routes miss the layer's files
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

  icon: {
    clientBundle: {
      icons: bundledIcons,
    },
  },

  runtimeConfig: {
    public: {
      // CookiesDialog's Google Tag Manager container: NUXT_PUBLIC_GTM_ID
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
