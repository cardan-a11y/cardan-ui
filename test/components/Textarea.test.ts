import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Textarea } from '#components';
import { checkA11y } from '../a11y';

describe('Textarea', () => {
  it('labels the field and has no accessibility violations', async () => {
    const wrapper = await mountSuspended(Textarea, {
      props: { label: 'Message', modelValue: '' },
      attachTo: document.body,
    });

    expect(wrapper.get('label').attributes('for')).toBe(
      wrapper.get('textarea').attributes('id'),
    );
    expect(await checkA11y()).toHaveNoViolations();
  });
});
