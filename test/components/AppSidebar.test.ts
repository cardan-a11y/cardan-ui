import { beforeEach, describe, it, expect } from 'vitest';
import { h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { AppSidebar } from '#components';
import { accessibleName, checkA11y, roleOf } from '../a11y';

/**
 * A labelled `aside` (a complementary landmark) around the app's navigation.
 * With `collapsible`, a disclosure button folds it to a rail of icons: folded,
 * the text of its links is hidden from view only, so they keep their names
 * and stay usable (the docblock). What folding looks like is the browser
 * suite's.
 */
const slots = {
  header: () => h('span', 'Cardan'),
  default: () =>
    h('nav', { 'aria-label': 'Main navigation' }, [
      h('a', { href: '/dashboard' }, 'Dashboard'),
    ]),
};

describe('AppSidebar', () => {
  beforeEach(() => {
    localStorage.removeItem(APP_SIDEBAR_STORAGE_KEY);
  });

  it('is a labelled complementary landmark around its header and navigation', async () => {
    const wrapper = await mountSuspended(AppSidebar, {
      slots,
      attachTo: document.body,
    });

    const aside = wrapper.get('aside');
    expect(roleOf(aside)).toBe('complementary');
    expect(accessibleName(aside)).toBe('Sidebar menu');
    expect(aside.text()).toContain('Cardan');
    expect(accessibleName(aside.get('nav'))).toBe('Main navigation');

    // Not collapsible unless asked: no button
    expect(wrapper.find('button').exists()).toBe(false);

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('takes its own label, and names its button after it', async () => {
    const wrapper = await mountSuspended(AppSidebar, {
      props: { id: 'docs-sidebar', label: 'Documentation', collapsible: true },
      slots,
      attachTo: document.body,
    });

    const aside = wrapper.get('aside');
    expect(accessibleName(aside)).toBe('Documentation');

    const button = wrapper.get('button');
    expect(accessibleName(button)).toBe('Documentation');
    expect(button.attributes('aria-controls')).toBe('docs-sidebar');
    expect(document.getElementById('docs-sidebar')).toBe(aside.element);
  });

  it('folds and unfolds with its disclosure button, and keeps the choice', async () => {
    const wrapper = await mountSuspended(AppSidebar, {
      props: { collapsible: true },
      slots,
      attachTo: document.body,
    });

    const aside = wrapper.get('aside');
    const button = wrapper.get('button');

    // The button names what it controls and says whether that is open
    expect(roleOf(button)).toBe('button');
    expect(accessibleName(button)).toBe('Sidebar menu');
    expect(document.getElementById(button.attributes('aria-controls')!)).toBe(
      aside.element,
    );
    expect(button.attributes('aria-expanded')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    await button.trigger('click');
    await nextTick();

    expect(button.attributes('aria-expanded')).toBe('false');
    expect(localStorage.getItem(APP_SIDEBAR_STORAGE_KEY)).toBe('true');
    // Folded, the landmark and its button keep their names
    expect(accessibleName(aside)).toBe('Sidebar menu');
    expect(accessibleName(button)).toBe('Sidebar menu');
    expect(await checkA11y()).toHaveNoViolations();

    await button.trigger('click');
    await nextTick();

    expect(button.attributes('aria-expanded')).toBe('true');
    expect(localStorage.getItem(APP_SIDEBAR_STORAGE_KEY)).toBe('false');
  });

  it('opens folded when that was the choice in this browser', async () => {
    localStorage.setItem(APP_SIDEBAR_STORAGE_KEY, 'true');

    const wrapper = await mountSuspended(AppSidebar, {
      props: { collapsible: true },
      slots,
    });
    await nextTick();

    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
  });
});
