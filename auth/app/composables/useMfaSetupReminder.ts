// Not on `AuthUser`: only APIs that take part in the reminder send them
type MfaUserFields = {
  email?: string;
  mfa_enabled?: boolean;
  mfa_exempt?: boolean;
  mfa_required?: boolean;
};

const STORAGE_KEY = 'mfa-setup-reminder';

let reminderReadFromStorage = false;

// Throws where site data is blocked: the reminder then lasts for this page only
function storage<T>(use: (store: Storage) => T): T | undefined {
  try {
    return use(sessionStorage);
  } catch {
    return undefined;
  }
}

/**
 * Whether the MFA setup page stands between the user and the app, for an API
 * whose user payload has `mfa_enabled`: required (`mfa_required`, no skip), or
 * a reminder after each sign-in for an account without MFA, unless `mfa_exempt`.
 */
export function useMfaSetupReminder() {
  const { user } = useAuth();

  const fields = computed(() => user.value?.data as MfaUserFields | undefined);

  const pendingFor = useState<string | null>(
    'cardan-auth:mfa-setup-reminder',
    () => null,
  );

  // Outside the initializer: on a server-rendered page that runs on the server,
  // without sessionStorage. Nothing renders from it, so hydration is unaffected
  if (import.meta.client && !reminderReadFromStorage) {
    reminderReadFromStorage = true;
    pendingFor.value = storage((store) => store.getItem(STORAGE_KEY)) ?? null;
  }

  const mfaEnabled = computed(() => !!fields.value?.mfa_enabled);
  const mfaRequired = computed(() => !!fields.value?.mfa_required);
  const mfaExempt = computed(() => !!fields.value?.mfa_exempt);

  const apiReportsMfa = computed(() => fields.value?.mfa_enabled !== undefined);

  const needsMfaSetup = computed(
    () => apiReportsMfa.value && !mfaEnabled.value && !mfaExempt.value,
  );

  const isMfaSetupRequired = computed(
    () => needsMfaSetup.value && mfaRequired.value,
  );

  const isReminderPending = computed(
    () =>
      !!fields.value?.email &&
      pendingFor.value === fields.value.email &&
      needsMfaSetup.value,
  );

  function remindMfaSetup() {
    const email = fields.value?.email;
    if (!email) return;

    pendingFor.value = email;
    storage((store) => store.setItem(STORAGE_KEY, email));
  }

  function dismissMfaSetup() {
    pendingFor.value = null;
    storage((store) => store.removeItem(STORAGE_KEY));
  }

  return {
    mfaEnabled,
    mfaRequired,
    mfaExempt,
    needsMfaSetup,
    isMfaSetupRequired,
    isReminderPending,
    remindMfaSetup,
    dismissMfaSetup,
  };
}
