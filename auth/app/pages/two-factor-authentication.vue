<script setup lang="ts">
/**
 * Second-factor step of the sign-in flow. `LoginForm` sends the user here with
 * a `?redirect=` query when Fortify answers with `two_factor: true`.
 *
 * Create a page at the same path in your app to override this one.
 */
definePageMeta({
  // Read by nuxt-auth-sanctum's global middleware, so it lets the
  // not-yet-authenticated user through instead of sending them back to login.
  // `sanctum:guest` can't be used here: nuxt-auth-sanctum (3.1.5) registers it
  // only with `globalMiddleware` off.
  sanctum: { guestOnly: true },
});

const { t } = useI18n();

useHead({ title: computed(() => t('mfa.heading')) });
</script>

<template>
  <AuthPage class="two-factor-authentication-page">
    <MfaChallenge :card="false" />
  </AuthPage>
</template>
