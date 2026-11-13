import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { CopyButton } from '#components';
import { accessibleName, checkA11y } from '../a11y';

/**
 * The result of a copy is announced through a status region that is on the
 * page from the start (WCAG 4.1.3), not only through the button's name: a
 * screen reader announces a change in a live region it already knows.
 */
async function mountCopyButton(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(writeText) },
    configurable: true,
  });

  const wrapper = await mountSuspended(CopyButton, {
    props: { text: 'https://cardan.nl' },
    attachTo: document.body,
  });

  return {
    button: wrapper.get('button'),
    status: wrapper.get('[role="status"]'),
    writeText: navigator.clipboard.writeText as ReturnType<typeof vi.fn>,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('CopyButton', () => {
  it('is a button named "Copy" next to an empty status region', async () => {
    const { button, status } = await mountCopyButton(async () => {});

    expect(accessibleName(button.element)).toBe('Copy');
    expect(status.text()).toBe('');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('copies the text and announces "Copied", then goes back to "Copy" after 2 seconds', async () => {
    const { button, status, writeText } = await mountCopyButton(async () => {});
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    await button.trigger('click');
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith('https://cardan.nl');
    expect(status.text()).toBe('Copied');
    expect(accessibleName(button.element)).toBe('Copied');

    vi.advanceTimersByTime(2000);
    await nextTick();

    expect(status.text()).toBe('');
    expect(accessibleName(button.element)).toBe('Copy');
  });

  it('announces "Copy failed" when the clipboard refuses', async () => {
    const { button, status } = await mountCopyButton(async () => {
      throw new DOMException('Document is not focused', 'NotAllowedError');
    });

    await button.trigger('click');
    await flushPromises();

    expect(status.text()).toBe('Copy failed');
    expect(accessibleName(button.element)).toBe('Copy failed');
  });

  it('empties the status before a second copy, so it is announced again', async () => {
    /** The status text at each moment the clipboard is written */
    const seen: string[] = [];
    const { button, status } = await mountCopyButton(async () => {
      seen.push(status.text());
    });

    await button.trigger('click');
    await flushPromises();
    await button.trigger('click');
    await flushPromises();

    expect(seen).toEqual(['', '']);
    expect(status.text()).toBe('Copied');
  });
});
