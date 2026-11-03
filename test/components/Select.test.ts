import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Select } from '#components';
import { checkA11y } from '../a11y';

const options = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
];

describe('Select', () => {
  it('labels the select and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Select, {
      props: { label: 'Colour', options, modelValue: 'red' },
      attachTo: document.body,
    });

    expect(wrapper.get('label').attributes('for')).toBe(
      wrapper.get('select').attributes('id'),
    );
    expect(wrapper.findAll('option').map((o) => o.text())).toContain('Green');
    expect(await checkA11y()).toHaveNoViolations();
  });
});
