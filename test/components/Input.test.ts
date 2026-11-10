import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Input } from '#components';
import { checkA11y } from '../a11y';

describe('Input', () => {
  it('labels the field and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Input, {
      props: { label: 'Name', modelValue: '' },
      attachTo: document.body,
    });

    expect(wrapper.get('label').attributes('for')).toBe(
      wrapper.get('input').attributes('id'),
    );
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('describes the field by its error only while the error shows', async () => {
    const wrapper = await mountSuspended(Input, {
      props: {
        label: 'Name',
        modelValue: '',
        required: true,
        errorMessage: 'Required',
      },
      attachTo: document.body,
    });

    // Invalid, but not shown yet: a valid-looking field is not described by it
    const input = wrapper.get('input');
    expect(input.attributes('aria-describedby')).toBeUndefined();
    expect(input.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });

    const describedBy = input.attributes('aria-describedby') ?? '';
    expect(describedBy).not.toBe('');
    for (const id of describedBy.split(' ')) {
      expect(document.getElementById(id)?.textContent).toContain('Required');
    }
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    // Valid: not described, whatever the form shows
    await wrapper.setProps({ modelValue: 'Ada' });
    expect(input.attributes('aria-describedby')).toBeUndefined();
  });

  it('shows a custom error, and is described by it, until its value changes', async () => {
    const wrapper = await mountSuspended(Input, {
      props: { label: 'Email', modelValue: 'ada@example.com', type: 'email' },
      attachTo: document.body,
    });
    const input = wrapper.get('input');

    await wrapper.setProps({ customError: 'Already registered' });

    expect(
      document.getElementById(input.attributes('aria-describedby') ?? '')
        ?.textContent,
    ).toContain('Already registered');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(wrapper.get('.form-field-wrapper').classes()).toContain(
      'custom-error',
    );
    // The server judges the next submit: the browser does not hold it back
    expect(input.element.checkValidity()).toBe(true);

    await input.setValue('ada@cardan.com');

    expect(input.attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.get('.form-field-wrapper').classes()).not.toContain(
      'custom-error',
    );
  });

  it('puts an attribute on the input and a class on the wrapper', async () => {
    const wrapper = await mountSuspended(Input, {
      props: { label: 'Code', modelValue: '', inputmode: 'numeric' },
      attrs: { 'data-test': 'code', class: 'wide' },
      attachTo: document.body,
    });

    expect(wrapper.get('input').attributes('inputmode')).toBe('numeric');
    expect(wrapper.get('input').attributes('data-test')).toBe('code');
    expect(wrapper.get('.form-field-wrapper').classes()).toContain('wide');
    expect(wrapper.get('input').classes()).not.toContain('wide');
  });

  it('lets a number outside min and max reach the model', async () => {
    let value: unknown;
    const wrapper = await mountSuspended(Input, {
      props: {
        label: 'Participants',
        type: 'number',
        min: 1,
        max: 10,
        modelValue: 1,
        'onUpdate:modelValue': (newValue: unknown) => {
          value = newValue;
        },
      },
      attachTo: document.body,
    });

    await wrapper.get('input').setValue('15');

    expect(value).toBe('15');
  });
});
