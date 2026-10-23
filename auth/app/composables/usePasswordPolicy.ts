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

    client<{ data: PasswordPolicyData }>(endpoints.passwordPolicy)
      .then(({ data }) => {
        policy.value = {
          minLength: data.min_length,
          maxLength: data.max_length,
        };
      })
      .catch((error) => {
        console.info(error);
        // Let the next form that asks try again.
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
