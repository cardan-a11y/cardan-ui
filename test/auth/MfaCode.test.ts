import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { MfaCode } from '#components';

// Its name, keyboard and autocomplete are in MfaChallenge.test.ts ("starts in
// a code field made for one-time codes")
describe('MfaCode', () => {
  it('takes six digits and nothing else', async () => {
    const wrapper = await mountSuspended(MfaCode, { attachTo: document.body });

    const input = wrapper.get('input[name="code"]');
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
