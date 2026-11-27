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
const { mfaRequired, isMfaSetupRequired, dismissMfaSetup } =
  useMfaSetupReminder();
const { mfaStep } = useMfa();

const isPastIntro = computed(() => mfaStep.value > 1);

const pageError = ref<ApiErrorData | null>(null);

async function continueToApp() {
  dismissMfaSetup();
  await navigateTo(loginRedirectTarget() || '/');
}

const finishing = ref(false);

// A refresh that failed after the code leaves MFA off in the identity, and
// `mfa-setup.global` would send a required account back here
async function finish() {
  pageError.value = null;

  if (isMfaSetupRequired.value) {
    finishing.value = true;

    try {
      await refreshIdentity();
    } catch (error) {
      pageError.value = extractApiError(error);
      return;
    } finally {
      finishing.value = false;
    }
  }

  await continueToApp();
}

const signingOut = ref(false);

async function signOut() {
  pageError.value = null;
  signingOut.value = true;

  try {
    await logout();
  } catch (error) {
    pageError.value = extractApiError(error);
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
      :finishing
      @skip="continueToApp"
      @done="finish"
    />

    <ErrorMessage class="mfa-setup-page-error" :data="pageError" />

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
.mfa-setup-page-error .error-message {
  margin-block-start: 1.5rem;
  margin-inline: auto;
}
</style>
