import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Accordion } from '#components';
import { accessibleName, checkA11y, roleOf } from '../a11y';

/**
 * The APG accordion pattern
 * (https://www.w3.org/WAI/ARIA/apg/patterns/accordion/): a button in a
 * heading, with `aria-expanded` and `aria-controls`, and the panel it
 * controls. The panel is inert while closed, and a `region` named by its
 * button only with the `region` prop (the docblock: landmarks would pile up
 * on a page with many accordions).
 */
const slots = { trigger: () => 'Lesson 1', content: () => 'The chapters' };

async function mountAccordion(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(Accordion, {
    props,
    slots,
    attachTo: document.body,
  });

  const trigger = wrapper.get('button');
  /** The element the button says it controls */
  const panel = () =>
    document.getElementById(trigger.attributes('aria-controls') ?? '')!;

  return { wrapper, trigger, panel };
}

describe('Accordion', () => {
  it('is a button named by its trigger, in a heading of the given level, that controls an inert panel', async () => {
    const { wrapper, trigger, panel } = await mountAccordion({ hTag: 'h3' });

    expect(roleOf(trigger)).toBe('button');
    expect(accessibleName(trigger)).toBe('Lesson 1');

    const heading = trigger.element.parentElement!;
    expect(roleOf(heading)).toBe('heading');
    expect(heading.tagName).toBe('H3');

    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(panel()).not.toBeNull();
    expect(panel().textContent).toContain('The chapters');
    expect(panel().hasAttribute('inert')).toBe(true);

    await trigger.trigger('click');

    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(panel().hasAttribute('inert')).toBe(false);
    // A parent with v-model:open hears the click, so it can close it again
    expect(wrapper.emitted('update:open')).toEqual([[true]]);
    expect(await checkA11y()).toHaveNoViolations();

    await trigger.trigger('click');

    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(panel().hasAttribute('inert')).toBe(true);
    expect(wrapper.emitted('update:open')).toEqual([[true], [false]]);
  });

  it('follows the open prop, and is no heading without h-tag', async () => {
    const { wrapper, trigger, panel } = await mountAccordion({ open: true });

    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(panel().hasAttribute('inert')).toBe(false);
    expect(trigger.element.closest('h1, h2, h3, h4, h5, h6')).toBeNull();
    expect(roleOf(trigger.element.parentElement!)).not.toBe('heading');

    await wrapper.setProps({ open: false });

    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(panel().hasAttribute('inert')).toBe(true);
  });

  it('has no landmark role unless asked', async () => {
    const { panel } = await mountAccordion({ hTag: 'h2' });

    expect(roleOf(panel())).toBeNull();
  });

  it('makes the panel a region named by its button when asked', async () => {
    const { trigger, panel } = await mountAccordion({
      hTag: 'h2',
      region: true,
    });
    // Open: axe, as a browser, leaves an inert element out of the tree
    await trigger.trigger('click');

    expect(roleOf(panel())).toBe('region');
    expect(accessibleName(panel())).toBe('Lesson 1');
    expect(await checkA11y()).toHaveNoViolations();
  });
});
