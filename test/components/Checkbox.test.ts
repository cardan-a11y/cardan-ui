import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick, reactive } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Checkbox, CheckboxGroup } from '#components';
import { accessibleName, checkA11y, description, roleOf } from '../a11y';
import { mountInForm } from '../form';

const toppings = [
  { value: 'cheese', label: 'Cheese' },
  { value: 'ham', label: 'Ham' },
];

describe('Checkbox', () => {
  it('is named by its label and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: { label: 'I agree', modelValue: false },
      attachTo: document.body,
    });

    const checkbox = wrapper.get('input');
    expect(roleOf(checkbox)).toBe('checkbox');
    expect(accessibleName(checkbox)).toBe('I agree');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('passes required on to the box, and is described by its error once it shows', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: { label: 'I agree', modelValue: false, required: true },
      attachTo: document.body,
    });

    const checkbox = wrapper.get('input');
    expect((checkbox.element as HTMLInputElement).required).toBe(true);
    // The chip is a word of its own, also without layout
    expect(accessibleName(checkbox)).toBe('I agree required');

    expect(description(checkbox)).toBe('');
    expect(checkbox.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });

    expect(description(checkbox)).toBe('Tick this box to continue');
    expect(checkbox.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    await checkbox.setValue(true);
    expect(description(checkbox)).toBe('');
    expect(checkbox.attributes('aria-invalid')).toBeUndefined();
  });

  it('shows its error after a failed submit of its form', async () => {
    const wrapper = await mountInForm(() => [
      h(Checkbox, { label: 'I agree', modelValue: false, required: true }),
    ]);
    const checkbox = wrapper.get('input');

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(checkbox.attributes('aria-invalid')).toBe('true');
    expect(description(checkbox)).toBe('Tick this box to continue');
  });

  it('shows a custom error, and is described by it, until it is ticked or unticked', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: {
        label: 'Newsletter',
        modelValue: true,
        customError: 'The newsletter is paused',
      },
      attachTo: document.body,
    });
    const checkbox = wrapper.get('input');

    expect(description(checkbox)).toBe('The newsletter is paused');
    expect(checkbox.attributes('aria-invalid')).toBe('true');
    // The server judges the next submit: the browser does not hold it back
    expect((checkbox.element as HTMLInputElement).checkValidity()).toBe(true);
    expect(await checkA11y()).toHaveNoViolations();

    await checkbox.setValue(false);

    expect(description(checkbox)).toBe('');
    expect(checkbox.attributes('aria-invalid')).toBeUndefined();
  });
});

describe('CheckboxGroup', () => {
  it('is a group named by its legend, of boxes named by their labels', async () => {
    const wrapper = await mountSuspended(CheckboxGroup, {
      props: { label: 'Toppings', options: toppings, modelValue: [] },
      attachTo: document.body,
    });

    const group = wrapper.get('fieldset');
    expect(roleOf(group)).toBe('group');
    expect(accessibleName(group)).toBe('Toppings');
    expect(wrapper.findAll('input').map((box) => accessibleName(box))).toEqual([
      'Cheese',
      'Ham',
    ]);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('asks for at least one box when required', async () => {
    const wrapper = await mountSuspended(CheckboxGroup, {
      props: {
        label: 'Toppings',
        required: true,
        showInvalid: true,
        options: toppings,
        modelValue: [],
      },
      attachTo: document.body,
    });

    const boxes = wrapper
      .findAll('input[type="checkbox"]')
      .map((box) => box.element as HTMLInputElement);
    expect(boxes.every((box) => box.required)).toBe(false);
    expect(boxes.every((box) => !box.checkValidity())).toBe(true);
    expect(boxes[0]?.validationMessage).toBe('Tick at least one option');

    const group = wrapper.get('fieldset');
    expect(description(group)).toBe('Tick at least one option');
    // Not aria-invalid: ARIA 1.2 deprecates it on a group (the fieldset)
    expect(group.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ modelValue: ['cheese'] });

    expect(boxes.every((box) => box.checkValidity())).toBe(true);
    expect(description(group)).toBe('');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('shows its error after a failed submit of its form', async () => {
    const wrapper = await mountInForm(() => [
      h(CheckboxGroup, {
        label: 'Toppings',
        required: true,
        options: toppings,
        modelValue: [],
      }),
    ]);
    const group = wrapper.get('fieldset');
    expect(description(group)).toBe('');

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(description(group)).toBe('Tick at least one option');
  });

  it('asks for one box also of a box added to the options in place', async () => {
    const options = reactive([{ value: 'cheese', label: 'Cheese' }]);
    const wrapper = await mountSuspended(CheckboxGroup, {
      props: { label: 'Toppings', required: true, options, modelValue: [] },
      attachTo: document.body,
    });

    options.push({ value: 'ham', label: 'Ham' });
    await nextTick();

    const boxes = wrapper
      .findAll('input[type="checkbox"]')
      .map((box) => box.element as HTMLInputElement);
    expect(boxes).toHaveLength(2);
    expect(boxes[1]?.validationMessage).toBe('Tick at least one option');
  });

  it('shows a custom error, and is described by it, until a box is ticked or unticked', async () => {
    const wrapper = await mountSuspended(CheckboxGroup, {
      props: {
        label: 'Toppings',
        options: toppings,
        modelValue: ['ham'],
        customError: 'Ham is sold out',
      },
      attachTo: document.body,
    });
    const group = wrapper.get('fieldset');

    expect(description(group)).toBe('Ham is sold out');
    expect(await checkA11y()).toHaveNoViolations();

    await wrapper.get('input').setValue(true);

    expect(description(group)).toBe('');
  });

  it('keeps its boxes and its error to itself next to another group with the same options', async () => {
    await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(CheckboxGroup, {
            label: 'Pizza',
            options: toppings,
            modelValue: [],
            required: true,
            showInvalid: true,
            errorMessage: 'Choose a pizza topping',
          }),
          h(CheckboxGroup, {
            label: 'Sandwich',
            options: toppings,
            modelValue: [],
            required: true,
            showInvalid: true,
            errorMessage: 'Choose a sandwich topping',
          }),
        ],
      }),
      { attachTo: document.body },
    );

    const ids = Array.from(document.querySelectorAll('input')).map(
      (box) => box.id,
    );
    expect(new Set(ids).size).toBe(4);
    expect(
      Array.from(document.querySelectorAll('fieldset')).map((group) =>
        description(group),
      ),
    ).toEqual(['Choose a pizza topping', 'Choose a sandwich topping']);
    expect(await checkA11y()).toHaveNoViolations();
  });
});
