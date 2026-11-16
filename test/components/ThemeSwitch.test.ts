import { describe, it, expect, afterEach } from 'vitest';
import { nextTick, type Component } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { ThemeSwitch, ThemeToggle } from '#components';
import { accessibleName, checkA11y } from '../a11y';

/**
 * A toggle button (https://www.w3.org/WAI/ARIA/apg/patterns/button/): its
 * name, "Dark mode", stays the same and `aria-pressed` says whether dark
 * mode is on, so the name never contradicts the state.
 */
async function mountButton(component: Component) {
  const wrapper = await mountSuspended(component, { attachTo: document.body });
  // ClientOnly renders the button after mount
  await nextTick();
  return { wrapper, button: wrapper.get('button') };
}

afterEach(() => {
  useColorMode().preference = 'light';
});

describe.each([
  ['ThemeSwitch', ThemeSwitch],
  ['ThemeToggle', ThemeToggle],
] as const)('%s', (_, component) => {
  it('is a toggle button named "Dark mode", pressed only in dark mode', async () => {
    useColorMode().preference = 'light';
    const { button } = await mountButton(component);

    expect(accessibleName(button.element)).toBe('Dark mode');
    expect(button.attributes('aria-pressed')).toBe('false');
    expect(await checkA11y()).toHaveNoViolations();

    await button.trigger('click');
    await nextTick();

    expect(useColorMode().preference).toBe('dark');
    expect(button.attributes('aria-pressed')).toBe('true');
    expect(accessibleName(button.element)).toBe('Dark mode');

    await button.trigger('click');
    await nextTick();

    expect(useColorMode().preference).toBe('light');
    expect(button.attributes('aria-pressed')).toBe('false');
  });
});

describe('ThemeSwitch', () => {
  it('emits the new color mode', async () => {
    useColorMode().preference = 'light';
    const { wrapper, button } = await mountButton(ThemeSwitch);

    await button.trigger('click');

    expect(wrapper.emitted('click')).toEqual([['dark']]);
  });
});
