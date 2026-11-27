import { afterEach, describe, it, expect } from 'vitest';
import { useLoginEmail, useMfaSetupReminder, useNuxtApp } from '#imports';
import { signIn } from './fortify';

const user = { email: 'ada@example.com', mfa_enabled: false };

// First in the file, which runs in an app of its own: the reminder reads the
// storage once per app, at its first use
describe('MFA setup reminder where site data is blocked', () => {
  const original = Object.getOwnPropertyDescriptor(
    globalThis,
    'sessionStorage',
  )!;
  let reads = 0;

  // As a browser does: reading `sessionStorage` itself throws
  function blockStorage() {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        reads++;
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  }

  afterEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', original);
  });

  it('starts without a reminder when reading it throws', () => {
    blockStorage();
    signIn(user);

    expect(useMfaSetupReminder().isReminderPending.value).toBe(false);
    expect(reads).toBe(1);
  });

  it('reminds and forgets for this page without throwing', () => {
    blockStorage();
    signIn(user);
    const { remindMfaSetup, dismissMfaSetup, isReminderPending } =
      useMfaSetupReminder();

    remindMfaSetup();
    expect(isReminderPending.value).toBe(true);

    dismissMfaSetup();
    expect(isReminderPending.value).toBe(false);
  });
});

describe('sign-out', () => {
  it('forgets the typed address and the MFA setup reminder', async () => {
    useLoginEmail().value = 'ada@example.com';
    signIn(user);
    useMfaSetupReminder().remindMfaSetup();
    expect(sessionStorage.getItem('mfa-setup-reminder')).toBe(
      'ada@example.com',
    );

    await useNuxtApp().callHook('sanctum:logout');

    expect(useLoginEmail().value).toBe('');
    expect(sessionStorage.getItem('mfa-setup-reminder')).toBeNull();
    signIn(user);
    expect(useMfaSetupReminder().isReminderPending.value).toBe(false);
  });
});
