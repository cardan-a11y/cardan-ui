import { describe, it, expect, vi, afterEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';

/** A list with its top, the element useResultsFocus focuses */
const List = defineComponent({
  setup(_, { expose }) {
    const top = useTemplateRef<HTMLElement>('top');
    expose(useResultsFocus(top));

    return () => h('div', { ref: 'top', tabindex: '-1' }, 'Results');
  },
});

/** What the list exposes: the composable's two functions */
type Exposed = ReturnType<typeof useResultsFocus>;

/** Puts the list's top at a place in the viewport */
function placeTop(element: Element, top: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    top,
  } as DOMRect);
  const scroll = vi.fn();
  (element as HTMLElement).scrollIntoView = scroll;
  return scroll;
}

describe('useResultsFocus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('focuses the top of the results without the browser jumping to it', async () => {
    const wrapper = await mountSuspended(List, { attachTo: document.body });
    const top = wrapper.get('div').element as HTMLElement;
    const focus = vi.spyOn(top, 'focus');
    const scroll = placeTop(top, 200);

    await (wrapper.vm as unknown as Exposed).focusResults();

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(top);
    // In view: no scrolling
    expect(scroll).not.toHaveBeenCalled();
  });

  it('brings the top into view only when it scrolled out of it', async () => {
    const wrapper = await mountSuspended(List, { attachTo: document.body });
    const top = wrapper.get('div').element;

    // Above the viewport, as after paging at the end of a long list
    let scroll = placeTop(top, -400);
    await (wrapper.vm as unknown as Exposed).revealResults();
    expect(scroll).toHaveBeenCalledWith(
      expect.objectContaining({ block: 'start' }),
    );

    // Below the viewport, as under a tall set of filters
    vi.restoreAllMocks();
    scroll = placeTop(top, window.innerHeight + 10);
    await (wrapper.vm as unknown as Exposed).revealResults();
    expect(scroll).toHaveBeenCalled();

    // revealResults leaves focus alone
    expect(document.activeElement).not.toBe(top);
  });
});
