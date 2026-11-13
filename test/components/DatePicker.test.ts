import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { DatePicker } from '#components';
import { accessibleName, checkA11y, description } from '../a11y';
import { addToPage } from '../dom';
import { mountInForm } from '../form';

async function mountPicker(
  props: Record<string, unknown> = {},
  attrs: Record<string, unknown> = {},
) {
  const wrapper = await mountSuspended(DatePicker, {
    props: { label: 'Start', modelValue: null, ...props },
    attrs,
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
}

describe('DatePicker', () => {
  it('names its input by the label and describes it by the instruction', async () => {
    const wrapper = await mountPicker({ instruction: 'The first day' });

    const input = wrapper.get('input');
    expect(accessibleName(input)).toBe('Start');
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'));
    expect(description(input)).toBe('The first day');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('describes its input by the error only while the error shows', async () => {
    const wrapper = await mountPicker({ required: true });

    const input = wrapper.get('input');
    expect(description(input)).toBe('');
    expect(input.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });
    await nextTick();

    expect(description(input)).toBe('Start is missing');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    await wrapper.setProps({ modelValue: new Date(2026, 10, 9) });
    await nextTick();

    expect(description(input)).toBe('');
    expect(input.attributes('aria-invalid')).toBeUndefined();
  });

  it('shows its error after a failed submit of its form', async () => {
    const wrapper = await mountInForm(() => [
      h(DatePicker, { label: 'Start', modelValue: null, required: true }),
    ]);
    await nextTick();
    const input = wrapper.get('input');

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(input.attributes('aria-invalid')).toBe('true');
    expect(description(input)).toBe('Start is missing');
  });

  it('shows a custom error, and is described by it, until its value changes', async () => {
    const wrapper = await mountPicker({
      modelValue: new Date(2026, 10, 9),
      customError: 'The course is full that day',
    });

    const input = wrapper.get('input');
    expect(description(input)).toBe('The course is full that day');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    // A date picked in the calendar, which opens after a moment
    await input.trigger('click');
    const day = await vi.waitFor(() => {
      const found = Array.from(
        document.querySelectorAll('[role="gridcell"]'),
      ).find((cell) => accessibleName(cell) === 'Tuesday 10 November 2026');
      if (!found) throw new Error('No day named Tuesday 10 November 2026');
      return found as HTMLElement;
    });
    day.click();

    // The library hands on the date a tick later
    await vi.waitFor(() =>
      expect(wrapper.emitted('update:modelValue')).toHaveLength(1),
    );
    await nextTick();
    expect(description(input)).toBe('');
    expect(input.attributes('aria-invalid')).toBeUndefined();
  });

  it('puts an attribute on the date picker, aria-describedby on its input, and a class and style on the wrapper', async () => {
    // Through props, which reach the component as attributes, so that
    // setProps can change it
    const wrapper = await mountPicker(
      { instruction: 'The first day', 'aria-describedby': 'hint' },
      { 'data-test': 'start', class: 'wide', style: 'color: red' },
    );
    addToPage('<p id="hint">Weekdays only</p>');

    const input = wrapper.get('input');
    const picker = wrapper.get('[data-test="start"]');
    expect(picker.element).not.toBe(wrapper.element);
    expect(picker.find('input').element).toBe(input.element);
    expect(picker.attributes('class')).not.toContain('wide');
    expect(wrapper.classes()).toContain('wide');
    expect(wrapper.attributes('style')).toContain('color: red');

    // A project's own description comes first, also when it changes after mount
    expect(description(input)).toBe('Weekdays only The first day');
    await wrapper.setProps({ 'aria-describedby': undefined } as never);
    expect(description(input)).toBe('The first day');
  });

  it('keeps its label and texts to itself next to another DatePicker', async () => {
    await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(DatePicker, {
            label: 'Start',
            modelValue: null,
            instruction: 'The first day',
          }),
          h(DatePicker, {
            label: 'End',
            modelValue: null,
            instruction: 'The last day',
          }),
        ],
      }),
      { attachTo: document.body },
    );
    await nextTick();

    const inputs = Array.from(document.querySelectorAll('input'));
    expect(inputs.map((input) => accessibleName(input))).toEqual([
      'Start',
      'End',
    ]);
    expect(inputs.map((input) => description(input))).toEqual([
      'The first day',
      'The last day',
    ]);
    expect(await checkA11y()).toHaveNoViolations();
  });
});
