import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { CheckboxGroup, Form } from '#components';

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
});
