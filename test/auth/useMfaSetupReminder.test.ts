import { describe, it, expect } from 'vitest';
import { useMfaSetupReminder, useSanctumAuth } from '#imports';

describe('useMfaSetupReminder', () => {
  it('never requires setup of an exempted account', () => {
    const { user } = useSanctumAuth<{ data: Record<string, unknown> }>();
    const { needsMfaSetup, isMfaSetupRequired } = useMfaSetupReminder();

    user.value = {
      data: {
        email: 'ada@example.com',
        mfa_enabled: false,
        mfa_required: true,
        mfa_exempt: true,
      },
    };

    expect(needsMfaSetup.value).toBe(false);
    expect(isMfaSetupRequired.value).toBe(false);

    user.value = {
      ...user.value,
      data: { ...user.value.data, mfa_exempt: false },
    };

    expect(isMfaSetupRequired.value).toBe(true);
  });
});
