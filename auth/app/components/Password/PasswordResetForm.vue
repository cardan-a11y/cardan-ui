<script setup lang="ts">
/**
 * Sets a new password from the reset link's `token` and `email`, then signs
 * the user in. Without `email` in the link it shows an email field.
 */
const route = useRoute();
const { client, loginWithoutRedirect, refreshIdentity, loginRedirectTarget } =
  useAuth();
const { endpoints } = useCardanAuthConfig();
const { minLength, maxLength } = usePasswordPolicy();
const loginEmail = useLoginEmail();
const { remindMfaSetup } = useMfaSetupReminder();
const { createToast } = useToast();
const { t } = useI18n();

const linkEmail = computed(() => String(route.query.email ?? ''));
const token = computed(() => String(route.query.token ?? ''));

const email = ref(linkEmail.value);
const password = ref('');
const passwordConfirmation = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref<ApiErrorData | null>(null);
const requirementsId = useId();

async function resetPassword() {
  error.value = null;
  loading.value = true;

  try {
    await client(endpoints.resetPassword, {
      method: 'POST',
      body: {
        token: token.value,
        email: email.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      },
    });
  } catch (e) {
    error.value = extractApiError(e);
    loading.value = false;
    return;
  }

  try {
    const response = await loginWithoutRedirect({
      email: email.value,
      password: password.value,
    });

    if (response?.two_factor) {
      await navigateTo({
        path: '/two-factor-authentication',
        query: { redirect: route.query.redirect },
      });
    } else {
      await refreshIdentity();
      // Signed in like on the login page: without MFA, past the setup page
      remindMfaSetup();
      const target = loginRedirectTarget();
      if (target !== false) await navigateTo(target);
    }
  } catch {
    loginEmail.value = email.value;
    createToast({ label: t('password.saved'), color: 'green' });
    await navigateTo({
      path: '/login',
      query: { redirect: route.query.redirect },
    });
  }

  setTimeout(() => {
    loading.value = false;
  }, transitionDuration('lg'));
}
</script>

<template>
  <Form class="password-reset-form" @submit="resetPassword">
    <!-- For a password manager to store the new password with the account -->
    <input
      v-if="linkEmail"
      type="email"
      name="email"
      autocomplete="username"
      :value="email"
      readonly
      hidden
    />

    <Input
      v-else
      v-model="email"
      :label="$t('general.email')"
      name="email"
      type="email"
      autocomplete="username"
      size="lg"
      required
    />

    <div class="password-new-field">
      <Input
        v-model="password"
        :label="$t('password.new')"
        name="password"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
        size="lg"
        :minlength="minLength"
        :maxlength="maxLength"
        :error-message="
          password ? $t('password.requirements.length', minLength) : undefined
        "
        :aria-describedby="requirementsId"
        required
      />

      <PasswordRequirements :id="requirementsId" :password="password" />
    </div>

    <div class="password-input-wrapper">
      <Input
        v-model="passwordConfirmation"
        :label="$t('password.confirm')"
        name="password_confirmation"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
        size="lg"
        required
      />

      <PasswordReveal v-model="showPassword" />
    </div>

    <Button
      variant="black"
      size="lg"
      type="submit"
      :label="$t('password.save')"
      icon="material-symbols:arrow-right-alt"
      icon-pos="end"
      :loading="loading"
    />

    <ErrorMessage :data="error" />
  </Form>
</template>
