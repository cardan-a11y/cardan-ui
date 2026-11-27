import { describe, it, expect, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Popover } from '#components';
import { useRouter } from '#imports';
import {
  accessibleName,
  expectFocused,
  expectNoViolations,
  roleOf,
} from '../a11y';
import { addToPage, fakePopover, leave } from '../dom';

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

async function mountPopover({
  slots,
  ...props
}: Record<string, unknown> & { slots?: Record<string, string> } = {}) {
  const wrapper = await mountSuspended(Popover, {
    props: { label: 'Row actions', list, ...props },
    slots,
    attachTo: document.body,
  });

  const trigger = wrapper.get('button[popovertarget]');
  const content = document.getElementById(
    trigger.attributes('popovertarget')!,
  )!;

  const item = (name: string) => {
    const found = Array.from(
      content.querySelectorAll<HTMLElement>('a, button'),
    ).find((element) => accessibleName(element) === name);
    if (!found) throw new Error(`No item named ${name}`);
    return found;
  };

  return { wrapper, trigger, content, item, popover: fakePopover(content) };
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
    await expectNoViolations();
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
    await expectNoViolations();
  });

  it('moves focus to the checked radio of a group that comes first, its tab stop', async () => {
    const { content, popover } = await mountPopover({
      list: undefined,
      slots: {
        content: `<fieldset><legend>Theme</legend>
          <label><input type="radio" name="t" value="light"> Light</label>
          <label><input type="radio" name="t" value="system" checked> System</label>
        </fieldset>`,
      },
    });

    await popover.show();

    expectFocused(content.querySelector('input[value="system"]')!);
  });

  it('closes and emits the item that is chosen', async () => {
    const { wrapper, item, popover } = await mountPopover();
    await popover.show();

    item('Delete').click();
    await nextTick();

    expect(wrapper.emitted('click')).toEqual([[list[1]]]);
    expect(popover.isOpen()).toBe(false);
  });

  // The rules are useFocusLeave()'s (test/composables/useFocusLeave.test.ts):
  // this pins that the trigger and the content both take part
  it('closes when focus leaves it, not for a move between its trigger and content, nor for a press on either', async () => {
    const { trigger, content, item, popover } = await mountPopover();
    const outside = addToPage('<button>Outside</button>');
    await popover.show();

    leave(item('Delete'), trigger.element);
    leave(trigger.element, item('Edit'));
    for (const pressed of [content, trigger.element]) {
      pressed.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      leave(item('Edit'), outside);
      await new Promise((resolve) => setTimeout(resolve));
    }
    expect(popover.isOpen()).toBe(true);

    leave(item('Edit'), outside);
    expect(popover.isOpen()).toBe(false);

    await popover.show();
    leave(trigger.element, outside);
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
    await expectNoViolations();
  });
});
