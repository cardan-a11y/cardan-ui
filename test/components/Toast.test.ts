import { describe, it, expect, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { nextTick } from 'vue';
import { Toast, ToastManager } from '#components';
import { useToast } from '#imports';
import { accessibleName, checkA11y, expectFocused } from '../a11y';
import { addToPage } from '../dom';

/**
 * The toasts and their one live region. The timer is a CSS animation:
 * happy-dom runs none, so these tests read the play state the component
 * sets and send the `animationend` the browser would; that a paused toast
 * really waits (WCAG 2.2.1) is for the browser suite.
 */
function timer(wrapper: { find: (selector: string) => { element: Element } }) {
  return wrapper.find('.toast__timer').element as HTMLElement;
}

function playState(wrapper: {
  find: (selector: string) => { element: Element };
}) {
  return timer(wrapper)
    .style.getPropertyValue('--toast-animation-play-state')
    .trim();
}

/** The live region of the manager, teleported to #teleports */
function liveRegion() {
  return document.querySelector('#teleports [aria-live]');
}

/** The close button of the toast with this text */
function closeButton(text: string) {
  const toast = Array.from(
    liveRegion()?.querySelectorAll('section') ?? [],
  ).find((toast) => toast.textContent?.includes(text));
  const button = toast?.querySelector('button');
  if (!button) throw new Error(`No toast with ${text}`);
  return button;
}

afterEach(() => {
  useToast().hideToast();
});

describe('Toast', () => {
  it('pauses its timer while keyboard focus or the pointer is on it', async () => {
    const wrapper = await mountSuspended(Toast, {
      props: { label: 'Saved', timeout: 5000 },
      attachTo: document.body,
    });
    expect(playState(wrapper)).toBe('running');

    const close = wrapper.get('button').element as HTMLButtonElement;
    close.focus();
    await nextTick();
    expect(playState(wrapper)).toBe('paused');

    close.blur();
    await nextTick();
    expect(playState(wrapper)).toBe('running');

    await wrapper.trigger('mouseover');
    expect(playState(wrapper)).toBe('paused');

    await wrapper.trigger('mouseleave');
    expect(playState(wrapper)).toBe('running');
  });

  it('hides when its timer runs out, and never without a timeout', async () => {
    const timed = await mountSuspended(Toast, {
      props: { label: 'Saved', timeout: 5000, id: 'timed' },
      attachTo: document.body,
    });
    timer(timed).dispatchEvent(new Event('animationend'));
    expect(timed.emitted('hide')).toEqual([['timed']]);

    const lasting = await mountSuspended(Toast, {
      props: { label: 'Saved', id: 'lasting' },
      attachTo: document.body,
    });
    timer(lasting).dispatchEvent(new Event('animationend'));
    expect(lasting.emitted('hide')).toBeUndefined();
  });

  it('is announced by the one live region of the manager, which is there before any toast', async () => {
    await mountSuspended(ToastManager, { attachTo: document.body });

    const region = liveRegion();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.textContent?.trim()).toBe('');

    useToast().createToast({ label: 'Saved' });
    await nextTick();

    expect(liveRegion()).toBe(region);
    const toast = region?.querySelector('section');
    expect(toast?.textContent).toContain('Saved');
    // No role of its own, so it is not announced twice
    expect(toast?.hasAttribute('role')).toBe(false);
    expect(accessibleName(closeButton('Saved'))).toBe('Close');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('moves focus from a closed toast to the next one, the one before, and then back where it came from', async () => {
    await mountSuspended(ToastManager, { attachTo: document.body });
    const origin = addToPage('<button>Save</button>');
    const { createToast } = useToast();
    createToast({ label: 'First' });
    createToast({ label: 'Second' });
    createToast({ label: 'Third' });
    await nextTick();

    origin.focus();
    closeButton('Second').focus();

    closeButton('Second').click();
    await nextTick();
    expectFocused(closeButton('Third'));

    // The last one: the one before
    closeButton('Third').click();
    await nextTick();
    expectFocused(closeButton('First'));

    closeButton('First').click();
    await nextTick();
    expectFocused(origin);
  });

  it('leaves focus alone when a toast without it closes', async () => {
    await mountSuspended(ToastManager, { attachTo: document.body });
    const field = addToPage('<input aria-label="Name" />');
    const { createToast, hideToast } = useToast();
    const id = createToast({ label: 'Saved' });
    await nextTick();

    field.focus();
    hideToast(id);
    await nextTick();

    expectFocused(field);
  });
});
