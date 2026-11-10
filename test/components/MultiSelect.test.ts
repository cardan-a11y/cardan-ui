import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { MultiSelect } from '#components';
import { checkA11y } from '../a11y';

const options = [
  { value: 'cheese', label: 'Cheese' },
  { value: 'ham', label: 'Ham' },
];

function mountSelect(props: Record<string, unknown> = {}) {
  return mountSuspended(MultiSelect, {
    props: { label: 'Toppings', options, modelValue: [], ...props },
    attachTo: document.body,
  });
}

describe('MultiSelect', () => {
  it('keeps the field label in the name of the combobox, also once something is selected', async () => {
    const wrapper = await mountSelect({ modelValue: ['cheese'] });
    await nextTick();

    const combobox = wrapper.get('[role="combobox"]');
    const label = wrapper.get('label');
    const labelledby = combobox.attributes('aria-labelledby')?.split(' ') ?? [];

    expect(label.text()).toContain('Toppings');
    expect(labelledby).toContain(label.attributes('id'));
    // The library puts the selection first: "Cheese Toppings"
    const names = labelledby.map(
      (id) => document.getElementById(id)?.textContent?.trim() ?? '',
    );
    expect(names.join(' ')).toContain('Toppings');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('describes the combobox by its error only while the error shows', async () => {
    const wrapper = await mountSelect({ required: true });
    await nextTick();

    const combobox = wrapper.get('[role="combobox"]');
    expect(combobox.attributes('aria-describedby')).toBeUndefined();

    await wrapper.setProps({ showInvalid: true });
    await nextTick();

    const error = document.getElementById(
      combobox.attributes('aria-describedby') ?? '',
    );
    expect(error?.textContent).toContain('Toppings is missing');
    expect(combobox.attributes('aria-invalid')).toBe('true');
  });

  it('passes focus from the hidden required input on to the combobox', async () => {
    const wrapper = await mountSelect({ required: true });
    await nextTick();

    const fake = wrapper.get('.multiselect-fake-input').element as HTMLElement;
    fake.focus();
    await nextTick();

    expect(document.activeElement).toBe(
      wrapper.get('[role="combobox"]').element,
    );
  });
});
