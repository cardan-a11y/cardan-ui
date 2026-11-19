<script setup lang="ts">
definePageMeta({
  // On arrival only: turning MFA on here must not skip the recovery codes
  middleware: (to) => {
    const { isAuthenticated, loginRedirectTarget } = useAuth();
    const { needsMfaSetup } = useMfaSetupReminder();

    if (isAuthenticated.value && !needsMfaSetup.value) {
      return navigateTo(loginRedirectTarget(to) || '/');
    }
  },
});

const { t } = useI18n();

useHead({ title: computed(() => t('mfa.setup-title')) });

const { refreshIdentity, logout, loginRedirectTarget } = useAuth();
const { mfaRequired, dismissMfaSetup } = useMfaSetupReminder();
const { mfaStep } = useMfa();

const isPastIntro = computed(() => mfaStep.value > 1);

async function continueToApp() {
  dismissMfaSetup();
  await navigateTo(loginRedirectTarget() || '/');
}

const signingOut = ref(false);
const signOutError = ref<ApiErrorData | null>(null);

async function signOut() {
  signOutError.value = null;
  signingOut.value = true;

  try {
    await logout();
  } catch (error) {
    signOutError.value = extractApiError(error);
  } finally {
    signingOut.value = false;
  }
}
</script>

<template>
  <AuthPage
    class="mfa-setup-page"
    :title="isPastIntro ? undefined : $t('mfa.setup-title')"
    :description="
      isPastIntro
        ? undefined
        : mfaRequired
          ? $t('mfa.setup-required-description')
          : $t('mfa.setup-description')
    "
  >
    <MfaSetup
      :skippable="!mfaRequired"
      :heading-level="1"
      :show-intro="false"
      @refresh="refreshIdentity()"
      @skip="continueToApp"
      @done="continueToApp"
    />

    <ErrorMessage
      v-if="mfaRequired"
      class="mfa-setup-sign-out-error"
      :data="signOutError"
    />

    <!-- Without a skip, signing out is the only other way off this page. -->
    <template v-if="mfaRequired" #footer>
      <Button
        variant="link"
        font-size="sm"
        :label="$t('general.sign-out')"
        :loading="signingOut"
        @click="signOut"
      />
    </template>
  </AuthPage>
</template>

<style>
.mfa-setup-sign-out-error .error-message {
  margin-block-start: 1.5rem;
  margin-inline: auto;
}
</style>
