import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Checkbox, CheckboxGroup } from '#components';
import { checkA11y } from '../a11y';

describe('Checkbox', () => {
  it('labels the checkbox and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: { label: 'I agree', modelValue: false },
      attachTo: document.body,
    });

    const checkbox = wrapper.get('input[type="checkbox"]');
    expect(wrapper.get('label').attributes('for')).toBe(
      checkbox.attributes('id'),
    );
    expect(await checkA11y()).toHaveNoViolations();
  });
});

describe('CheckboxGroup', () => {
  it('groups the checkboxes under a legend', async () => {
    const wrapper = await mountSuspended(CheckboxGroup, {
      props: {
        label: 'Toppings',
        options: [
          { value: 'cheese', label: 'Cheese' },
          { value: 'ham', label: 'Ham' },
        ],
        modelValue: [],
      },
      attachTo: document.body,
    });

    expect(wrapper.get('fieldset legend').text()).toContain('Toppings');
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(2);
    expect(await checkA11y()).toHaveNoViolations();
  });
});
