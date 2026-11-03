import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { Button } from '#components';
import { checkA11y } from '../a11y';

describe('Button', () => {
  it('renders a button with its label', async () => {
    const wrapper = await mountSuspended(Button, {
      props: { label: 'Save' },
      attachTo: document.body,
    });

    expect(wrapper.get('button').text()).toContain('Save');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('keeps an accessible name when the label is hidden', async () => {
    const wrapper = await mountSuspended(Button, {
      props: {
        label: 'Close',
        icon: 'material-symbols:close-rounded',
        hideLabel: true,
      },
      attachTo: document.body,
    });

    const button = wrapper.get('button');
    const name = button.attributes('aria-label') ?? button.text();
    expect(name).toContain('Close');
    expect(await checkA11y()).toHaveNoViolations();
  });
});
