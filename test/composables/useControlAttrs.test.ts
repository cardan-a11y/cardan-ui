import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';

/** A field that passes its attributes to its input, as the field components do */
function field(exclude?: string[]) {
  return defineComponent({
    inheritAttrs: false,
    setup() {
      const { controlAttrs } = useControlAttrs(exclude);
      return () => h('div', [h('input', controlAttrs())]);
    },
  });
}

describe('useControlAttrs', () => {
  it('passes every attribute but class and style to the control', async () => {
    const wrapper = await mountSuspended(field(), {
      attrs: { class: 'wide', style: 'color: red', autocomplete: 'email' },
    });
    const input = wrapper.find('input');

    expect(input.attributes('autocomplete')).toBe('email');
    expect(input.attributes('class')).toBeUndefined();
    expect(input.attributes('style')).toBeUndefined();
  });

  it('leaves out the attributes it is told to', async () => {
    const wrapper = await mountSuspended(field(['aria-describedby']), {
      attrs: { 'aria-describedby': 'hint', inputmode: 'numeric' },
    });
    const input = wrapper.find('input');

    expect(input.attributes('aria-describedby')).toBeUndefined();
    expect(input.attributes('inputmode')).toBe('numeric');
  });

  it('follows an attribute that changes', async () => {
    const placeholder = ref('One');
    const Field = field();
    const wrapper = await mountSuspended(
      defineComponent(() => () => h(Field, { placeholder: placeholder.value })),
    );
    placeholder.value = 'Two';
    await nextTick();

    expect(wrapper.find('input').attributes('placeholder')).toBe('Two');
  });
});
