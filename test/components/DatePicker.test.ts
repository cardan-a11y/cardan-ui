import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { DatePicker } from '#components';
import { checkA11y } from '../a11y';

describe('DatePicker', () => {
  it('describes its input by the error only while the error shows', async () => {
    const wrapper = await mountSuspended(DatePicker, {
      props: { label: 'Start', required: true, modelValue: null },
      attachTo: document.body,
    });
    await nextTick();

    const input = wrapper.get('input');
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'));
    expect(input.attributes('aria-describedby')).toBeUndefined();
    expect(input.attributes('aria-invalid')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });
    await nextTick();

    const error = document.getElementById(
      input.attributes('aria-describedby') ?? '',
    );
    expect(error?.textContent).toContain('Start is missing');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(await checkA11y()).toHaveNoViolations();

    await wrapper.setProps({ modelValue: new Date(2026, 10, 9) });
    await nextTick();

    expect(input.attributes('aria-describedby')).toBeUndefined();
    expect(input.attributes('aria-invalid')).toBeUndefined();
  });
});
