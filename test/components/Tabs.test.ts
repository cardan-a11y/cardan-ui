import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Tabs } from '#components';
import { checkA11y } from '../a11y';

const tabs = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B', disabled: true },
  { value: 'c', label: 'C' },
];

function mountTabs(props: Record<string, unknown> = {}) {
  return mountSuspended(Tabs, {
    props: { tabs, modelValue: 'a', ...props },
    slots: { a: '<p>Text of A</p>', b: '<p>B</p>', c: '<button>Go</button>' },
    attachTo: document.body,
  });
}

describe('Tabs', () => {
  it('has ids of its own, also next to another Tabs with the same values', async () => {
    await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(Tabs, { tabs, modelValue: 'a' }),
          h(Tabs, { tabs, modelValue: 'a' }),
        ],
      }),
      { attachTo: document.body },
    );

    const ids = Array.from(document.querySelectorAll('[role="tab"]')).map(
      (tab) => tab.id,
    );
    expect(new Set(ids).size).toBe(ids.length);

    for (const tab of document.querySelectorAll('[role="tab"]')) {
      const panel = document.getElementById(
        tab.getAttribute('aria-controls') ?? '',
      );
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id);
    }
  });

  it('moves with the arrow keys in page order, around the ends, past a disabled tab', async () => {
    const wrapper = await mountTabs({
      'onUpdate:modelValue': (value: string) =>
        wrapper.setProps({ modelValue: value }),
    });
    const [a, , c] = wrapper
      .findAll('[role="tab"]')
      .map((tab) => tab.element as HTMLButtonElement);

    a!.focus();
    await wrapper.findAll('[role="tab"]')[0]!.trigger('keydown', {
      key: 'ArrowRight',
    });
    expect(document.activeElement).toBe(c);
    expect(c!.getAttribute('aria-selected')).toBe('true');

    await wrapper.findAll('[role="tab"]')[2]!.trigger('keydown', {
      key: 'ArrowRight',
    });
    expect(document.activeElement).toBe(a);

    await wrapper.findAll('[role="tab"]')[0]!.trigger('keydown', {
      key: 'End',
    });
    expect(document.activeElement).toBe(c);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('keeps the tab list reachable while nothing is selected', async () => {
    const wrapper = await mountTabs({ modelValue: undefined });

    const tabindexes = wrapper
      .findAll('[role="tab"]')
      .map((tab) => tab.attributes('tabindex'));
    expect(tabindexes).toEqual(['0', '-1', '-1']);
  });

  it('puts the open panel in the tab order, with or without focusable content', async () => {
    const wrapper = await mountTabs();
    await nextTick();

    const panel = (value: string) =>
      wrapper
        .findAll('[role="tabpanel"]')
        .find((panel) => panel.attributes('id')?.endsWith(`-${value}`))!;
    expect(panel('a').attributes('tabindex')).toBe('0');
    expect(panel('c').attributes('tabindex')).toBe('-1');

    await wrapper.setProps({ modelValue: 'c' });
    await nextTick();
    expect(panel('c').attributes('tabindex')).toBe('0');
    expect(panel('a').attributes('tabindex')).toBe('-1');
  });
});
