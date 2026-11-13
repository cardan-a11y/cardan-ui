import { describe, it, expect, afterEach } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { FocusLoop } from '#components';

/**
 * The page around the loop: a header with a link, a live region and a
 * footer, next to the element the test mounts in.
 */
function addPage() {
  const header = document.createElement('header');
  header.innerHTML = '<a id="home" href="#">Home</a>';
  const live = document.createElement('div');
  live.setAttribute('aria-live', 'polite');
  const footer = document.createElement('footer');
  document.body.append(header, live, footer);

  return { header, live, footer, home: header.querySelector('a')! };
}

afterEach(() => {
  document.body
    .querySelectorAll('header, footer, [aria-live]')
    .forEach((element) => element.remove());
});

const twoButtons =
  '<button id="first">First</button><button id="last">Last</button>';

function mountLoop(props: Record<string, unknown> = {}, slot = twoButtons) {
  return mountSuspended(FocusLoop, {
    props: { isVisible: true, ...props },
    slots: { default: slot },
    attachTo: document.body,
  });
}

/** The sentinels before and after the content */
function sentinels(wrapper: { element: Element }) {
  const [start, , end] = wrapper.element.children;
  return { start: start as HTMLElement, end: end as HTMLElement };
}

/** A focus landing on a sentinel, from the element that had it */
function focusFrom(sentinel: HTMLElement, relatedTarget: Element | null) {
  sentinel.dispatchEvent(new FocusEvent('focus', { relatedTarget }));
}

const inert = (element: Element) => element.hasAttribute('inert');

