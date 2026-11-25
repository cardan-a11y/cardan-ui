import { defineNuxtModule } from 'nuxt/kit';

type Direction = 'ltr' | 'rtl' | 'auto';

interface I18nOptions {
  defaultLocale?: string;
  defaultDirection?: Direction;
  locales?: (string | { code: string; language?: string })[];
}

/** The default locale's `language`, or its code without one */
export function defaultLanguage(i18n: I18nOptions | undefined) {
  const code = i18n?.defaultLocale;
  if (!code) return undefined;

  const locale = i18n.locales?.find(
    (entry) => (typeof entry === 'string' ? entry : entry.code) === code,
  );

  return (typeof locale === 'object' && locale.language) || code;
}

/** i18n's `defaultDirection`, ltr without one */
export function defaultDirection(i18n: I18nOptions | undefined): Direction {
  return i18n?.defaultDirection ?? 'ltr';
}

/**
 * Gives the shell of an `ssr: false` route, which no plugin renders, the
 * default locale's `lang`, and the html-lang plugin i18n's `defaultDirection`.
 */
export default defineNuxtModule({
  meta: { name: '@cardan/ui:html-lang' },
  setup(_options, nuxt) {
    const i18n = (nuxt.options as { i18n?: I18nOptions }).i18n;

    const publicConfig = nuxt.options.runtimeConfig.public as {
      cardanUi?: { defaultDirection?: Direction };
    };
    publicConfig.cardanUi = {
      ...publicConfig.cardanUi,
      defaultDirection: defaultDirection(i18n),
    };

    const lang = defaultLanguage(i18n);
    if (!lang) return;

    const htmlAttrs = (nuxt.options.app.head.htmlAttrs ??= {});
    htmlAttrs.lang ??= lang;
  },
});
