/**
 * The password length the API enforces, so it is never hard-coded here: read
 * from the policy endpoint (`{ data: { min_length, max_length } }`) when the
 * config names one, with `passwordPolicy` of the config as the answer until it
 * does. An API without such an endpoint sets `endpoints.passwordPolicy` to
 * `false`, and the config's policy is the one shown.
 *
 * Only the length can be checked while someone types: the breach,
 * common-password and personal-information checks run on the server and come
 * back as validation errors on submit; `serverChecks` says whether the API
 * runs them, so the forms can list them.
 *
 * Fetched once per session and shared through `useState`.
 */
export function usePasswordPolicy() {
  const { client } = useAuth();
  const { endpoints, passwordPolicy: configured } = useCardanAuthConfig();

  const policy = useState<{ minLength: number; maxLength?: number }>(
    'passwordPolicy',
    () => ({
      minLength: configured.minLength,
      maxLength: configured.maxLength ?? undefined,
    }),
  );
  const requested = useState('passwordPolicyRequested', () => false);

  if (endpoints.passwordPolicy && !requested.value) {
    requested.value = true;

    // The reset form asks as a guest. An answer that is no policy, such as a
    // 401 from a route that is not public, keeps the config's: it is not an
    // error for the fetch client, so nuxt-auth-sanctum does not treat it as
    // an expired session and send the guest to the login page mid-reset.
    client<{ data?: PasswordPolicyData }>(endpoints.passwordPolicy, {
      ignoreResponseError: true,
    })
      .then((response) => {
        const data = response?.data;
        if (!data?.min_length) return;

        policy.value = {
          minLength: data.min_length,
          maxLength: data.max_length,
        };
      })
      .catch(() => {
        // No connection: the config's policy stands, and the next form that
        // asks tries again
        requested.value = false;
      });
  }

  const minLength = computed(() => policy.value.minLength);
  const maxLength = computed(() => policy.value.maxLength);
  const serverChecks = computed(() => configured.serverChecks);

  return {
    minLength,
    maxLength,
    serverChecks,
  };
}
