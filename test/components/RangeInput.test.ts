import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { RangeInput } from '#components';
import { accessibleName, checkA11y, roleOf } from '../a11y';

/**
 * A native slider (`<input type="range">`): the browser gives it the role,
 * the value and the keys of the APG slider pattern. The component names it,
 * gives it a value from the start and reads a labelled tick out as its value.
 */
async function mountRange(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(RangeInput, {
    props: {
      label: 'Size',
      'onUpdate:modelValue': (value?: number) => {
        void wrapper.setProps({ modelValue: value });
      },
      ...props,
    },
    attachTo: document.body,
  });
  // The ticks and the output render on the client, after mount
  await nextTick();
  return { wrapper, input: wrapper.get('input') };
}

const sizes = [
  { value: 0, label: 'Small' },
  { value: 1, label: 'Medium' },
  { value: 2, label: 'Large' },
];

describe('RangeInput', () => {
  it('is a slider named by its label, with its range, and no accessibility violations', async () => {
    const { input } = await mountRange({ min: 10, max: 50, step: 10 });

    expect(roleOf(input)).toBe('slider');
    expect(accessibleName(input)).toBe('Size');
    expect(input.attributes('min')).toBe('10');
    expect(input.attributes('max')).toBe('50');
    expect(input.attributes('step')).toBe('10');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('has the minimum as its value until there is one, not the middle of the track', async () => {
    const { wrapper, input } = await mountRange({ min: 10, max: 50 });

    expect(input.element.value).toBe('10');

    await wrapper.setProps({ modelValue: 30 });
    expect(input.element.value).toBe('30');
  });

  it('hands on the value as a number', async () => {
    const { wrapper, input } = await mountRange();

    await input.setValue('42');

    expect(wrapper.emitted('update:modelValue')).toEqual([[42]]);
  });

  it('reads out the label of the tick at the value', async () => {
    const { wrapper, input } = await mountRange({
      min: 0,
      max: 2,
      ticks: sizes,
      modelValue: 1,
    });

    expect(input.attributes('aria-valuetext')).toBe('Medium');

    await input.setValue('2');
    expect(input.attributes('aria-valuetext')).toBe('Large');

    // A tick without a label of its own: the number is the value text
    await wrapper.setProps({
      ticks: [{ value: 0, label: 'Small' }, 1, { value: 2, label: 'Large' }],
      modelValue: 1,
    });
    expect(input.attributes('aria-valuetext')).toBeUndefined();
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('has no value text for numeric ticks, which the number already says', async () => {
    const { input } = await mountRange({ min: 0, max: 4, modelValue: 2 });

    expect(input.attributes('aria-valuetext')).toBeUndefined();
  });

  it('takes a value text of its own over the label of a tick', async () => {
    const { input } = await mountRange({
      min: 0,
      max: 2,
      ticks: sizes,
      modelValue: 1,
      ariaValuetext: 'Medium, 40 by 60 cm',
    });

    expect(input.attributes('aria-valuetext')).toBe('Medium, 40 by 60 cm');
  });

  it('hides the ticks it shows from assistive technology, which hears the value text', async () => {
    const { wrapper } = await mountRange({
      min: 0,
      max: 2,
      ticks: sizes,
      modelValue: 0,
      showTicks: true,
    });

    const ticks = wrapper
      .findAll('[aria-hidden="true"]')
      .find((element) => element.text().includes('Medium'));
    expect(ticks?.text()).toMatch(/Small\s*Medium\s*Large/);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('is disabled with its input', async () => {
    const { input } = await mountRange({ disabled: true });

    expect((input.element as HTMLInputElement).disabled).toBe(true);
    expect(await checkA11y()).toHaveNoViolations();
  });
});
