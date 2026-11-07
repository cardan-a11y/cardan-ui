import { describe, it, expect } from 'vitest';
import { nextTick, reactive } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Checkbox, CheckboxGroup } from '#components';
import { checkA11y } from '../a11y';

describe('Checkbox', () => {
  it('labels the checkbox and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: { label: 'I agree', modelValue: false },
      attachTo: document.body,
    });

    const checkbox = wrapper.get('input[type="checkbox"]');
    expect(wrapper.get('label').attributes('for')).toBe(
      checkbox.attributes('id'),
    );
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('passes required on to the input', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: { label: 'I agree', modelValue: false, required: true },
      attachTo: document.body,
    });

    const checkbox = wrapper.get('input[type="checkbox"]')
      .element as HTMLInputElement;
    expect(checkbox.required).toBe(true);
    expect(wrapper.get('label').text()).toContain('required');

    // The error text is in the document for the form to reveal, and named
    const error = document.getElementById(
      checkbox.getAttribute('aria-describedby') ?? '',
    );
    expect(error?.textContent).toContain('Tick this box to continue');
    expect(await checkA11y()).toHaveNoViolations();
  });
});

describe('CheckboxGroup', () => {
  it('groups the checkboxes under a legend', async () => {
    const wrapper = await mountSuspended(CheckboxGroup, {
      props: {
        label: 'Toppings',
        options: [
          { value: 'cheese', label: 'Cheese' },
          { value: 'ham', label: 'Ham' },
        ],
        modelValue: [],
      },
      attachTo: document.body,
    });

    expect(wrapper.get('fieldset legend').text()).toContain('Toppings');
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(2);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('asks for at least one box when required', async () => {
    const wrapper = await mountSuspended(CheckboxGroup, {
      props: {
        label: 'Toppings',
        required: true,
        options: [
          { value: 'cheese', label: 'Cheese' },
          { value: 'ham', label: 'Ham' },
        ],
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

    const described = document.getElementById(
      wrapper.get('fieldset').attributes('aria-describedby') ?? '',
    );
    expect(described?.textContent).toContain('Tick at least one option');

    await wrapper.setProps({ modelValue: ['cheese'] });

    expect(boxes.every((box) => box.checkValidity())).toBe(true);
    expect(await checkA11y()).toHaveNoViolations();
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
});
