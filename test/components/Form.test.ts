import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { CheckboxGroup, Form, Input } from '#components';

describe('Form', () => {
  it('focuses the first box of a required group, not its fieldset', async () => {
    let invalid = 0;
    const wrapper = await mountSuspended(
      defineComponent({
        setup: () => () =>
          h(
            Form,
            { onInvalid: () => invalid++ },
            {
              default: () => [
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
            },
          ),
      }),
      { attachTo: document.body },
    );

    await wrapper.get('form').trigger('submit');

    expect(invalid).toBe(1);
    expect(document.activeElement).toBe(
      wrapper.get('input[type="checkbox"]').element,
    );
  });

  it('submits through requestSubmit, so its fields are checked first', async () => {
    const submitted: FormData[] = [];
    let invalid = 0;
    const name = ref('');
    const form = ref<{ submit: () => void }>();
    const wrapper = await mountSuspended(
      defineComponent({
        setup: () => () =>
          h(
            Form,
            {
              ref: form,
              onSubmit: (data: FormData) => submitted.push(data),
              onInvalid: () => invalid++,
            },
            {
              default: () => [
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
            },
          ),
      }),
      { attachTo: document.body },
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
    const wrapper = await mountSuspended(
      defineComponent({
        setup: () => () =>
          h(Form, null, {
            default: () => [
              h(Input, {
                label: 'Name',
                required: true,
                errorMessage: 'Fill in your name',
                modelValue: '',
              }),
              h('button', { type: 'submit' }, 'Send'),
            ],
          }),
      }),
      { attachTo: document.body },
    );

    // Before a submit, the empty field is not marked or described yet
    const input = wrapper.get('input');
    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(input.attributes('aria-describedby')).toBeUndefined();

    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(input.attributes('aria-invalid')).toBe('true');
    expect(
      document.getElementById(input.attributes('aria-describedby') ?? '')
        ?.textContent,
    ).toContain('Fill in your name');
    expect(document.activeElement).toBe(input.element);
  });
});
