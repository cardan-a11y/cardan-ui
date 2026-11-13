/**
 * Keeps `<html lang>` and `dir` in step with the i18n locale, on the server
 * and after every change of locale. A project that also sets them from
 * `useLocaleHead()` sets the same values, read from the same locale, so the
 * two never disagree.
 */
export default defineNuxtPlugin({
  name: 'cardan-ui:html-lang',
  dependsOn: ['i18n:plugin'],
  setup(nuxtApp) {
    const locale = nuxtApp.$i18n.localeProperties;

    useHead({
      htmlAttrs: {
        lang: () => locale.value.language,
        dir: () => locale.value.dir ?? 'ltr',
      },
    });
  },
});
