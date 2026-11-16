import { describe, it, expect, vi } from 'vitest';
import { defaultLanguage } from '../../modules/html-lang';
import { htmlLangAttrs } from '../../app/plugins/html-lang';

/**
 * `<html lang>` and `dir`: the static default of the HTML no plugin renders
 * (an `ssr: false` route's shell; the browser suite checks one), and what the
 * plugin sets from the locale.
 */
describe('html-lang', () => {
  it("gives the shell the default locale's language, or its code", () => {
    expect(
      defaultLanguage({
        defaultLocale: 'nl',
        locales: [
          { code: 'en', language: 'en-GB' },
          { code: 'nl', language: 'nl-NL' },
        ],
      }),
    ).toBe('nl-NL');
    expect(
      defaultLanguage({ defaultLocale: 'en', locales: [{ code: 'en' }] }),
    ).toBe('en');
    expect(defaultLanguage({ defaultLocale: 'de', locales: ['de'] })).toBe(
      'de',
    );
    expect(defaultLanguage({ locales: ['nl'] })).toBeUndefined();
    expect(defaultLanguage(undefined)).toBeUndefined();
  });

  it("follows the locale's language, or its code, and its direction, or the default", () => {
    expect(htmlLangAttrs({ code: 'nl', language: 'nl-NL' })).toEqual({
      lang: 'nl-NL',
      dir: 'ltr',
    });
    expect(htmlLangAttrs({ code: 'ar', dir: 'rtl' })).toEqual({
      lang: 'ar',
      dir: 'rtl',
    });
  });

  it('sets them on <html> after a change of locale', async () => {
    await useNuxtApp().$i18n.setLocale('nl');
    await vi.waitFor(() => expect(document.documentElement.lang).toBe('nl'));
    expect(document.documentElement.dir).toBe('ltr');

    await useNuxtApp().$i18n.setLocale('en');
    await vi.waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });
});
