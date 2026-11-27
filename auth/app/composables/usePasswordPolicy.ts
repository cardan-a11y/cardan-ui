/**
 * The password length the API enforces, from `endpoints.passwordPolicy`
 * (`{ data: { min_length, max_length } }`), read once per session; the config's
 * `passwordPolicy` until it answers, or without one. `serverChecks` from config.
 */
export function usePasswordPolicy() {
  const { client } = useAuth();
  const { endpoints, passwordPolicy: configured } = useCardanAuthConfig();

  const policy = useState<{ minLength: number; maxLength?: number }>(
    'cardan-auth:password-policy',
    () => ({
      minLength: configured.minLength,
      maxLength: configured.maxLength ?? undefined,
    }),
  );
  const requested = useState(
    'cardan-auth:password-policy-requested',
    () => false,
  );

  if (endpoints.passwordPolicy && !requested.value) {
    requested.value = true;

    // `ignoreResponseError`: a guest's 401 on the reset form would make
    // nuxt-auth-sanctum (`redirectIfUnauthenticated`) send them to the login page
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
