import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Select } from '#components';
import { checkA11y } from '../a11y';

const options = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
];

describe('Select', () => {
  it('labels the select and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Select, {
      props: { label: 'Colour', options, modelValue: 'red' },
      attachTo: document.body,
    });

    expect(wrapper.get('label').attributes('for')).toBe(
      wrapper.get('select').attributes('id'),
    );
    expect(wrapper.findAll('option').map((o) => o.text())).toContain('Green');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('shows the error under the select, above the instruction', async () => {
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
    const error = wrapper.get('.error-wrapper').element;
    const instruction = wrapper.get('.instruction').element;
    expect(error.textContent).toContain('Choose a colour');
    expect(
      select.element.compareDocumentPosition(error) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      error.compareDocumentPosition(instruction) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const describedBy = (select.attributes('aria-describedby') ?? '').split(
      ' ',
    );
    expect(describedBy).toEqual(
      expect.arrayContaining([error.id, instruction.id]),
    );
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
    expect(select.attributes('aria-describedby')).toBeUndefined();
    expect(select.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });

    expect(
      document.getElementById(select.attributes('aria-describedby') ?? '')
        ?.textContent,
    ).toContain('Choose a colour');
    expect(select.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    // Valid: not described, whatever the form shows
    await select.setValue('green');
    expect(select.attributes('aria-describedby')).toBeUndefined();
  });

  it('shows a custom error, and is described by it, until its value changes', async () => {
    const wrapper = await mountSuspended(Select, {
      props: { label: 'Colour', options, modelValue: 'red' },
      attachTo: document.body,
    });
    const select = wrapper.get('select');

    await wrapper.setProps({ customError: 'Red is sold out' });

    const describedBy = select.attributes('aria-describedby') ?? '';
    expect(describedBy).toMatch(/^error-/);
    expect(document.getElementById(describedBy)?.textContent).toContain(
      'Red is sold out',
    );
    expect(select.attributes('aria-invalid')).toBe('true');
    expect(wrapper.get('.form-field-wrapper').classes()).toContain(
      'custom-error',
    );
    // The server judges the next submit: the browser does not hold it back
    expect((select.element as HTMLSelectElement).checkValidity()).toBe(true);

    await select.setValue('green');

    expect(select.attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.get('.form-field-wrapper').classes()).not.toContain(
      'custom-error',
    );
  });
});
