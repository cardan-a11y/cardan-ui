import { afterEach, describe, it, expect, vi } from 'vitest';
import { computed } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Button, NuxtLink } from '#components';
import { accessibleName, checkA11y, roleOf } from '../a11y';

describe('Button', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a button named by its label, which does not submit a form', async () => {
    const wrapper = await mountSuspended(Button, {
      props: { label: 'Save' },
      attachTo: document.body,
    });

    const button = wrapper.get('button');
    expect(roleOf(button)).toBe('button');
    expect(accessibleName(button)).toBe('Save');
    expect(button.attributes('type')).toBe('button');

    await button.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('keeps its label as the name when it shows only its icon', async () => {
    const wrapper = await mountSuspended(Button, {
      props: {
        label: 'Close',
        icon: 'material-symbols:close-rounded',
        hideLabel: true,
      },
      attachTo: document.body,
    });

    expect(accessibleName(wrapper.get('button'))).toBe('Close');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('takes an aria-label as its name instead of the label', async () => {
    const wrapper = await mountSuspended(Button, {
      props: { label: 'Edit', ariaLabel: 'Edit the audit' },
      attachTo: document.body,
    });

    expect(accessibleName(wrapper.get('button'))).toBe('Edit the audit');
  });

  it('is disabled for real, without its title', async () => {
    const wrapper = await mountSuspended(Button, {
      props: { label: 'Save', title: 'Saves the draft', disabled: true },
      attachTo: document.body,
    });

    const button = wrapper.get('button');
    expect((button.element as HTMLButtonElement).disabled).toBe(true);
    expect(button.attributes('title')).toBeUndefined();

    await wrapper.setProps({ disabled: false });
    expect(button.attributes('title')).toBe('Saves the draft');
  });

  it('stays focusable while loading, but says so and ignores its click', async () => {
    const wrapper = await mountSuspended(Button, {
      props: { label: 'Save', loading: true, type: 'submit' },
      attachTo: document.body,
    });

    const button = wrapper.get('button');
    expect((button.element as HTMLButtonElement).disabled).toBe(false);
    expect(button.attributes('aria-disabled')).toBe('true');
    expect(button.attributes('aria-busy')).toBe('true');
    expect(accessibleName(button)).toContain('Save');

    // No event, and no submit of its form
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.element.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(wrapper.emitted('click')).toBeUndefined();

    await wrapper.setProps({ loading: false });
    expect(button.attributes('aria-disabled')).toBeUndefined();
    expect(button.attributes('aria-busy')).toBeUndefined();
    await button.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('is a link with to or href', async () => {
    const wrapper = await mountSuspended(Button, {
      props: { label: 'Buttons', to: '/buttons' },
      attachTo: document.body,
    });

    const link = wrapper.get('a');
    expect(roleOf(link)).toBe('link');
    expect(accessibleName(link)).toBe('Buttons');
    expect(link.attributes('href')).toBe('/buttons');
  });

  it('says in its name that a link opens in a new window', async () => {
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
    expect(accessibleName(link)).toBe('Documentation (open in new window)');
    expect(await checkA11y()).toHaveNoViolations();

    // Also when an aria-label replaces the content
    await wrapper.setProps({ ariaLabel: 'The documentation' });
    expect(accessibleName(wrapper.get('a'))).toBe(
      'The documentation (open in new window)',
    );

    // A download opens no window
    await wrapper.setProps({ ariaLabel: undefined, download: true });
    expect(accessibleName(wrapper.get('a'))).toBe('Documentation');
  });

  // That the link is not followed needs a browser: a NuxtLink in this
  // environment does not navigate on a click, loading or not
  it('says a loading link is busy and ignores its click', async () => {
    const wrapper = await mountSuspended(Button, {
      props: { label: 'Buttons', to: '/buttons', loading: true },
      attachTo: document.body,
    });

    const link = wrapper.get('a');
    expect(roleOf(link)).toBe('link');
    expect(link.attributes('aria-disabled')).toBe('true');
    expect(link.attributes('aria-busy')).toBe('true');

    await link.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();

    await wrapper.setProps({ loading: false });
    await wrapper.get('a').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('keeps the current page on a disabled link, which has no href', async () => {
    // The link state NuxtLink would have for the current page
    vi.spyOn(NuxtLink, 'useLink').mockReturnValue({
      isActive: computed(() => true),
      isExactActive: computed(() => true),
    } as unknown as ReturnType<typeof NuxtLink.useLink>);

    const wrapper = await mountSuspended(Button, {
      props: { label: 'Buttons', to: '/buttons', disabled: true },
      attachTo: document.body,
    });

    // Disabled: no href, so it cannot be followed or reached with Tab; still
    // a link, said to be disabled
    const link = wrapper.get('a');
    expect(link.attributes('href')).toBeUndefined();
    expect(roleOf(link)).toBe('link');
    expect(accessibleName(link)).toBe('Buttons');
    expect(link.attributes('aria-disabled')).toBe('true');

    // Still the current page, as NuxtLink says it of an enabled one
    expect(link.attributes('aria-current')).toBe('page');
    expect(await checkA11y()).toHaveNoViolations();

    // Enabled, NuxtLink says it itself: Button adds nothing
    await wrapper.setProps({ disabled: false });
    const enabled = wrapper.get('a');
    expect(enabled.attributes('href')).toBe('/buttons');
    expect(enabled.attributes('aria-disabled')).toBeUndefined();
    expect(enabled.attributes('role')).toBeUndefined();
  });
});
