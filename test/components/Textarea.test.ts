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
});
