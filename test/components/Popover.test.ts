import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Popover } from '#components';
import { checkA11y } from '../a11y';

const list = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete' },
];

/** The browser's toggle event, after the popover is shown or hidden */
function toggle(element: Element, newState: 'open' | 'closed') {
  const event = new Event('toggle');
  Object.defineProperty(event, 'newState', { value: newState });
  element.dispatchEvent(event);
}

async function mountOpen() {
  const wrapper = await mountSuspended(Popover, {
    props: { label: 'More options', list },
    attachTo: document.body,
  });
  const content = wrapper.get('.popover-content-wrapper')
    .element as HTMLElement & {
    hidePopover: () => void;
  };
  content.hidePopover = vi.fn();

  toggle(content, 'open');
  await nextTick();
  await nextTick();

  return { wrapper, content };
}

describe('Popover', () => {
  it('moves focus to the first item of its menu when it opens', async () => {
    const { wrapper, content } = await mountOpen();

    const items = wrapper.findAll('.popover-content button');
    expect(items).toHaveLength(2);
    expect(document.activeElement).toBe(items[0]!.element);
    expect(await checkA11y()).toHaveNoViolations();

    // Closed, the native popover hides its content; it stays rendered
    toggle(content, 'closed');
    await nextTick();
    expect(wrapper.findAll('.popover-content button')).toHaveLength(2);
  });

  it('renders its menu before it first opens', async () => {
    const wrapper = await mountSuspended(Popover, {
      props: { label: 'More options', list },
      attachTo: document.body,
    });

    expect(wrapper.findAll('.popover-content button')).toHaveLength(2);
    expect(
      wrapper.get('.popover-content-wrapper').attributes('popover'),
    ).toBeDefined();
  });

  it('closes when focus leaves it, but not for a move within it or to its trigger', async () => {
    const { wrapper, content } = await mountOpen();
    const [edit, remove] = wrapper
      .findAll('.popover-content button')
      .map((item) => item.element);
    const trigger = wrapper.get('.popover-trigger').element;
    const outside = document.createElement('button');
    document.body.append(outside);

    const leave = (from: Element, to: Element) =>
      from.dispatchEvent(
        new FocusEvent('focusout', { relatedTarget: to, bubbles: true }),
      );

    leave(edit!, remove!);
    leave(remove!, trigger);
    expect(content.hidePopover).not.toHaveBeenCalled();

    leave(remove!, outside);
    expect(content.hidePopover).toHaveBeenCalledTimes(1);

    // The same from the trigger: into the content stays, to the page closes
    leave(trigger, edit!);
    expect(content.hidePopover).toHaveBeenCalledTimes(1);
    leave(trigger, outside);
    expect(content.hidePopover).toHaveBeenCalledTimes(2);

    outside.remove();
  });

  it('has no inline radius override that needs !important', async () => {
    const wrapper = await mountSuspended(Popover, {
      props: { label: 'More', list, size: 'xs' },
      attachTo: document.body,
    });

    const style = wrapper.get('.popover-trigger').attributes('style') ?? '';
    expect(style).toContain('--popover-radius: var(--radius-sm)');
  });
});