describe('FocusLoop', () => {
  it('focuses the first element when it opens', async () => {
    addPage();
    await mountLoop();
    await nextTick();

    expect(document.activeElement?.id).toBe('first');
  });

  it('focuses the autofocus element instead, and nothing with autoFocus off', async () => {
    addPage();
    await mountLoop(
      {},
      '<button id="first">First</button><button id="auto" autofocus>Auto</button>',
    );
    await nextTick();
    expect(document.activeElement?.id).toBe('auto');

    const wrapper = await mountLoop({ autoFocus: false });
    await nextTick();
    expect(wrapper.element.contains(document.activeElement)).toBe(false);
  });

  it('makes the rest of the page inert while open, except live regions, and releases it', async () => {
    const { header, live, footer } = addPage();
    const wrapper = await mountLoop();
    await nextTick();

    expect(inert(header)).toBe(true);
    expect(inert(footer)).toBe(true);
    expect(inert(live)).toBe(false);
    // Not the loop, nor the element it is mounted in
    expect(inert(wrapper.element)).toBe(false);
    expect(inert(wrapper.element.parentElement!)).toBe(false);

    await wrapper.setProps({ isVisible: false });

    expect(inert(header)).toBe(false);
    expect(inert(footer)).toBe(false);
    expect(document.querySelectorAll('[inert]')).toHaveLength(0);
  });

  it('keeps the toasts reachable inside #teleports, and nothing else for a live region deeper down', async () => {
    const { header } = addPage();
    const teleports = document.createElement('div');
    teleports.innerHTML =
      '<div class="toast-manager" aria-live="polite"><button>Close</button></div><div id="other"></div>';
    // A page section with a tooltip in it: inert as a whole, trigger included
    const section = document.createElement('section');
    section.innerHTML =
      '<div class="tooltip-wrapper" aria-live="polite"><button>More info</button></div>';
    document.body.append(teleports, section);
    const wrapper = await mountLoop();
    await nextTick();

    expect(inert(header)).toBe(true);
    expect(inert(teleports)).toBe(false);
    expect(inert(teleports.querySelector('.toast-manager')!)).toBe(false);
    expect(inert(teleports.querySelector('#other')!)).toBe(true);
    expect(inert(section)).toBe(true);

    await wrapper.setProps({ isVisible: false });
    expect(inert(teleports.querySelector('#other')!)).toBe(false);
    expect(inert(section)).toBe(false);
    teleports.remove();
    section.remove();
  });

  it('leaves what was inert already, as another loop keeps it', async () => {
    const { header, footer } = addPage();
    header.setAttribute('inert', '');
    const wrapper = await mountLoop();
    await nextTick();

    expect(inert(footer)).toBe(true);
    await wrapper.setProps({ isVisible: false });

    expect(inert(header)).toBe(true);
    expect(inert(footer)).toBe(false);
  });

  it('releases the page when it unmounts while open', async () => {
    const { header } = addPage();
    const wrapper = await mountLoop();
    await nextTick();
    expect(inert(header)).toBe(true);

    wrapper.unmount();

    expect(inert(header)).toBe(false);
  });

  it('does not lock the page for a loop that closed again before it rendered', async () => {
    const { header } = addPage();
    const visible = ref(false);
    await mountSuspended(
      defineComponent({
        setup: () => () =>
          h(FocusLoop, { isVisible: visible.value }, () => h('button', 'One')),
      }),
      { attachTo: document.body },
    );

    // Open and closed in one tick: the open never renders
    visible.value = true;
    visible.value = false;
    await nextTick();
    await nextTick();

    expect(inert(header)).toBe(false);
    expect(document.querySelectorAll('[inert]')).toHaveLength(0);
  });

  it('makes nothing inert when it is not modal', async () => {
    const { header } = addPage();
    await mountLoop({ modal: false });
    await nextTick();

    expect(inert(header)).toBe(false);
    expect(document.activeElement?.id).toBe('first');
  });

  it('is out of the way when disabled', async () => {
    const { header } = addPage();
    const wrapper = await mountLoop({ disabled: true });
    await nextTick();

    expect(inert(header)).toBe(false);
    const { start, end } = sentinels(wrapper);
    expect(start.getAttribute('tabindex')).toBe('-1');
    expect(end.getAttribute('tabindex')).toBe('-1');
  });

  it('wraps Tab from the last element to the first, and Shift+Tab from the first to the last', async () => {
    addPage();
    const wrapper = await mountLoop();
    await nextTick();
    const { start, end } = sentinels(wrapper);
    const first = document.getElementById('first')!;
    const last = document.getElementById('last')!;

    focusFrom(end, last);
    expect(document.activeElement).toBe(first);

    focusFrom(start, first);
    expect(document.activeElement).toBe(last);
  });

  it('skips a hidden or inert element at either end, when it opens and when it wraps', async () => {
    addPage();
    // happy-dom computes an inline display: none for checkVisibility, not
    // the [hidden] attribute or a stylesheet: those are the browser suite's
    const wrapper = await mountLoop(
      {},
      '<button style="display: none">Hidden</button>' +
        '<button id="first">First</button><button id="last">Last</button>' +
        '<div inert><button>Inert</button></div>',
    );
    await nextTick();
    const { start, end } = sentinels(wrapper);
    const first = document.getElementById('first')!;
    const last = document.getElementById('last')!;
    expect(document.activeElement).toBe(first);

    focusFrom(end, last);
    expect(document.activeElement).toBe(first);

    focusFrom(start, first);
    expect(document.activeElement).toBe(last);
  });

  it('sends a Tab from before the loop to the first element, and one from after it to the last', async () => {
    const { home } = addPage();
    const wrapper = await mountLoop({ modal: false });
    await nextTick();
    const { start, end } = sentinels(wrapper);

    focusFrom(start, home);
    expect(document.activeElement?.id).toBe('first');

    focusFrom(end, home);
    expect(document.activeElement?.id).toBe('last');

    // A focus from a script, with no element before it
    focusFrom(start, null);
    expect(document.activeElement?.id).toBe('first');
  });

  it('wraps the same way after it is closed and opened again', async () => {
    addPage();
    const wrapper = await mountLoop();
    await nextTick();

    await wrapper.setProps({ isVisible: false });
    await wrapper.setProps({ isVisible: true });
    await nextTick();

    const { start } = sentinels(wrapper);
    const home = document.getElementById('home');
    focusFrom(start, home);
    expect(document.activeElement?.id).toBe('first');
  });
});
