import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Accordion } from '#components';
import { checkA11y } from '../a11y';

const slots = { trigger: () => 'Lesson 1', content: () => 'The chapters' };

describe('Accordion', () => {
  it('is a button in a heading that controls an inert panel', async () => {
    const wrapper = await mountSuspended(Accordion, {
      props: { hTag: 'h3' },
      slots,
      attachTo: document.body,
    });

    const trigger = wrapper.get('h3 > button.accordion-trigger');
    const panel = wrapper.get('.accordion-panel-wrapper');

    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(trigger.attributes('aria-controls')).toBe(panel.attributes('id'));
    expect(panel.attributes('inert')).toBeDefined();
    expect(panel.attributes('role')).toBeUndefined();

    await trigger.trigger('click');

    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(panel.attributes('inert')).toBeUndefined();
    // A parent with v-model:open hears the click, so it can close it again
    expect(wrapper.emitted('update:open')).toEqual([[true]]);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('follows the open prop', async () => {
    const wrapper = await mountSuspended(Accordion, {
      props: { open: true },
      slots,
      attachTo: document.body,
    });

    expect(wrapper.get('.accordion-trigger').attributes('aria-expanded')).toBe(
      'true',
    );
    expect(wrapper.find('h1, h2, h3, h4, h5, h6').exists()).toBe(false);

    await wrapper.setProps({ open: false });

    expect(wrapper.get('.accordion-trigger').attributes('aria-expanded')).toBe(
      'false',
    );
  });

  it('makes the panel a region named by its trigger when asked', async () => {
    const wrapper = await mountSuspended(Accordion, {
      props: { hTag: 'h2', region: true },
      slots,
      attachTo: document.body,
    });

    const trigger = wrapper.get('.accordion-trigger');
    const panel = wrapper.get('.accordion-panel-wrapper');

    expect(panel.attributes('role')).toBe('region');
    expect(panel.attributes('aria-labelledby')).toBe(trigger.attributes('id'));
    expect(await checkA11y()).toHaveNoViolations();
  });
});
