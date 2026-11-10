import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { LanguageSwitcher } from '#components';

describe('LanguageSwitcher', () => {
  // A page's address in another language is not its own with another prefix:
  // cardan.com has /diensten and /en/services, so the path cannot be kept
  it('links to the home page of each language, not to the current page', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, { route: '/form' });

    const links = wrapper.findAll('a');
    expect(links.length).toBeGreaterThan(1);
    for (const link of links) {
      expect(link.attributes('href')).not.toContain('form');
    }
  });

  it('marks the current language', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher);

    const current = wrapper.findAll('a[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0]!.classes()).toContain('active');
  });
});
