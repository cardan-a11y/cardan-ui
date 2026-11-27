import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, useModel } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { CheckboxGroup, Form, Input, Select, Textarea } from '#components';
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

  it('submits a filled-in value also to a parent that binds the field through its own v-model', async () => {
    // A form component whose model is its parent's: `defineModel` reads the
    // new value only after that parent has rendered
    const NameForm = defineComponent({
      props: { name: { type: String, default: '' } },
      emits: ['update:name', 'seen'],
      setup(props, { emit }) {
        const name = useModel(props, 'name');
        return () =>
          h(
            Form,
            { onSubmit: () => emit('seen', name.value) },
            {
              default: () => [
                h(Input, {
                  label: 'Name',
                  name: 'name',
                  modelValue: name.value,
                  'onUpdate:modelValue': (value?: string | number) => {
                    name.value = String(value ?? '');
                  },
                }),
              ],
            },
          );
      },
    });
    const name = ref('');
    let seen: string | undefined;
    const wrapper = await mountSuspended(
      defineComponent({
        setup: () => () =>
          h(NameForm, {
            name: name.value,
            'onUpdate:name': (value: string) => (name.value = value),
            onSeen: (value: string) => (seen = value),
          }),
      }),
      { attachTo: document.body },
    );

    wrapper.get('input').element.value = 'Ada';
    await wrapper.get('form').trigger('submit');
    await vi.waitFor(() => expect(seen).toBeDefined());

    expect(seen).toBe('Ada');
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

  it('shows the errors of its fields after a failed submit, before focus reaches the first', async () => {
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
    // What a screen reader reads as focus arrives
    let describedAtFocus: string | undefined;
    input.element.addEventListener('focus', () => {
      describedAtFocus = description(input);
    });

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(input.attributes('aria-invalid')).toBe('true');
    expect(description(input)).toContain('Fill in your name');
    expectFocused(input);
    expect(describedAtFocus).toContain('Fill in your name');
  });
});

describe('Form: resetting the shown errors', () => {
  /** A required Input in a Form that stays mounted, as in a reopened dialog */
  async function mountRequired() {
    const form = ref<{ resetValidity: () => void }>();
    const wrapper = await mountSuspended(
      defineComponent({
        setup: () => () =>
          h(
            Form,
            { ref: form },
            {
              default: () => [
                h(Input, { label: 'Name', required: true, minlength: 5 }),
              ],
            },
          ),
      }),
      { attachTo: document.body },
    );
    await wrapper.get('form').trigger('submit');
    await nextTick();
    const input = wrapper.get('input');
    expect(input.attributes('aria-invalid')).toBe('true');
    return { wrapper, input, form };
  }

  it('resetValidity() hides the errors of the failed submit and keeps the values', async () => {
    const { input, form } = await mountRequired();
    // Still too short: the error is hidden, not solved
    await input.setValue('kept');
    expect(input.attributes('aria-invalid')).toBe('true');

    form.value!.resetValidity();
    await nextTick();

    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(description(input)).toBe('');
    expect((input.element as HTMLInputElement).value).toBe('kept');
  });

  it('a reset of the form hides them too', async () => {
    const { wrapper, input } = await mountRequired();

    await wrapper.get('form').trigger('reset');

    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(description(input)).toBe('');
  });
});

describe('Form: a form nested in it', () => {
  it('leaves the submit and reset of the inner form to that form', async () => {
    const submitted = vi.fn();
    const invalid = vi.fn();
    const wrapper = await mountInForm(
      () => [
        h(Input, { label: 'Name', required: true, modelValue: '' }),
        h(
          'form',
          { class: 'inner', onSubmit: (e: Event) => e.preventDefault() },
          [h('input', { name: 'digit', value: '3' })],
        ),
      ],
      { onSubmit: submitted, onInvalid: invalid },
    );

    await wrapper.get('form.inner').trigger('submit');
    await nextTick();

    expect(submitted).not.toHaveBeenCalled();
    expect(invalid).not.toHaveBeenCalled();
    expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined();

    // The outer form's own errors stay through a reset of the inner one
    await wrapper.get('form').trigger('submit');
    await nextTick();
    await wrapper.get('form.inner').trigger('reset');
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
  });
});

describe('Form: focus functions', () => {
  it('calls autofocusFn on mount, and invalidFocusFn in place of focusing the first invalid field', async () => {
    const autofocusFn = vi.fn();
    const invalidFocusFn = vi.fn();
    const wrapper = await mountInForm(
      () => [h(Input, { label: 'Name', required: true, modelValue: '' })],
      { autofocusFn, invalidFocusFn },
    );
    expect(autofocusFn).toHaveBeenCalledTimes(1);

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(invalidFocusFn).toHaveBeenCalledTimes(1);
    expect(document.activeElement).not.toBe(wrapper.get('input').element);
  });
});
