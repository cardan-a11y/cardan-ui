import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { SidebarLayout } from '#components';
import { checkA11y, roleOf } from '../a11y';

/**
 * Which column sits where on screen is CSS, and the browser suite's. What is
 * pinned here is the document order, which focus and reading order follow,
 * and that the panel brings no landmark of its own.
 */
const slots = {
  default: () => h('p', 'Main content'),
  side: () =>
    h('nav', { 'aria-label': 'On this page' }, [
      h('a', { href: '#first' }, 'First section'),
    ]),
};

/** The main content and the side panel's navigation, found by content */
function parts(wrapper: VueWrapper) {
  const main = wrapper
    .findAll('p')
    .find((paragraph) => paragraph.text() === 'Main content')!.element;
  const side = wrapper.get('nav').element;
  return { main, side };
}

/** Whether `a` comes before `b` in the document */
function precedes(a: Node, b: Node) {
  return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('SidebarLayout', () => {
  it('puts the side panel after the main content, as a plain wrapper of its content', async () => {
    const wrapper = await mountSuspended(SidebarLayout, {
      slots,
      attachTo: document.body,
    });

    const { main, side } = parts(wrapper);
    expect(precedes(main, side)).toBe(true);

    // The panel has no role of its own: its content brings the landmark
    expect(roleOf(side.parentElement!)).toBeNull();

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('puts the side panel first in the document with side="start"', async () => {
    const wrapper = await mountSuspended(SidebarLayout, {
      props: { side: 'start', sticky: true, beside: 'xl' },
      slots,
      attachTo: document.body,
    });

    // Focus and reading order follow what is on screen
    const { main, side } = parts(wrapper);
    expect(precedes(side, main)).toBe(true);

    expect(await checkA11y()).toHaveNoViolations();
  });
});
