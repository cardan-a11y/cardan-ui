import { describe, it, expect, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';

const nbsp = '\u00a0';

const CurrentLocaleNumbers = defineComponent({
  setup() {
    const { formatNumber, formatPercent, formatCurrency } = useNumber();
    return () =>
      h('p', [
        formatNumber(1234.5),
        ' | ',
        formatPercent(0.215, { decimals: 1 }),
        ' | ',
        formatCurrency(1999, { cents: true }),
      ]);
  },
});

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale('en');
});

describe('useNumber', () => {
  it('formats in the current locale', async () => {
    const wrapper = await mountSuspended(CurrentLocaleNumbers);

    expect(wrapper.text()).toBe('1,234.5 | 21.5% | €19.99');
  });

  it('follows a change of locale', async () => {
    const wrapper = await mountSuspended(CurrentLocaleNumbers);

    await useNuxtApp().$i18n.setLocale('nl');
    await nextTick();

    expect(wrapper.text()).toBe(`1.234,5 | 21,5% | €${nbsp}19,99`);
  });
});
