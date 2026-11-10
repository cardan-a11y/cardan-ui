import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { MfaCode } from '#components';
import { checkA11y } from '../a11y';

describe('MfaCode', () => {
  it('takes a one-time code on a numeric keyboard', async () => {
    const wrapper = await mountSuspended(MfaCode, { attachTo: document.body });

    // The phone's keyboard and its autofill from SMS, mail or a password
    // manager that holds the secret
    const input = wrapper.get('input[name="code"]');
    expect(input.attributes('inputmode')).toBe('numeric');
    expect(input.attributes('autocomplete')).toBe('one-time-code');
    expect(input.attributes('pattern')).toBe('[0-9]{6}');
    expect(await checkA11y()).toHaveNoViolations();
  });
});
