import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Select } from '#components';
import { accessibleName, checkA11y, description } from '../a11y';
import { mountInForm } from '../form';

const options = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
];

describe('Select', () => {
  it('is named by its label and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Select, {
      props: { label: 'Colour', options, modelValue: 'red' },
      attachTo: document.body,
    });

    expect(accessibleName(wrapper.get('select'))).toBe('Colour');
    expect(wrapper.findAll('option').map((o) => o.text())).toContain('Green');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('shows the error under the select, above the instruction, and is described by both', async () => {
    const wrapper = await mountSuspended(Select, {
      props: {
        label: 'Colour',
        options,
        modelValue: '',
        required: true,
        errorMessage: 'Choose a colour',
        instruction: 'The colour of the badge',
        showInvalid: true,
      },
      attachTo: document.body,
    });

    const select = wrapper.get('select');
    expect(description(select)).toBe('The colour of the badge Choose a colour');

    // In reading order: the select, its error, its instruction
    const [instruction, error] = (select.attributes('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)!);
    expect(
      select.element.compareDocumentPosition(error!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      error!.compareDocumentPosition(instruction!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('reads the value, label and disabled state from the named keys', async () => {
    const wrapper = await mountSuspended(Select, {
      props: {
        label: 'Language',
        options: [
          { code: 'nl', name: 'Dutch', off: false },
          { code: 'en', name: 'English', off: true },
        ],
        valueKey: 'code',
        labelKey: 'name',
        disabledKey: 'off',
        modelValue: 'nl',
      },
      attachTo: document.body,
    });

    const rendered = wrapper.findAll('option').map((option) => ({
      value: option.attributes('value'),
      label: option.text(),
      disabled: (option.element as HTMLOptionElement).disabled,
    }));
    expect(rendered).toEqual([
      { value: 'nl', label: 'Dutch', disabled: false },
      { value: 'en', label: 'English', disabled: true },
    ]);
  });

  it('describes the select by its error only while the error shows', async () => {
    const wrapper = await mountSuspended(Select, {
      props: {
        label: 'Colour',
        options,
        placeholder: 'Choose',
        modelValue: '',
        required: true,
        errorMessage: 'Choose a colour',
      },
      attachTo: document.body,
    });

    // Invalid, but not shown yet: a valid-looking field is not described by it
    const select = wrapper.get('select');
    expect(description(select)).toBe('');
    expect(select.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });

    expect(description(select)).toBe('Choose a colour');
    expect(select.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    // Valid: not described, whatever the form shows
    await select.setValue('green');
    expect(description(select)).toBe('');
    expect(select.attributes('aria-invalid')).toBeUndefined();
  });

  it('shows its error after a failed submit of its form', async () => {
    const wrapper = await mountInForm(() => [
      h(Select, {
        label: 'Colour',
        options,
        placeholder: 'Choose',
        modelValue: '',
        required: true,
      }),
    ]);
    const select = wrapper.get('select');
    expect(select.attributes('aria-invalid')).toBeUndefined();

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(select.attributes('aria-invalid')).toBe('true');
    expect(description(select)).toBe('Colour is missing');
  });

  it('shows a custom error, and is described by it, until its value changes', async () => {
    const wrapper = await mountSuspended(Select, {
      props: { label: 'Colour', options, modelValue: 'red' },
      attachTo: document.body,
    });
    const select = wrapper.get('select');

    await wrapper.setProps({ customError: 'Red is sold out' });

    expect(description(select)).toBe('Red is sold out');
    expect(select.attributes('aria-invalid')).toBe('true');
    // The server judges the next submit: the browser does not hold it back
    expect((select.element as HTMLSelectElement).checkValidity()).toBe(true);
    expect(await checkA11y()).toHaveNoViolations();

    await select.setValue('green');

    expect(description(select)).toBe('');
    expect(select.attributes('aria-invalid')).toBeUndefined();
  });

  it('puts an attribute on the select and a class and style on the wrapper', async () => {
    const wrapper = await mountSuspended(Select, {
      props: { label: 'Colour', options, modelValue: 'red' },
      attrs: { 'data-test': 'colour', class: 'wide', style: 'color: red' },
      attachTo: document.body,
    });

    const select = wrapper.get('select');
    expect(select.attributes('data-test')).toBe('colour');
    expect(select.attributes('class')).not.toContain('wide');
    expect(select.attributes('style')).toBeUndefined();
    expect(wrapper.classes()).toContain('wide');
    expect(wrapper.attributes('style')).toContain('color: red');
  });

  it('keeps its label and texts to itself next to another Select', async () => {
    await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(Select, { label: 'Colour', options, instruction: 'Of the badge' }),
          h(Select, { label: 'Shade', options, instruction: 'Of the text' }),
        ],
      }),
      { attachTo: document.body },
    );

    const selects = Array.from(document.querySelectorAll('select'));
    expect(selects.map((select) => accessibleName(select))).toEqual([
      'Colour',
      'Shade',
    ]);
    expect(selects.map((select) => description(select))).toEqual([
      'Of the badge',
      'Of the text',
    ]);
    expect(await checkA11y()).toHaveNoViolations();
  });
});
