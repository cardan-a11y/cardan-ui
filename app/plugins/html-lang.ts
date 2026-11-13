/** The i18n module's `defaultDirection`, which it defines at build time */
declare const __DEFAULT_DIRECTION__: string | undefined;

type Direction = 'ltr' | 'rtl' | 'auto';

const defaultDirection = (
  typeof __DEFAULT_DIRECTION__ === 'string' ? __DEFAULT_DIRECTION__ : 'ltr'
) as Direction;

/** `<html lang>` and `dir` for a locale */
export function htmlLangAttrs(locale: {
  code: string;
  language?: string;
  dir?: Direction;
}): { lang: string; dir: Direction } {
  return {
    lang: locale.language || locale.code,
    dir: locale.dir || defaultDirection,
  };
}

/**
 * Keeps `<html lang>` and `dir` in step with the i18n locale, on the server
 * and after every change of locale: its `language`, or its code without one,
 * and its `dir`, or the module's `defaultDirection`. A project that also sets
 * them from `useLocaleHead()` sets the same values for a locale with a
 * `language`, so the two never disagree. The shell of an `ssr: false`
 * route, which no plugin renders, takes the default locale's language from
 * the layer's html-lang module.
 */
export default defineNuxtPlugin({
  name: 'cardan-ui:html-lang',
  dependsOn: ['i18n:plugin'],
  setup(nuxtApp) {
    const locale = nuxtApp.$i18n.localeProperties;

    useHead({
      htmlAttrs: {
        lang: () => htmlLangAttrs(locale.value).lang,
        dir: () => htmlLangAttrs(locale.value).dir,
      },
    });
  },
});
