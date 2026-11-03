import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Radio, RadioGroup } from '#components';
import { checkA11y } from '../a11y';

describe('Radio', () => {
  it('labels the radio and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Radio, {
      props: { label: 'Yes', value: 'yes', name: 'answer', modelValue: 'no' },
      attachTo: document.body,
    });

    const radio = wrapper.get('input[type="radio"]');
    expect(wrapper.get('label').attributes('for')).toBe(radio.attributes('id'));
    expect(await checkA11y()).toHaveNoViolations();
  });
});

describe('RadioGroup', () => {
  it('groups the radios under a legend', async () => {
    const wrapper = await mountSuspended(RadioGroup, {
      props: {
        label: 'Answer',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
        modelValue: 'yes',
      },
      attachTo: document.body,
    });

    expect(wrapper.get('fieldset legend').text()).toContain('Answer');
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2);
    expect(await checkA11y()).toHaveNoViolations();
  });
});
