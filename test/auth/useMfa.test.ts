import { describe, it, expect, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { useMfa, useMfaSetupReminder } from '#imports';
import {
  RECOVERY_CODES,
  client,
  fortify,
  navigate,
  pending,
  refuse,
  requests,
  signIn,
  twoFactorApi,
  useScenario,
} from './fortify';
import { academy } from './scenarios';

mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

const codes = 'GET /api/user/two-factor-recovery-codes';
const confirm = 'POST /api/user/confirmed-two-factor-authentication';
const identity = `GET ${academy.sanctum.endpoints.user}` as const;

describe('useMfa', () => {
  useScenario(academy);

  it('resets every trace of a flow', () => {
    const {
      mfaStep,
      mfaError,
      qrCode,
      recoveryCodes,
      mfaCredentials,
      resetMfa,
    } = useMfa();

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

  it('reads the recovery codes before it confirms the code', async () => {
    fortify(twoFactorApi(academy, academy.user()));
    const { mfaStep, recoveryCodes, enterCode } = useMfa();
    mfaStep.value = 3;

    await expect(enterCode()).resolves.toBe(true);

    const order = client.mock.calls.map(
      ([url, options]) => `${options?.method ?? 'GET'} ${url}`,
    );
    expect(order.indexOf(codes)).toBeLessThan(order.indexOf(confirm));
    expect(recoveryCodes.value).toEqual(RECOVERY_CODES);
    expect(mfaStep.value).toBe(4);
  });

  it('does not confirm, and says why, when the API serves no recovery codes', async () => {
    fortify(twoFactorApi(academy, academy.user(), { [codes]: () => [] }));
    const { mfaStep, mfaError, enterCode } = useMfa();
    mfaStep.value = 3;

    await expect(enterCode()).resolves.toBe(false);

    expect(requests(confirm)).toEqual([]);
    expect(mfaStep.value).toBe(3);
    expect(mfaError.value?.message).toBeTruthy();
  });

  it('refreshes the identity once the code is confirmed, with the codes shown first', async () => {
    signIn(academy.user({ mfa_enabled: false }));
    const refresh = pending({ data: academy.user({ mfa_enabled: true }) });
    fortify(
      twoFactorApi(academy, academy.user(), { [identity]: refresh.handler }),
    );
    const { mfaStep, enterCode } = useMfa();
    mfaStep.value = 3;

    let settled = false;
    const confirming = enterCode().then((result) => {
      settled = true;
      return result;
    });
    await vi.waitFor(() => expect(requests(identity)).toHaveLength(1));

    expect(mfaStep.value).toBe(4);
    expect(settled).toBe(false);

    refresh.answer();
    await expect(confirming).resolves.toBe(true);
    expect(useMfaSetupReminder().mfaEnabled.value).toBe(true);
  });

  it('confirms all the same when the refresh fails', async () => {
    signIn(academy.user({ mfa_enabled: false }));
    fortify(twoFactorApi(academy, academy.user(), { [identity]: refuse(500) }));
    const { mfaStep, mfaError, enterCode } = useMfa();
    mfaStep.value = 3;

    await expect(enterCode()).resolves.toBe(true);

    expect(requests(identity)).toHaveLength(1);
    expect(mfaStep.value).toBe(4);
    expect(mfaError.value).toBeNull();
  });
});
