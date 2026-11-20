import { describe, it, expect, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Chip } from '#components';

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale('en');
});

describe('Chip', () => {
  it('groups a number label in the current locale', async () => {
    const wrapper = await mountSuspended(Chip, { props: { label: 12345 } });
    expect(wrapper.text()).toBe('12,345');

    await useNuxtApp().$i18n.setLocale('nl');
    await nextTick();
    expect(wrapper.text()).toBe('12.345');
  });

  it('shows a text label as it is', async () => {
    const wrapper = await mountSuspended(Chip, { props: { label: '12345' } });

    expect(wrapper.text()).toBe('12345');
  });
});
