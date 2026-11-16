import { afterEach, describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { LanguageSwitcher } from '#components';
import { accessibleName, checkA11y, roleOf } from '../a11y';

describe('LanguageSwitcher', () => {
  afterEach(async () => {
    await useNuxtApp().$i18n.setLocale('en');
  });

  it('is a labelled list of links, each named and spoken in its own language, the current one marked', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, {
      attachTo: document.body,
    });

    const section = wrapper.get('section');
    expect(roleOf(section)).toBe('region');
    expect(accessibleName(section)).toBe('Choose language');
    expect(roleOf(section.get('ul'))).toBe('list');

    const links = wrapper.findAll('a');
    // The code, then the language's name in hidden text
    expect(links.map((link) => accessibleName(link))).toEqual([
      'EN (English)',
      'NL (Nederlands)',
    ]);
    // A screen reader reads each name in its own language (WCAG 3.1.2)
    expect(links.map((link) => link.attributes('lang'))).toEqual(['en', 'nl']);
    expect(links.map((link) => link.attributes('aria-current'))).toEqual([
      'true',
      undefined,
    ]);

    expect(await checkA11y()).toHaveNoViolations();
  });

  // A page's address in another language is not its own with another prefix:
  // cardan.com has /diensten and /en/services, so the path cannot be kept.
  // The navigation loads the route's page with all it imports: a light one,
  // since /form's took over five seconds in a busy full run and timed out
  it('links to the home page of each language, not to the current page', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, {
      route: '/accessibility',
    });

    const links = wrapper.findAll('a');
    expect(links.length).toBeGreaterThan(1);
    for (const link of links) {
      expect(link.attributes('href')).not.toContain('accessibility');
    }
  });

  it('switches the language with a link, and marks the new one', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, {
      attachTo: document.body,
    });

    const dutch = wrapper
      .findAll('a')
      .find((link) => link.attributes('lang') === 'nl')!;
    await dutch.trigger('click');
    await vi.waitFor(() => expect(useNuxtApp().$i18n.locale.value).toBe('nl'));
    await nextTick();

    expect(
      wrapper.findAll('a').map((link) => link.attributes('aria-current')),
    ).toEqual([undefined, 'true']);
  });
});
