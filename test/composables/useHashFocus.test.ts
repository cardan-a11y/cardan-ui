import { afterEach, describe, it, expect, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { expectFocused } from '../a11y';
import { addToPage } from '../dom';

/** A page that calls focusHash itself, as one whose content arrives later */
const Page = defineComponent({
  setup(_, { expose }) {
    expose(useHashFocus());
    return () => h('a', { href: '/somewhere' }, 'A link of the page');
  },
});

/** Mounts the page at an address and returns its focusHash */
async function atAddress(address: string) {
  const wrapper = await mountSuspended(Page, {
    route: address,
    attachTo: document.body,
  });
  return (wrapper.vm as unknown as ReturnType<typeof useHashFocus>).focusHash;
}

/** An element on the page whose scrolling the test watches */
function addTarget(html: string) {
  const element = addToPage(html);
  element.scrollIntoView = vi.fn();
  return element;
}

describe('useHashFocus', () => {
  afterEach(async () => {
    await useRouter().push('/');
  });

  it('focuses the element the hash names, made focusable for it, and brings it to the top', async () => {
    const section = addTarget(
      '<section id="non-text-content"><h2>Non-text content</h2></section>',
    );
    const focus = vi.spyOn(section, 'focus');

    const focusHash = await atAddress('/buttons#non-text-content');

    expect(focusHash()).toBe(true);
    expect(section.getAttribute('tabindex')).toBe('-1');
    expectFocused(section);
    // The browser does not jump to it; it scrolls to the top, under what
    // sticks there (the scroll padding)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(section.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
  });

  it('leaves the tab order of an element that takes focus already', async () => {
    const button = addTarget('<button id="filters">Filters</button>');
    const region = addTarget('<div id="results" tabindex="0">Results</div>');

    let focusHash = await atAddress('/buttons#filters');
    expect(focusHash()).toBe(true);
    expectFocused(button);
    expect(button.hasAttribute('tabindex')).toBe(false);

    focusHash = await atAddress('/buttons#results');
    expect(focusHash()).toBe(true);
    expectFocused(region);
    expect(region.getAttribute('tabindex')).toBe('0');
  });

  it('finds an id with characters the address encodes', async () => {
    const section = addTarget('<section id="café">Café</section>');

    const focusHash = await atAddress('/buttons#caf%C3%A9');

    expect(focusHash()).toBe(true);
    expectFocused(section);
  });

  it('says so when there is nothing to focus, and leaves focus where it is', async () => {
    const button = addToPage('<button>Somewhere else</button>');
    button.focus();

    for (const address of ['/buttons', '/buttons#nothing-here']) {
      const focusHash = await atAddress(address);

      expect(focusHash()).toBe(false);
      expectFocused(button);
    }
  });
});
