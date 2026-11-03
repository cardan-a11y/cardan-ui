import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Switch } from '#components';
import { checkA11y } from '../a11y';

describe('Switch', () => {
  it('is a labelled switch with no accessibility violations', async () => {
    const wrapper = await mountSuspended(Switch, {
      props: { label: 'Dark mode', modelValue: false },
      attachTo: document.body,
    });

    const control = wrapper.get('input, button');
    expect(control.attributes('role') ?? control.attributes('type')).toMatch(
      /switch|checkbox/,
    );
    expect(await checkA11y()).toHaveNoViolations();
  });
});
