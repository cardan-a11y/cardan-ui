import { defineNuxtModule } from 'nuxt/kit';

interface I18nOptions {
  defaultLocale?: string;
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

/** Gives the shell of an `ssr: false` route, which no plugin renders, the default locale's `lang`. */
export default defineNuxtModule({
  meta: { name: '@cardan/ui:html-lang' },
  setup(_options, nuxt) {
    const lang = defaultLanguage((nuxt.options as { i18n?: I18nOptions }).i18n);
    if (!lang) return;

    const htmlAttrs = (nuxt.options.app.head.htmlAttrs ??= {});
    htmlAttrs.lang ??= lang;
  },
});
