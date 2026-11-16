import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Tooltip } from '#components';
import { accessibleName, checkA11y, expectFocused, roleOf } from '../a11y';
import { addToPage, toggle } from '../dom';

/**
 * A toggletip (see its docblock): a button that shows a text, which is
 * rendered into a live region that was there before, so a screen reader
 * announces it while focus stays on the button. happy-dom has no Popover
 * API: the announcement itself, Escape and the light dismiss are for the
 * browser suite; this pins what the component does on the browser's events.
 */

/**
 * The Popover API, as far as the component uses it: the open state that
 * `:popover-open` reads, and `hidePopover()`, which fires the toggle event
 */
function fakePopover(element: HTMLElement) {
  let open = false;
  const matches = element.matches.bind(element);
  element.matches = ((selector: string) =>
    selector === ':popover-open'
      ? open
      : matches(selector)) as typeof element.matches;

  const hidePopover = vi.fn(() => {
    if (!open) return;
    open = false;
    void toggle(element, 'closed');
  });
  element.hidePopover = hidePopover;

  return {
    hidePopover,
    isOpen: () => open,
    async show() {
      open = true;
      await toggle(element, 'open');
    },
  };
}

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

/** Focus leaving one element for another, as the browser reports it */
function leave(from: Element, to: Element | null) {
  from.dispatchEvent(
    new FocusEvent('focusout', { relatedTarget: to, bubbles: true }),
  );
}

describe('Tooltip', () => {
  it('is a button named "More info about" its label', async () => {
    const { trigger } = await mountTooltip();

    expect(roleOf(trigger)).toBe('button');
    expect(accessibleName(trigger)).toBe('More info about Password');
    expect(await checkA11y()).toHaveNoViolations();
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
    expect(await checkA11y()).toHaveNoViolations();

    // Closed, the text goes, so the next open is announced again
    await toggle(content, 'closed');
    expect(content.textContent?.trim()).toBe('');
  });

  it('closes when focus leaves the button for the page, not for its text or nowhere', async () => {
    const { trigger, content, popover } = await mountTooltip(
      {},
      'See <a href="#rules">the rules</a>.',
    );
    const outside = addToPage('<button>Outside</button>');
    await popover.show();
    const inside = content.querySelector('a')!;

    leave(trigger.element, inside);
    leave(inside, trigger.element);
    // The window loses focus, or the element is removed
    leave(trigger.element, null);
    expect(popover.isOpen()).toBe(true);

    leave(trigger.element, outside);
    expect(popover.isOpen()).toBe(false);

    // Closed, a focus move does nothing
    leave(trigger.element, outside);
    expect(popover.hidePopover).toHaveBeenCalledTimes(1);
  });

  it('stays open when a press in its text moves focus to the page around it, and closes when focus leaves that', async () => {
    const { trigger, content, popover } = await mountTooltip();
    const main = addToPage('<main tabindex="-1"><a href="#">Next</a></main>');
    const next = main.querySelector('a')!;
    await popover.show();

    // A press to select the text gives focus to the nearest focusable
    // element around it
    content.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    leave(trigger.element, main);
    expect(popover.isOpen()).toBe(true);

    // The next Tab, after the press is over
    await new Promise((resolve) => setTimeout(resolve));
    leave(main, next);
    expect(popover.isOpen()).toBe(false);
  });
});
