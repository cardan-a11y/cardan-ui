import { describe, it, expect } from 'vitest';
import { useMfa } from '#imports';

describe('useMfa', () => {
  it('resets every trace of a flow', () => {
    const {
      mfaStep,
      mfaError,
      qrCode,
      recoveryCodes,
      mfaCredentials,
      resetMfa,
    } = useMfa();

    // An enrolment abandoned on the recovery codes step
    mfaStep.value = 4;
    mfaError.value = { message: 'Something went wrong.' };
    qrCode.value = '<svg></svg>';
    recoveryCodes.value = ['abcdefghij-abcdefghij'];
    mfaCredentials.value = { code: '123456', recovery_code: 'abc' };

    resetMfa();

    expect(mfaStep.value).toBe(1);
    expect(mfaError.value).toBeNull();
    expect(qrCode.value).toBe('');
    expect(recoveryCodes.value).toEqual([]);
    expect(mfaCredentials.value).toEqual({ code: '', recovery_code: '' });
  });
});
