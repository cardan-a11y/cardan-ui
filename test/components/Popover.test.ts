import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Popover } from '#components';
import { useRouter } from '#imports';
import { accessibleName, checkA11y, expectFocused, roleOf } from '../a11y';
import { addToPage, toggle } from '../dom';

/**
 * A disclosure in APG terms (see its docblock): a button that shows a list
 * of links or buttons, without the menu roles or arrow keys. happy-dom has
 * no Popover API, so opening, `aria-expanded` from the invoker, Escape, the
 * light dismiss and Tab past the last item are for the browser suite; this
 * pins what the component does on the browser's events.
 */
const list = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete' },
];

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
      // The component focuses the first item in the tick after the event
      await nextTick();
    },
  };
}

async function mountPopover(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(Popover, {
    props: { label: 'Row actions', list, ...props },
    attachTo: document.body,
  });

  const trigger = wrapper.get('button[popovertarget]');
  const content = document.getElementById(
    trigger.attributes('popovertarget')!,
  )!;

  /** The item in the content with this name */
  const item = (name: string) => {
    const found = Array.from(
      content.querySelectorAll<HTMLElement>('a, button'),
    ).find((element) => accessibleName(element) === name);
    if (!found) throw new Error(`No item named ${name}`);
    return found;
  };

  return { wrapper, trigger, content, item, popover: fakePopover(content) };
}

/** Focus leaving one element for another, as the browser reports it */
function leave(from: Element, to: Element | null) {
  from.dispatchEvent(
    new FocusEvent('focusout', { relatedTarget: to, bubbles: true }),
  );
}

afterEach(async () => {
  await useRouter().push('/');
});

describe('Popover', () => {
  it('is a button named by its label, for a navigation list named the same', async () => {
    const { trigger, content, item } = await mountPopover();

    expect(roleOf(trigger)).toBe('button');
    expect(accessibleName(trigger)).toBe('Row actions');

    const nav = content.querySelector('nav')!;
    expect(roleOf(nav)).toBe('navigation');
    expect(accessibleName(nav)).toBe('Row actions');
    // Rendered while closed, where the native popover hides it
    expect(accessibleName(item('Edit'))).toBe('Edit');
    expect(accessibleName(item('Delete'))).toBe('Delete');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('is named "More options" without a label', async () => {
    const { trigger, content } = await mountPopover({ label: undefined });

    expect(accessibleName(trigger)).toBe('More options');
    expect(accessibleName(content.querySelector('nav')!)).toBe('More options');
  });

  it('moves focus to its first item when it opens', async () => {
    const { item, popover } = await mountPopover();

    await popover.show();

    expectFocused(item('Edit'));
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('closes and emits the item that is chosen', async () => {
    const { wrapper, item, popover } = await mountPopover();
    await popover.show();

    item('Delete').click();
    await nextTick();

    expect(wrapper.emitted('click')).toEqual([[list[1]]]);
    expect(popover.isOpen()).toBe(false);
  });

  it('closes when focus leaves it, but not for a move within it or to its trigger', async () => {
    const { trigger, item, popover } = await mountPopover();
    const outside = addToPage('<button>Outside</button>');
    await popover.show();

    leave(item('Edit'), item('Delete'));
    leave(item('Delete'), trigger.element);
    expect(popover.hidePopover).not.toHaveBeenCalled();

    leave(item('Delete'), outside);
    expect(popover.hidePopover).toHaveBeenCalledTimes(1);

    // The same from the trigger: into the content stays, to the page closes
    await popover.show();
    leave(trigger.element, item('Edit'));
    expect(popover.hidePopover).toHaveBeenCalledTimes(1);
    leave(trigger.element, outside);
    expect(popover.hidePopover).toHaveBeenCalledTimes(2);

    // To an element around it, such as the shell after a navigation, closes
    await popover.show();
    leave(item('Edit'), document.body);
    expect(popover.hidePopover).toHaveBeenCalledTimes(3);
  });

  it('stays open when a press inside moves focus to the page around it, and closes when focus leaves that', async () => {
    const { content, item, popover } = await mountPopover();
    const main = addToPage('<main tabindex="-1"><a href="#">Next</a></main>');
    const next = main.querySelector('a')!;
    await popover.show();

    // A press on the content's padding gives focus to the nearest focusable
    // element around it
    content.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    leave(item('Edit'), main);
    expect(popover.isOpen()).toBe(true);

    // The next Tab, after the press is over
    await new Promise((resolve) => setTimeout(resolve));
    leave(main, next);
    expect(popover.isOpen()).toBe(false);
  });

  it('closes on a route change, also when focus did not move', async () => {
    const { popover } = await mountPopover();
    await popover.show();

    await useRouter().push('/buttons');
    await nextTick();

    expect(popover.isOpen()).toBe(false);
  });

  it('cannot be opened while disabled, and keeps its name', async () => {
    const { trigger } = await mountPopover({ disabled: true });

    expect((trigger.element as HTMLButtonElement).disabled).toBe(true);
    expect(accessibleName(trigger)).toBe('Row actions');
  });

  it('stays focusable while loading, busy and unavailable, and ignores a click', async () => {
    const { wrapper, trigger } = await mountPopover({ loading: true });
    const button = trigger.element as HTMLButtonElement;

    expect(button.disabled).toBe(false);
    button.focus();
    expectFocused(button);
    expect(accessibleName(trigger)).toBe('Row actions');
    expect(trigger.attributes('aria-disabled')).toBe('true');
    expect(trigger.attributes('aria-busy')).toBe('true');

    // A canceled click is what keeps the browser from opening the popover
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);

    await wrapper.setProps({ loading: false });
    expect(trigger.attributes('aria-disabled')).toBeUndefined();
    expect(trigger.attributes('aria-busy')).toBeUndefined();
    const next = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.dispatchEvent(next);
    expect(next.defaultPrevented).toBe(false);
    expect(await checkA11y()).toHaveNoViolations();
  });
});
