import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { SidebarLayout } from '#components';
import { checkA11y } from '../a11y';

const slots = {
  default: () => h('p', 'Main content'),
  side: () =>
    h('nav', { 'aria-label': 'On this page' }, [
      h('a', { href: '#first' }, 'First section'),
    ]),
};

/** The class names of the layout's columns, in document order */
function columns(wrapper: VueWrapper) {
  return wrapper
    .findAll('.sidebar-layout > *')
    .map((column) => column.classes()[0]);
}

describe('SidebarLayout', () => {
  it('puts the side panel after the main content, beside it from 1024px', async () => {
    const wrapper = await mountSuspended(SidebarLayout, {
      slots,
      attachTo: document.body,
    });

    expect(columns(wrapper)).toEqual([
      'sidebar-layout-main',
      'sidebar-layout-side',
    ]);

    const layout = wrapper.get('.sidebar-layout');
    expect(layout.classes()).toContain('sidebar-layout--side-end');
    expect(layout.classes()).toContain('has-side');
    expect(layout.classes()).toContain('beside-lg');
    expect(layout.classes()).not.toContain('is-beside');
    expect(layout.classes()).not.toContain('is-sticky');

    // The panel has no role of its own: its content brings the landmark
    expect(wrapper.get('.sidebar-layout-side').element.tagName).toBe('DIV');

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('puts the side panel first in the document with side="start"', async () => {
    const wrapper = await mountSuspended(SidebarLayout, {
      props: { side: 'start', sticky: true, beside: 'xl' },
      slots,
      attachTo: document.body,
    });

    // Focus and reading order follow what is on screen
    expect(columns(wrapper)).toEqual([
      'sidebar-layout-side',
      'sidebar-layout-main',
    ]);

    const layout = wrapper.get('.sidebar-layout');
    expect(layout.classes()).toContain('sidebar-layout--side-start');
    expect(layout.classes()).toContain('beside-xl');
    expect(layout.classes()).toContain('is-sticky');

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('follows a boolean the app works out for its own breakpoint', async () => {
    const wrapper = await mountSuspended(SidebarLayout, {
      props: { beside: false },
      slots,
    });

    const layout = wrapper.get('.sidebar-layout');
    expect(layout.classes()).not.toContain('is-beside');
    expect(layout.classes().some((name) => name.startsWith('beside-'))).toBe(
      false,
    );

    await wrapper.setProps({ beside: true });

    expect(layout.classes()).toContain('is-beside');
  });

  it('is one column without a side panel', async () => {
    const wrapper = await mountSuspended(SidebarLayout, {
      slots: { default: slots.default },
    });

    expect(columns(wrapper)).toEqual(['sidebar-layout-main']);
    expect(wrapper.get('.sidebar-layout').classes()).not.toContain('has-side');
  });
});
