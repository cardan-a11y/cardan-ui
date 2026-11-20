import { describe, it, expect } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';

const invalid = ref(false);

/** A field that exposes what useCustomError returns */
const Field = defineComponent({
  props: { customError: String, showInvalid: Boolean },
  setup(props, { expose }) {
    expose(
      useCustomError(() => props.customError, {
        invalid: () => invalid.value,
        showInvalid: () => props.showInvalid,
      }),
    );
    return () => h('input');
  },
});

/** The exposed refs, unwrapped on the instance */
interface Exposed {
  customErrorActive: boolean;
  errorShown: boolean;
  clearCustomError: () => void;
}

describe('useCustomError', () => {
  it('shows a custom error from mount until a new value clears it', async () => {
    const wrapper = await mountSuspended(Field, {
      props: { customError: 'Taken' },
    });
    const field = wrapper.vm as unknown as Exposed;

    expect(field.customErrorActive).toBe(true);
    expect(field.errorShown).toBe(true);

    field.clearCustomError();
    expect(field.errorShown).toBe(false);
  });

  it('shows a custom error the parent sets again', async () => {
    const wrapper = await mountSuspended(Field, {
      props: { customError: 'Taken' },
    });
    const field = wrapper.vm as unknown as Exposed;
    field.clearCustomError();

    await wrapper.setProps({ customError: 'Taken again' });
    await nextTick();
    expect(field.customErrorActive).toBe(true);

    await wrapper.setProps({ customError: undefined });
    await nextTick();
    expect(field.customErrorActive).toBe(false);
  });

  it('shows the field’s own error only with showInvalid or after a failed submit', async () => {
    invalid.value = true;
    const wrapper = await mountSuspended(Field);
    const field = wrapper.vm as unknown as Exposed;

    expect(field.errorShown).toBe(false);

    await wrapper.setProps({ showInvalid: true });
    expect(field.errorShown).toBe(true);

    invalid.value = false;
    expect(field.errorShown).toBe(false);
  });

  it('shows the field’s own error after its Form failed a submit', async () => {
    invalid.value = true;
    const wrapper = await mountSuspended(Field, {
      global: { provide: { [formShowInvalidKey as symbol]: ref(true) } },
    });
    const field = wrapper.vm as unknown as Exposed;

    expect(field.errorShown).toBe(true);
    invalid.value = false;
  });
});
