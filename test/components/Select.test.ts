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

    const describedBy = (select.attributes('aria-describedby') ?? '').split(' ');
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
});
