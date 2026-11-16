import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Textarea } from '#components';
import { accessibleName, checkA11y, description } from '../a11y';
import { mountInForm } from '../form';

describe('Textarea', () => {
  it('is named by its label and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Textarea, {
      props: { label: 'Message', modelValue: '' },
      attachTo: document.body,
    });

    expect(accessibleName(wrapper.get('textarea'))).toBe('Message');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('shows the error under the field, above the instruction, and is described by both', async () => {
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
    expect(description(textarea)).toBe(
      'At most 500 characters Write a message',
    );

    // In reading order: the field, its error, its instruction
    const [instruction, error] = (textarea.attributes('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)!);
    expect(
      textarea.element.compareDocumentPosition(error!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      error!.compareDocumentPosition(instruction!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
    expect(description(textarea)).toBe('');
    expect(textarea.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });

    expect(description(textarea)).toBe('Write a message');
    expect(textarea.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    // Valid: not described, whatever the form shows
    await wrapper.setProps({ modelValue: 'Hello' });
    expect(description(textarea)).toBe('');
    expect(textarea.attributes('aria-invalid')).toBeUndefined();
  });

  it('shows its error after a failed submit of its form', async () => {
    const wrapper = await mountInForm(() => [
      h(Textarea, { label: 'Message', modelValue: '', required: true }),
    ]);
    const textarea = wrapper.get('textarea');
    expect(textarea.attributes('aria-invalid')).toBeUndefined();

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(textarea.attributes('aria-invalid')).toBe('true');
    expect(description(textarea)).toBe('Message is missing');
  });

  it('shows a custom error, and is described by it, until its value changes', async () => {
    const wrapper = await mountSuspended(Textarea, {
      props: { label: 'Message', modelValue: 'Buy now' },
      attachTo: document.body,
    });
    const textarea = wrapper.get('textarea');

    await wrapper.setProps({ customError: 'Looks like spam' });

    expect(description(textarea)).toBe('Looks like spam');
    expect(textarea.attributes('aria-invalid')).toBe('true');
    // The server judges the next submit: the browser does not hold it back
    expect((textarea.element as HTMLTextAreaElement).checkValidity()).toBe(
      true,
    );
    expect(await checkA11y()).toHaveNoViolations();

    await textarea.setValue('Hello, a question about the course');

    expect(description(textarea)).toBe('');
    expect(textarea.attributes('aria-invalid')).toBeUndefined();
  });

  it('puts an attribute on the textarea and a class and style on the wrapper', async () => {
    const wrapper = await mountSuspended(Textarea, {
      props: { label: 'Message', modelValue: '' },
      attrs: { 'data-test': 'message', class: 'wide', style: 'color: red' },
      attachTo: document.body,
    });

    const textarea = wrapper.get('textarea');
    expect(textarea.attributes('data-test')).toBe('message');
    expect(textarea.attributes('class')).not.toContain('wide');
    expect(textarea.attributes('style') ?? '').not.toContain('color');
    expect(wrapper.classes()).toContain('wide');
    expect(wrapper.attributes('style')).toContain('color: red');
  });

  it('keeps its label and texts to itself next to another Textarea', async () => {
    await mountSuspended(
      defineComponent({
        setup: () => () => [
          h(Textarea, { label: 'Question', instruction: 'One at a time' }),
          h(Textarea, { label: 'Context', instruction: 'Optional' }),
        ],
      }),
      { attachTo: document.body },
    );

    const textareas = Array.from(document.querySelectorAll('textarea'));
    expect(textareas.map((textarea) => accessibleName(textarea))).toEqual([
      'Question',
      'Context',
    ]);
    expect(textareas.map((textarea) => description(textarea))).toEqual([
      'One at a time',
      'Optional',
    ]);
    expect(await checkA11y()).toHaveNoViolations();
  });

  // Only spaces are left to the API, which trims them and refuses an empty text
  it.each([true, false])(
    'lets only spaces through, required: %s',
    async (required) => {
      await mountInForm(() => [
        h(Textarea, { label: 'Message', required, modelValue: ' \n  ' }),
      ]);

      expect(document.querySelector('textarea')!.checkValidity()).toBe(true);
    },
  );
});
