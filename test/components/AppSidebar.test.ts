import { beforeEach, describe, it, expect } from 'vitest';
import { h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { AppSidebar } from '#components';
import { checkA11y } from '../a11y';

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

  it('is a labelled landmark around its header and navigation', async () => {
    const wrapper = await mountSuspended(AppSidebar, {
      slots,
      attachTo: document.body,
    });

    const aside = wrapper.get('aside');
    expect(aside.attributes('id')).toBe('app-sidebar');
    expect(aside.attributes('aria-label')).toBe('Sidebar menu');
    expect(aside.get('.app-sidebar-header').text()).toBe('Cardan');
    expect(aside.find('.app-sidebar-content nav').exists()).toBe(true);

    // Not collapsible unless asked: no button, no state
    expect(wrapper.find('button').exists()).toBe(false);
    expect(aside.classes()).not.toContain('is-collapsible');
    expect(aside.classes()).not.toContain('is-collapsed');

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('takes its own label and id', async () => {
    const wrapper = await mountSuspended(AppSidebar, {
      props: { id: 'docs-sidebar', label: 'Documentation' },
      slots,
    });

    const aside = wrapper.get('aside');
    expect(aside.attributes('id')).toBe('docs-sidebar');
    expect(aside.attributes('aria-label')).toBe('Documentation');
  });

  it('names its button after its own label', async () => {
    const wrapper = await mountSuspended(AppSidebar, {
      props: { id: 'docs-sidebar', label: 'Documentation', collapsible: true },
      slots,
    });

    const button = wrapper.get('button');
    expect(button.text()).toBe('Documentation');
    expect(button.attributes('aria-controls')).toBe('docs-sidebar');
  });

  it('folds and unfolds with its button, and keeps the choice', async () => {
    const wrapper = await mountSuspended(AppSidebar, {
      props: { collapsible: true },
      slots,
      attachTo: document.body,
    });

    const aside = wrapper.get('aside');
    const button = wrapper.get('button');

    // The button names what it controls and says whether that is open
    expect(button.text()).toBe('Sidebar menu');
    expect(button.attributes('aria-controls')).toBe('app-sidebar');
    expect(button.attributes('aria-expanded')).toBe('true');
    expect(aside.classes()).toContain('is-collapsible');
    expect(aside.classes()).not.toContain('is-collapsed');

    await button.trigger('click');
    await nextTick();

    expect(button.attributes('aria-expanded')).toBe('false');
    expect(aside.classes()).toContain('is-collapsed');
    expect(localStorage.getItem(APP_SIDEBAR_STORAGE_KEY)).toBe('true');

    // Folded, the navigation is still in the accessibility tree
    expect(aside.get('nav a').text()).toBe('Dashboard');
    expect(await checkA11y()).toHaveNoViolations();

    await button.trigger('click');
    await nextTick();

    expect(button.attributes('aria-expanded')).toBe('true');
    expect(aside.classes()).not.toContain('is-collapsed');
    expect(localStorage.getItem(APP_SIDEBAR_STORAGE_KEY)).toBe('false');
  });

  it('opens folded when that was the choice in this browser', async () => {
    localStorage.setItem(APP_SIDEBAR_STORAGE_KEY, 'true');

    const wrapper = await mountSuspended(AppSidebar, {
      props: { collapsible: true },
      slots,
    });
    await nextTick();

    expect(wrapper.get('aside').classes()).toContain('is-collapsed');
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
  });
});
