import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Tabs } from '#components';
import { accessibleName, checkA11y, expectFocused, roleOf } from '../a11y';
import { press } from '../dom';

/**
 * The APG tabs pattern with automatic activation
 * (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): a tab that gets focus
 * is selected.
 */
const tabs = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B', disabled: true },
  { value: 'c', label: 'C' },
];

async function mountTabs(props: Record<string, unknown> = {}) {
  const allProps: Record<string, unknown> = {
    modelValue: 'a',
    ariaLabel: 'Letters',
    'onUpdate:modelValue': (value?: string) =>
      wrapper.setProps({ modelValue: value }),
    ...props,
  };
  const wrapper = await mountSuspended(Tabs, {
    props: { tabs, ...allProps },
    slots: { a: '<p>Text of A</p>', b: '<p>B</p>', c: '<button>Go</button>' },
    attachTo: document.body,
  });

  /** The tab with this name */
  const tab = (name: string) => {
    const found = wrapper
      .findAll('[role="tab"]')
      .find((tab) => accessibleName(tab) === name);
    if (!found) throw new Error(`No tab named ${name}`);
    return found.element as HTMLButtonElement;
  };

  /** The names of the selected tabs */
  const selected = () =>
    wrapper
      .findAll('[role="tab"][aria-selected="true"]')
      .map((tab) => accessibleName(tab));

  return { wrapper, tab, selected };
}

describe('Tabs', () => {
  it('is a tab list named by its label, of tabs named by theirs, one of them selected', async () => {
    const { wrapper, selected } = await mountTabs();

    const tablist = wrapper.get('[role="tablist"]');
    expect(roleOf(tablist)).toBe('tablist');
    expect(accessibleName(tablist)).toBe('Letters');

    const all = wrapper.findAll('[role="tab"]');
    expect(all.map((tab) => accessibleName(tab))).toEqual(['A', 'B', 'C']);
    expect(selected()).toEqual(['A']);
    expect(all.map((tab) => tab.attributes('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(await checkA11y()).toHaveNoViolations();
  });

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

  it('moves and selects with the arrow keys in page order, around the ends, past a disabled tab', async () => {
    const { tab, selected } = await mountTabs();
    tab('A').focus();

    const right = await press('ArrowRight');
    expectFocused(tab('C'));
    expect(selected()).toEqual(['C']);
    // The page does not scroll
    expect(right.defaultPrevented).toBe(true);

    await press('ArrowRight');
    expectFocused(tab('A'));
    expect(selected()).toEqual(['A']);

    await press('ArrowLeft');
    expectFocused(tab('C'));
    expect(selected()).toEqual(['C']);

    await press('ArrowLeft');
    expectFocused(tab('A'));
    expect(selected()).toEqual(['A']);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('moves to the first and the last enabled tab with Home and End', async () => {
    const { tab, selected } = await mountTabs();
    tab('A').focus();

    await press('End');
    expectFocused(tab('C'));
    expect(selected()).toEqual(['C']);

    await press('Home');
    expectFocused(tab('A'));
    expect(selected()).toEqual(['A']);
  });

  it('selects a tab that is clicked', async () => {
    const { wrapper, tab, selected } = await mountTabs();

    tab('C').click();
    await nextTick();

    expect(selected()).toEqual(['C']);
    expect(wrapper.emitted('update:modelValue')).toEqual([['c']]);
  });

  it('keeps the tab list reachable while nothing is selected', async () => {
    const { wrapper } = await mountTabs({ modelValue: undefined });

    const tabindexes = wrapper
      .findAll('[role="tab"]')
      .map((tab) => tab.attributes('tabindex'));
    expect(tabindexes).toEqual(['0', '-1', '-1']);
  });

  it('puts the open panel in the tab order, with or without focusable content', async () => {
    const { wrapper, tab } = await mountTabs();
    await nextTick();

    /** The panel the tab with this name controls */
    const panel = (name: string) =>
      document.getElementById(tab(name).getAttribute('aria-controls') ?? '')!;
    expect(panel('A').getAttribute('tabindex')).toBe('0');
    expect(panel('C').getAttribute('tabindex')).toBe('-1');

    await wrapper.setProps({ modelValue: 'c' });
    await nextTick();
    expect(panel('C').getAttribute('tabindex')).toBe('0');
    expect(panel('A').getAttribute('tabindex')).toBe('-1');
  });
});
