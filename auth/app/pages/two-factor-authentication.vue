<script setup lang="ts">
definePageMeta({
  // Not `sanctum:guest`: nuxt-auth-sanctum (3.1.5) registers it only with
  // `globalMiddleware` off. Tripwire: test/tripwires.test.ts.
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
