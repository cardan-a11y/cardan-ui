type Direction = 'ltr' | 'rtl' | 'auto';

/** `<html lang>` and `dir` for a locale */
export function htmlLangAttrs(
  locale: { code: string; language?: string; dir?: Direction },
  defaultDirection: Direction = 'ltr',
): { lang: string; dir: Direction } {
  return {
    lang: locale.language || locale.code,
    dir: locale.dir || defaultDirection,
  };
}

/** Keeps `<html lang>` and `dir` in step with the i18n locale. */
// Runs after @nuxtjs/i18n's plugin, as module plugins come first and i18n's
// is sequential (`parallelPlugin` off, the default); without `$i18n` setup
// throws at start-up.
export default defineNuxtPlugin({
  name: 'cardan-ui:html-lang',
  setup(nuxtApp) {
    const locale = nuxtApp.$i18n.localeProperties;
    const defaultDirection = useRuntimeConfig().public.cardanUi
      .defaultDirection as Direction;

    useHead({
      htmlAttrs: {
        lang: () => htmlLangAttrs(locale.value, defaultDirection).lang,
        dir: () => htmlLangAttrs(locale.value, defaultDirection).dir,
      },
    });
  },
});
