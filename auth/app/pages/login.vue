<script setup lang="ts">
/**
 * Create a page at the same path in your app to override this one. Change the
 * copy through the `auth.login-title` and `auth.login-description` messages.
 */
const { t } = useI18n();

useHead({ title: computed(() => t('general.login')) });

// Shared with the forgot-password page, so it starts from what was typed here.
const email = useLoginEmail();

// A sign-in without MFA detours past the setup page on its way in.
const { remindMfaSetup } = useMfaSetupReminder();
</script>

<template>
  <AuthPage
    class="login-page"
    :title="$t('auth.login-title')"
    :description="$t('auth.login-description')"
  >
    <LoginForm
      v-model:email="email"
      remember
      error-position="below-submit"
      :loading-delay="transitionDuration('lg')"
      @success="remindMfaSetup"
    />

    <template #footer>
      {{ $t('password.forgot') }}

      <NuxtLink to="/forgot-password">
        {{ $t('password.forgot-cta') }}
      </NuxtLink>
    </template>
  </AuthPage>
</template>
