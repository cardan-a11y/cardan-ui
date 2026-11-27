import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Textarea } from '#components';
import { description, expectNoViolations } from '../a11y';
import { mountInForm } from '../form';

describe('Textarea', () => {
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
    await expectNoViolations();
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

  it('checks its constraints on every keystroke, also one that leaves a trimmed model as it was', async () => {
    const text = ref('Hi');
    const wrapper = await mountSuspended(
      defineComponent({
        setup: () => () =>
          h(Textarea, {
            label: 'Message',
            minlength: 3,
            showInvalid: true,
            modelValue: text.value,
            // As `v-model.trim` does
            'onUpdate:modelValue': (value?: string | number) => {
              text.value = String(value ?? '').trim();
            },
          }),
      }),
      { attachTo: document.body },
    );
    const field = wrapper.get('textarea');
    field.element.value = 'H';
    await field.trigger('input');
    field.element.value = 'Hi';
    await field.trigger('input');
    expect(field.attributes('aria-invalid')).toBe('true');

    field.element.value = 'Hi ';
    await field.trigger('input');

    expect(field.attributes('aria-invalid')).toBeUndefined();
  });
});

describe('Textarea: the error names the check that failed', () => {
  it.each([
    {
      attrs: { minlength: 10 },
      value: 'Too short',
      error: 'Enter at least 10 characters',
    },
    {
      attrs: { maxlength: 5 },
      value: 'Too long',
      error: 'Enter at most 5 characters',
    },
  ])('$error', async ({ attrs, value, error }) => {
    const wrapper = await mountInForm(() => [
      h(Textarea, { label: 'Comment', modelValue: value, ...attrs }),
    ]);
    const textarea = wrapper.get('textarea');

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(textarea.attributes('aria-invalid')).toBe('true');
    expect(description(textarea)).toBe(error);
  });
});
