<script setup lang="ts">
/** The six-digit code from the authenticator app, which the phone or a password manager can fill in. */
const { mfaCredentials, mfaError, codeInputRef } = useMfa();
</script>

<template>
  <div class="mfa-code-confirmation">
    <Input
      ref="codeInputRef"
      v-model="mfaCredentials.code"
      required
      autocomplete="one-time-code"
      inputmode="numeric"
      pattern="[0-9]{6}"
      name="code"
      :label="$t('mfa.challenge')"
      :minlength="6"
      :maxlength="6"
      :error-message="$t('mfa.challenge-invalid')"
      class="mfa-code-input"
    />

    <ErrorMessage :data="mfaError" />
  </div>
</template>

<style>
/* Centred under the code field, whatever an app gives the box elsewhere */
.mfa-code-confirmation .error-message {
  margin-block-start: 0;
  margin-inline: auto;
}

.mfa-code-input {
  display: grid;
  margin-inline: auto;

  label {
    text-align: center;
    margin-inline: auto;
    font-size: var(--font-size-md);
    margin-block-end: 0.5rem;
    color: var(--color-text);
  }

  input[type='text'] {
    height: auto;
    letter-spacing: 1rem;
    padding-inline: 1rem;
    padding-block: 0.5rem;
    font-size: var(--font-size-xxxl);
    background-color: var(--color-card-bg);
    font-variant-numeric: tabular-nums;
  }

  .error-wrapper {
    margin-inline: auto;
    margin-block: 0.25rem 0.75rem;

    .error {
      font-size: var(--font-size-sm);
    }
  }
}
</style>
