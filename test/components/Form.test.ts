import { describe, it, expect, vi } from 'vitest';
import { h, nextTick, ref } from 'vue';
import { CheckboxGroup, Input } from '#components';
import { description, expectFocused } from '../a11y';
import { mountInForm } from '../form';

describe('Form', () => {
  it('focuses the first box of a required group, not its fieldset', async () => {
    let invalid = 0;
    const wrapper = await mountInForm(
      () => [
        h(CheckboxGroup, {
          label: 'Toppings',
          required: true,
          options: [
            { value: 'cheese', label: 'Cheese' },
            { value: 'ham', label: 'Ham' },
          ],
          modelValue: [],
        }),
        h('button', { type: 'submit' }, 'Order'),
      ],
      { onInvalid: () => invalid++ },
    );

    await wrapper.get('form').trigger('submit');

    expect(invalid).toBe(1);
    expectFocused(wrapper.get('input[type="checkbox"]'));
  });

  it('submits through requestSubmit, so its fields are checked first', async () => {
    const submitted: FormData[] = [];
    let invalid = 0;
    const name = ref('');
    const form = ref<{ submit: () => void }>();
    const wrapper = await mountInForm(
      () => [
        h(Input, {
          label: 'Name',
          name: 'name',
          required: true,
          errorMessage: 'Fill in your name',
          modelValue: name.value,
          'onUpdate:modelValue': (value?: string | number) => {
            name.value = String(value ?? '');
          },
        }),
      ],
      {
        ref: form,
        onSubmit: (data: FormData) => submitted.push(data),
        onInvalid: () => invalid++,
      },
    );
    const formElement = wrapper.get('form').element;
    const requestSubmit = vi.spyOn(formElement, 'requestSubmit');

    form.value!.submit();
    await nextTick();

    expect(requestSubmit).toHaveBeenCalledTimes(1);
    expect(invalid).toBe(1);
    expect(submitted).toHaveLength(0);

    name.value = 'Ada';
    await nextTick();
    form.value!.submit();
    await nextTick();

    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.get('name')).toBe('Ada');
  });

  it('shows the errors of its fields after a failed submit', async () => {
    const wrapper = await mountInForm(() => [
      h(Input, {
        label: 'Name',
        required: true,
        errorMessage: 'Fill in your name',
        modelValue: '',
      }),
      h('button', { type: 'submit' }, 'Send'),
    ]);

    // Before a submit, the empty field is not marked or described yet
    const input = wrapper.get('input');
    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(description(input)).toBe('');

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(input.attributes('aria-invalid')).toBe('true');
    expect(description(input)).toContain('Fill in your name');
    expectFocused(input);
  });
});
