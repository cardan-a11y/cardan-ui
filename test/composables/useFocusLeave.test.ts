import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { addToPage, leave } from '../dom';

/**
 * `useFocusLeave()`, which Popover, UserMenu and Tooltip share. Their own
 * tests pin only that they bind it to their trigger and content; where a
 * real browser moves focus on a press is in test/browser/popover.spec.ts.
 */
async function mountLeave() {
  const close = vi.fn();
  const open = ref(true);
  const wrapper = await mountSuspended(
    defineComponent({
      setup() {
        const trigger = ref<HTMLElement>();
        const content = ref<HTMLElement>();
        const { onPress, onFocusOut, unpark } = useFocusLeave({
          elements: () => [trigger.value, content.value],
          close,
          isOpen: () => open.value,
        });
        return () => [
          h(
            'button',
            { ref: trigger, onFocusout: onFocusOut, onMousedown: onPress },
            'Trigger',
          ),
          h(
            'div',
            { ref: content, onFocusout: onFocusOut, onMousedown: onPress },
            [h('a', { href: '#' }, 'First'), h('a', { href: '#' }, 'Second')],
          ),
          h('button', { onClick: unpark }, 'Unpark'),
        ];
      },
    }),
    { attachTo: document.body },
  );

  const [trigger, unparkButton] = wrapper
    .findAll('button')
    .map((button) => button.element);
  const [first, second] = wrapper.findAll('a').map((a) => a.element);
  const content = first!.parentElement!;
  const main = addToPage('<main tabindex="-1"><a href="#">Next</a></main>');
  const outside = addToPage('<button>Outside</button>');

  return {
    wrapper,
    close,
    open,
    trigger: trigger!,
    content,
    first: first!,
    second: second!,
    main,
    next: main.querySelector('a')!,
    outside,
    unpark: () => unparkButton!.click(),
  };
}

/** The press is over once its task has run */
const afterPress = () => new Promise((resolve) => setTimeout(resolve));

describe('useFocusLeave', () => {
  it('closes when focus leaves the trigger and content for the page, also for an element around them', async () => {
    const { close, trigger, first, outside, main } = await mountLeave();

    leave(first, outside);
    expect(close).toHaveBeenCalledTimes(1);
    leave(trigger, outside);
    expect(close).toHaveBeenCalledTimes(2);
    // Such as the shell after a navigation
    leave(first, main);
    expect(close).toHaveBeenCalledTimes(3);
  });

  it('stays open for a move within the content, between trigger and content, or out of the window', async () => {
    const { close, trigger, first, second } = await mountLeave();

    leave(first, second);
    leave(second, trigger);
    leave(trigger, first);
    // The window loses focus, or the element is removed
    leave(trigger, null);

    expect(close).not.toHaveBeenCalled();
  });

  it('does nothing while closed', async () => {
    const { close, open, trigger, outside } = await mountLeave();
    open.value = false;

    leave(trigger, outside);

    expect(close).not.toHaveBeenCalled();
  });

  it.each(['content', 'trigger'] as const)(
    'stays open when a press on the %s moves focus to the page around it, and closes when focus leaves that',
    async (pressed) => {
      const mounted = await mountLeave();
      const { close, first, main, next } = mounted;

      mounted[pressed].dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
      leave(first, main);
      expect(close).not.toHaveBeenCalled();

      // The next Tab, after the press is over
      await afterPress();
      leave(main, next);
      expect(close).toHaveBeenCalledTimes(1);
    },
  );

  it('forgets the element a press parked focus on once focus comes back, or the popover closes', async () => {
    const { close, content, first, second, main, next, unpark } =
      await mountLeave();

    content.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    leave(first, main);
    await afterPress();
    // Back inside: a later move on the page around it is no leave of its own
    leave(main, second);
    leave(main, next);
    expect(close).not.toHaveBeenCalled();

    content.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    leave(first, main);
    await afterPress();
    unpark();
    leave(main, next);
    expect(close).not.toHaveBeenCalled();
  });
});
