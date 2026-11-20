import { describe, it, expect, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { PricingCard } from '#components';

const nbsp = '\u00a0';

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale('en');
});

describe('PricingCard', () => {
  const props = { title: 'Plus', description: 'Werken aan toegankelijkheid.' };

  it('rounds the price to whole euros', async () => {
    const wrapper = await mountSuspended(PricingCard, {
      props: { ...props, price: 1499.5 },
    });

    expect(wrapper.text()).toContain('€1,500');
  });

  it('shows the price in Dutch in the Dutch locale', async () => {
    await useNuxtApp().$i18n.setLocale('nl');
    const wrapper = await mountSuspended(PricingCard, {
      props: { ...props, price: 1500 },
    });

    expect(wrapper.text()).toContain(`€${nbsp}1.500`);
  });
});
