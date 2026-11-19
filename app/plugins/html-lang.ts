/**
 * The i18n module's `defaultDirection`, which it defines at build time.
 * Tripwire: test/tripwires.test.ts.
 */
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

/** Keeps `<html lang>` and `dir` in step with the i18n locale. */
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
