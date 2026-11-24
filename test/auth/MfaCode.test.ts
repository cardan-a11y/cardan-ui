import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { MfaCode } from '#components';
import { expectNoViolations } from '../a11y';

describe('MfaCode', () => {
  it('takes a one-time code on a numeric keyboard', async () => {
    const wrapper = await mountSuspended(MfaCode, { attachTo: document.body });

    const input = wrapper.get('input[name="code"]');
    expect(input.attributes('inputmode')).toBe('numeric');
    expect(input.attributes('autocomplete')).toBe('one-time-code');
    await expectNoViolations();

    const element = input.element as HTMLInputElement;
    for (const [code, valid] of [
      ['123456', true],
      ['12345', false],
      ['12345a', false],
      ['      ', false],
    ] as const) {
      await input.setValue(code);
      expect(element.validity.patternMismatch, code).toBe(!valid);
    }
  });
});
