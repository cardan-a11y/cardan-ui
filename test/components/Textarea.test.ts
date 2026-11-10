import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Textarea } from '#components';
import { checkA11y } from '../a11y';

describe('Textarea', () => {
  it('labels the field and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Textarea, {
      props: { label: 'Message', modelValue: '' },
      attachTo: document.body,
    });

    expect(wrapper.get('label').attributes('for')).toBe(
      wrapper.get('textarea').attributes('id'),
    );
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('shows the error under the field, above the instruction', async () => {
    const wrapper = await mountSuspended(Textarea, {
      props: {
        label: 'Message',
        modelValue: '',
        required: true,
        errorMessage: 'Write a message',
        instruction: 'At most 500 characters',
        showInvalid: true,
      },
      attachTo: document.body,
    });

    const textarea = wrapper.get('textarea');
    const error = wrapper.get('.error-wrapper').element;
    const instruction = wrapper.get('.instruction').element;
    expect(error.textContent).toContain('Write a message');
    expect(
      textarea.element.compareDocumentPosition(error) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      error.compareDocumentPosition(instruction) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const describedBy = (textarea.attributes('aria-describedby') ?? '').split(
      ' ',
    );
    expect(describedBy).toEqual(
      expect.arrayContaining([error.id, instruction.id]),
    );
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('describes the field by its error only while the error shows', async () => {
    const wrapper = await mountSuspended(Textarea, {
      props: {
        label: 'Message',
        modelValue: '',
        required: true,
        errorMessage: 'Write a message',
      },
      attachTo: document.body,
    });

    // Invalid, but not shown yet: a valid-looking field is not described by it
    const textarea = wrapper.get('textarea');
    expect(textarea.attributes('aria-describedby')).toBeUndefined();
    expect(textarea.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });

    expect(
      document.getElementById(textarea.attributes('aria-describedby') ?? '')
        ?.textContent,
    ).toContain('Write a message');
    expect(textarea.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    // Valid: not described, whatever the form shows
    await wrapper.setProps({ modelValue: 'Hello' });
    expect(textarea.attributes('aria-describedby')).toBeUndefined();
  });

  it('shows a custom error, and is described by it, until its value changes', async () => {
    const wrapper = await mountSuspended(Textarea, {
      props: { label: 'Message', modelValue: 'Buy now' },
      attachTo: document.body,
    });
    const textarea = wrapper.get('textarea');

    await wrapper.setProps({ customError: 'Looks like spam' });

    const describedBy = textarea.attributes('aria-describedby') ?? '';
    expect(describedBy).toMatch(/^error-/);
    expect(document.getElementById(describedBy)?.textContent).toContain(
      'Looks like spam',
    );
    expect(textarea.attributes('aria-invalid')).toBe('true');
    expect(wrapper.get('.form-field-wrapper').classes()).toContain(
      'custom-error',
    );
    // The server judges the next submit: the browser does not hold it back
    expect((textarea.element as HTMLTextAreaElement).checkValidity()).toBe(
      true,
    );

    await textarea.setValue('Hello, a question about the course');

    expect(textarea.attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.get('.form-field-wrapper').classes()).not.toContain(
      'custom-error',
    );
  });
});
