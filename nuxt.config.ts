import { bundledIcons } from './app/utils/icons.ts';

// VideoPlayer's thumbnails. Spread: a literal `image` key fails the typecheck
// of a project without @nuxt/image (cardan-support-nuxt)
const videoThumbnails: Record<string, unknown> = {
  image: {
    domains: ['i.ytimg.com', 'i.vimeocdn.com'],
  },
};

export default defineNuxtConfig({
  ...videoThumbnails,

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
    // Google only: every provider is contacted on each build, so one that is
    // down (fonts.bunny.net answered 504) fails the build of every project
    providers: {
      adobe: false,
      bunny: false,
      fontshare: false,
      fontsource: false,
      googleicons: false,
      npm: false,
    },
    defaults: {
      weights: ['400 700'],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'],
    },
    // main.css's font, up to --font-weight-extrabold. A variable font: Google
    // serves the same files as for 400 700
    families: [
      {
        name: 'Hanken Grotesk',
        weights: ['400 800'],
        styles: ['normal', 'italic'],
        subsets: ['latin', 'latin-ext'],
      },
    ],
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
    // The browser never asks Iconify's API under the 'server' provider. No
    // provider here: @nuxt/icon picks it per project (README)
    fallbackToApi: 'server-only',
    clientBundle: {
      icons: bundledIcons,
      scan: true,
      sizeLimitKb: 256,
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
    // The order of LanguageSwitcher. A project with its own locale files keeps
    // its own list: @nuxtjs/i18n loads a layer's files from its own list only
    locales: [
      { code: 'nl', language: 'nl', file: 'nl.json', name: 'Nederlands' },
      { code: 'en', language: 'en', file: 'en.json', name: 'English' },
    ],
  },

  devtools: {
    enabled: false,
  },

  compatibilityDate: '2026-04-03',
});
