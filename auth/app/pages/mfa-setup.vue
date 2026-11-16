<script setup lang="ts">
/**
 * Has a user without MFA set it up, in the sign-in pages' frame: as a reminder
 * right after signing in, or as a requirement they cannot skip (see
 * `useMfaSetupReminder()`). Sends the user on to where they were headed.
 */
definePageMeta({
  // Checked on arrival only: turning MFA on here must not cut the flow short
  // before the recovery codes are shown.
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

/**
 * Once MFA is being set up the flow needs the room, on a phone especially:
 * the page's title and description go, and the step heading becomes the h1.
 */
const isPastIntro = computed(() => mfaStep.value > 1);

/** On to where the sign-in was headed. */
async function continueToApp() {
  dismissMfaSetup();
  await navigateTo(loginRedirectTarget() || '/');
}

const signingOut = ref(false);
const signOutError = ref<ApiErrorData | null>(null);

/** nuxt-auth-sanctum leaves the page once signed out; a refusal shows here. */
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
