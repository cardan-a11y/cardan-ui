import { describe, it, expect, vi } from 'vitest';
import { h, nextTick, ref } from 'vue';
import { CheckboxGroup, Input, Select, Textarea } from '#components';
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

  it('brings its fields’ models in line with values filled in without an input event', async () => {
    const name = ref('');
    const note = ref('');
    const size = ref('s');
    let seen: string[] = [];
    const wrapper = await mountInForm(
      () => [
        h(Input, {
          label: 'Name',
          name: 'name',
          required: true,
          customError: 'Taken',
          modelValue: name.value,
          'onUpdate:modelValue': (value?: string | number) => {
            name.value = String(value ?? '');
          },
        }),
        h(Textarea, {
          label: 'Note',
          name: 'note',
          modelValue: note.value,
          'onUpdate:modelValue': (value?: string | number) => {
            note.value = String(value ?? '');
          },
        }),
        h(Select, {
          label: 'Size',
          name: 'size',
          options: [
            { value: 's', label: 'Small' },
            { value: 'l', label: 'Large' },
          ],
          modelValue: size.value,
          'onUpdate:modelValue': (value?: string | number | boolean) => {
            size.value = String(value);
          },
        }),
      ],
      {
        // What a parent reads from its models when the form submits
        onSubmit: () => (seen = [name.value, note.value, size.value]),
      },
    );
    const input = wrapper.get('input');

    // An extension sets the values only, without input or change events
    input.element.value = 'Ada';
    wrapper.get('textarea').element.value = 'Hi';
    wrapper.get('select').element.value = 'l';
    await wrapper.get('form').trigger('submit');

    expect(seen).toEqual(['Ada', 'Hi', 'l']);
    // Taken as a typed value is: the new name clears the custom error
    await nextTick();
    expect(input.attributes('aria-invalid')).toBeUndefined();
  });

  it('keeps a custom error when nothing was filled in behind its back', async () => {
    const wrapper = await mountInForm(
      () => [
        h(Input, {
          label: 'Name',
          name: 'name',
          customError: 'Taken',
          modelValue: 'Ada',
        }),
      ],
      { onSubmit: () => {} },
    );

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
    expect(description(wrapper.get('input'))).toContain('Taken');
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
