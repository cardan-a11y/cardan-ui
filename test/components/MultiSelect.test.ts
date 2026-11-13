import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { MultiSelect } from '#components';
import {
  accessibleName,
  checkA11y,
  description,
  expectFocused,
  roleOf,
} from '../a11y';
import { mountInForm } from '../form';

const options = [
  { value: 'cheese', label: 'Cheese' },
  { value: 'ham', label: 'Ham' },
];

async function mountSelect(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(MultiSelect, {
    props: {
      label: 'Toppings',
      options,
      modelValue: [],
      'onUpdate:modelValue': (value: unknown) =>
        wrapper.setProps({ modelValue: value }),
      ...props,
    },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
}

describe('MultiSelect', () => {
  it('is a combobox named by its label, which keeps it once something is selected', async () => {
    const wrapper = await mountSelect();

    const combobox = wrapper.get('[role="combobox"]');
    expect(roleOf(combobox)).toBe('combobox');
    expect(accessibleName(combobox)).toBe('Toppings');
    expect(await checkA11y()).toHaveNoViolations();

    await wrapper.setProps({ modelValue: ['cheese'] });
    await nextTick();

    // The library names it by the selection: the label follows
    expect(accessibleName(combobox)).toMatch(/^Cheese.*Toppings$/);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('is described by its instruction, and by its error only while the error shows', async () => {
    const wrapper = await mountSelect({
      required: true,
      instruction: 'Two at most',
    });

    const combobox = wrapper.get('[role="combobox"]');
    expect(description(combobox)).toBe('Two at most');
    expect(combobox.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });
    await nextTick();

    expect(description(combobox)).toBe('Two at most Toppings is missing');
    expect(combobox.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    await wrapper.setProps({ modelValue: ['ham'] });
    await nextTick();

    expect(description(combobox)).toBe('Two at most');
    expect(combobox.attributes('aria-invalid')).toBeUndefined();
  });

  it('shows its error after a failed submit of its form, with focus on the combobox', async () => {
    const wrapper = await mountInForm(() => [
      h(MultiSelect, {
        label: 'Toppings',
        options,
        modelValue: [],
        required: true,
      }),
    ]);
    await nextTick();
    const combobox = wrapper.get('[role="combobox"]');

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(combobox.attributes('aria-invalid')).toBe('true');
    expect(description(combobox)).toBe('Toppings is missing');
    // The form focuses the hidden required input, which passes focus on
    expectFocused(combobox);
  });

  it('shows a custom error, and is described by it, until its value changes', async () => {
    const wrapper = await mountSelect({
      modelValue: ['ham'],
      customError: 'Ham is sold out',
    });
    const combobox = wrapper.get('[role="combobox"]');

    expect(description(combobox)).toBe('Ham is sold out');
    expect(combobox.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    const cheese = wrapper
      .findAll('[role="option"]')
      .find((option) => accessibleName(option) === 'Cheese');
    await cheese!.trigger('click');
    await nextTick();

    expect(wrapper.props('modelValue')).toEqual(['ham', 'cheese']);
    expect(description(combobox)).toBe('');
    expect(combobox.attributes('aria-invalid')).toBeUndefined();
  });

  it('puts an attribute on the library and a class and style on the wrapper', async () => {
    const wrapper = await mountSuspended(MultiSelect, {
      props: { label: 'Toppings', options, modelValue: [] },
      attrs: { 'data-test': 'toppings', class: 'wide', style: 'color: red' },
      attachTo: document.body,
    });

    const library = wrapper.get('[data-test="toppings"]');
    expect(library.element).not.toBe(wrapper.element);
    expect(library.find('[role="combobox"]').exists()).toBe(true);
    expect(library.attributes('class')).not.toContain('wide');
    expect(wrapper.classes()).toContain('wide');
    expect(wrapper.attributes('style')).toContain('color: red');
  });

  it('keeps its label and texts to itself next to another MultiSelect', async () => {
    await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(MultiSelect, {
            label: 'Pizza',
            options,
            modelValue: [],
            instruction: 'On the pizza',
          }),
          h(MultiSelect, {
            label: 'Sandwich',
            options,
            modelValue: [],
            instruction: 'On the sandwich',
          }),
        ],
      }),
      { attachTo: document.body },
    );
    await nextTick();

    const comboboxes = Array.from(
      document.querySelectorAll('[role="combobox"]'),
    );
    expect(comboboxes.map((combobox) => accessibleName(combobox))).toEqual([
      'Pizza',
      'Sandwich',
    ]);
    expect(comboboxes.map((combobox) => description(combobox))).toEqual([
      'On the pizza',
      'On the sandwich',
    ]);
    const listboxes = comboboxes.map((combobox) =>
      combobox.getAttribute('aria-controls'),
    );
    expect(new Set(listboxes).size).toBe(2);
    expect(await checkA11y()).toHaveNoViolations();
  });
});
