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

/**
 * Gives the HTML that no plugin renders a `lang`: the shell of an `ssr: false`
 * route, which only the browser fills, takes `app.head` and nothing else. It
 * is the language of the project's `i18n.defaultLocale`, unless the project
 * sets `app.head.htmlAttrs.lang` itself. Once the app runs, the html-lang
 * plugin follows the locale.
 *
 * Picked up from `modules/` like global-types, so it runs in every project.
 */
export default defineNuxtModule({
  meta: { name: '@cardan/ui:html-lang' },
  setup(_options, nuxt) {
    const lang = defaultLanguage((nuxt.options as { i18n?: I18nOptions }).i18n);
    if (!lang) return;

    const htmlAttrs = (nuxt.options.app.head.htmlAttrs ??= {});
    htmlAttrs.lang ??= lang;
  },
});
