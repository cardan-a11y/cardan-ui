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

  it('keeps its error for the form to reveal when required', async () => {
    const wrapper = await mountSuspended(RadioGroup, {
      props: {
        label: 'Answer',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
        // As a v-model passes it before a choice
        modelValue: undefined,
      },
      attachTo: document.body,
    });

    // In the document, for the form to reveal; not describing the group yet
    expect(wrapper.text()).toContain('Answer is missing');
    expect(
      wrapper.get('fieldset').attributes('aria-describedby'),
    ).toBeUndefined();
    expect(wrapper.get('.radios-wrapper').classes()).not.toContain(
      'show-invalid',
    );

    // One name, so the arrow keys move between the radios
    const names = new Set(
      wrapper
        .findAll('input[type="radio"]')
        .map((radio) => radio.attributes('name')),
    );
    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();

    await wrapper.setProps({ showInvalid: true });

    expect(wrapper.get('.radios-wrapper').classes()).toContain('show-invalid');
    const error = document.getElementById(
      wrapper.get('fieldset').attributes('aria-describedby') ?? '',
    );
    expect(error?.textContent).toContain('Answer is missing');
    expect(await checkA11y()).toHaveNoViolations();
  });
});
