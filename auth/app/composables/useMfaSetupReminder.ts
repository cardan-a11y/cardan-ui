/**
 * Read through a local type rather than putting these on `AuthUser`, like
 * `useAuth().userName`: only APIs that take part in the setup reminder send
 * them.
 */
type MfaUserFields = {
  email?: string;
  mfa_enabled?: boolean;
  mfa_exempt?: boolean;
  mfa_required?: boolean;
};

const STORAGE_KEY = 'mfa-setup-reminder';

/** Whether the pending reminder was read from sessionStorage, once per page load */
let storageRead = false;

/**
 * Whether the MFA setup page stands between the user and the app.
 *
 * Only active when the user payload carries `mfa_enabled`; an API that does
 * not send it never sees the setup page. Two reasons, checked by the
 * `mfa-setup` middleware:
 * - **Required** (`mfa_required`): a role or the organization requires a
 *   second factor. The page offers no skip, and the API refuses everything but
 *   enrolment until it is set up.
 * - **Reminder**: anyone else without MFA (and not `mfa_exempt`) sees the page
 *   right after signing in. The login page sets it and skipping or finishing
 *   clears it, so it comes back on every sign-in. Kept in sessionStorage and
 *   keyed by the account, so a reload or a new tab does not show it again,
 *   and the next account to sign in on this tab starts afresh.
 */
export function useMfaSetupReminder() {
  const { user } = useAuth();

  const fields = computed(() => user.value?.data as MfaUserFields | undefined);

  const pendingFor = useState<string | null>('mfaSetupReminder', () => null);

  // Read on the client, outside the initializer: on a server-rendered page the
  // initializer runs on the server, where there is no sessionStorage, and its
  // null reaches the client in the payload. Nothing renders from it, so a read
  // during hydration changes no markup.
  if (import.meta.client && !storageRead) {
    storageRead = true;
    pendingFor.value = sessionStorage.getItem(STORAGE_KEY);
  }

  const mfaEnabled = computed(() => !!fields.value?.mfa_enabled);
  const mfaRequired = computed(() => !!fields.value?.mfa_required);
  const mfaExempt = computed(() => !!fields.value?.mfa_exempt);

  /** The API takes part, MFA is off, and the account is not exempted. */
  const needsMfaSetup = computed(
    () =>
      fields.value?.mfa_enabled !== undefined &&
      !mfaEnabled.value &&
      !mfaExempt.value,
  );

  /**
   * Required and still to be set up. An exempted account is never required,
   * whatever the role says: the setup page would send it on, and the
   * middleware straight back.
   */
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
    sessionStorage.setItem(STORAGE_KEY, email);
  }

  function dismissMfaSetup() {
    pendingFor.value = null;
    sessionStorage.removeItem(STORAGE_KEY);
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
