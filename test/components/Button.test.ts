import { describe, it, expect, vi } from 'vitest';
import { computed } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Button, NuxtLink } from '#components';
import { checkA11y } from '../a11y';

describe('Button', () => {
  it('renders a button with its label', async () => {
    const wrapper = await mountSuspended(Button, {
      props: { label: 'Save' },
      attachTo: document.body,
    });

    expect(wrapper.get('button').text()).toContain('Save');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('keeps an accessible name when the label is hidden', async () => {
    const wrapper = await mountSuspended(Button, {
      props: {
        label: 'Close',
        icon: 'material-symbols:close-rounded',
        hideLabel: true,
      },
      attachTo: document.body,
    });

    const button = wrapper.get('button');
    const name = button.attributes('aria-label') ?? button.text();
    expect(name).toContain('Close');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('stays focusable while loading, but says so and ignores its click', async () => {
    const wrapper = await mountSuspended(Button, {
      props: { label: 'Save', loading: true },
      attachTo: document.body,
    });

    const button = wrapper.get('button');
    expect(button.attributes('disabled')).toBeUndefined();
    expect(button.attributes('aria-disabled')).toBe('true');
    expect(button.attributes('aria-busy')).toBe('true');

    await button.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();

    await wrapper.setProps({ loading: false });
    await button.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('says in hidden text that a link opens in a new window', async () => {
    const wrapper = await mountSuspended(Button, {
      props: {
        label: 'Documentation',
        to: 'https://example.com/docs',
        target: '_blank',
      },
      attachTo: document.body,
    });

    const link = wrapper.get('a');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.get('.visuallyhidden').text()).toBe('(open in new window)');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('keeps the current page on a disabled link, which has no href', async () => {
    // The link state NuxtLink would have for the current page
    const useLink = vi.spyOn(NuxtLink, 'useLink').mockReturnValue({
      isActive: computed(() => true),
      isExactActive: computed(() => true),
    } as unknown as ReturnType<typeof NuxtLink.useLink>);

    const wrapper = await mountSuspended(Button, {
      props: { label: 'Buttons', to: '/buttons', disabled: true },
      attachTo: document.body,
    });

    // Disabled: no href, so it cannot be followed or reached with Tab
    const link = wrapper.get('a');
    expect(link.attributes('href')).toBeUndefined();
    expect(link.attributes('role')).toBe('link');
    expect(link.attributes('aria-disabled')).toBe('true');
    expect(link.classes()).toContain('disabled');

    // Still the current page: its look and aria-current, as NuxtLink sets them
    expect(link.attributes('aria-current')).toBe('page');
    expect(link.classes()).toContain('router-link-active');
    expect(link.classes()).toContain('router-link-exact-active');
    expect(await checkA11y()).toHaveNoViolations();

    // Enabled, NuxtLink says it itself: Button adds nothing
    await wrapper.setProps({ disabled: false });
    const enabled = wrapper.get('a');
    expect(enabled.attributes('href')).toBe('/buttons');
    expect(enabled.classes()).not.toContain('disabled');

    useLink.mockRestore();
  });
});
