import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Tooltip } from '#components';
import {
  accessibleName,
  expectFocused,
  expectNoViolations,
  roleOf,
} from '../a11y';
import { addToPage, fakePopover, leave, toggle } from '../dom';

/**
 * A toggletip (see its docblock): a button that shows a text, which is
 * rendered into a live region that was there before, so a screen reader
 * announces it while focus stays on the button. happy-dom has no Popover
 * API: the announcement itself, Escape and the light dismiss are for the
 * browser suite; this pins what the component does on the browser's events.
 */

async function mountTooltip(
  props: Record<string, unknown> = {},
  text = 'At least 12 characters.',
) {
  const wrapper = await mountSuspended(Tooltip, {
    props: { label: 'Password', ...props },
    slots: { default: text },
    attachTo: document.body,
  });

  const trigger = wrapper.get('button[popovertarget]');
  const content = document.getElementById(
    trigger.attributes('popovertarget')!,
  )!;

  return { wrapper, trigger, content, popover: fakePopover(content) };
}

describe('Tooltip', () => {
  it('is a button named "More info about" its label', async () => {
    const { trigger } = await mountTooltip();

    expect(roleOf(trigger)).toBe('button');
    expect(accessibleName(trigger)).toBe('More info about Password');
    await expectNoViolations();
  });

  it('is named by a label it shows, and "More info" without one', async () => {
    const shown = await mountTooltip({ hideLabel: false });
    expect(accessibleName(shown.trigger)).toBe('Password (More info)');

    const bare = await mountTooltip({ label: undefined });
    expect(accessibleName(bare.trigger)).toBe('More info');
  });

  it('renders its text only once open, into the live region around it, and leaves focus on the button', async () => {
    const { trigger, content, popover } = await mountTooltip();
    const live = trigger.element.closest('[aria-live]');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    expect(live?.contains(content)).toBe(true);
    expect(content.textContent?.trim()).toBe('');

    (trigger.element as HTMLElement).focus();
    await popover.show();

    expect(content.textContent?.trim()).toBe('At least 12 characters.');
    expectFocused(trigger);
    await expectNoViolations();

    // Closed, the text goes, so the next open is announced again
    await toggle(content, 'closed');
    expect(content.textContent?.trim()).toBe('');
  });

  // The rules are useFocusLeave()'s (test/composables/useFocusLeave.test.ts):
  // this pins that the button and the text both take part
  it('closes when focus leaves the button for the page, not for its text, nor after a press in the text', async () => {
    const { trigger, content, popover } = await mountTooltip(
      {},
      'See <a href="#rules">the rules</a>.',
    );
    const outside = addToPage('<button>Outside</button>');
    await popover.show();
    const inside = content.querySelector('a')!;

    leave(trigger.element, inside);
    leave(inside, trigger.element);
    // A press to select the text gives focus to the page around it
    content.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    leave(trigger.element, outside);
    await new Promise((resolve) => setTimeout(resolve));
    expect(popover.isOpen()).toBe(true);

    leave(trigger.element, outside);
    expect(popover.isOpen()).toBe(false);
  });
});
