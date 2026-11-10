<script setup lang="ts">
/** A recovery code, typed or pasted from where it was stored: nothing autofills it. */
const { mfaCredentials, mfaError, recoveryCodeInputRef } = useMfa();
</script>

<template>
  <div class="mfa-recovery-code-confirmation">
    <Input
      ref="recoveryCodeInputRef"
      v-model="mfaCredentials.recovery_code"
      required
      autofocus
      autocomplete="off"
      name="recovery_code"
      :label="$t('mfa.recovery-code')"
      class="mfa-recovery-code-input"
    />

    <ErrorMessage :data="mfaError" />
  </div>
</template>

<style>
/* Centred under the code field, whatever an app gives the box elsewhere */
.mfa-recovery-code-confirmation .error-message {
  margin-block-start: 0;
  margin-inline: auto;
}

.mfa-recovery-code-input {
  display: grid;
  margin-inline: auto;

  label {
    text-align: center;
    margin-inline: auto;
    font-size: var(--font-size-md) !important;
    margin-block-end: 0.5rem !important;
  }

  input[type='text'] {
    height: auto;
    padding-block: 0.5rem;
    font-size: var(--font-size-lg);
    background-color: var(--color-card-bg);
  }

  .error-wrapper {
    margin-block: 0.25rem;

    .error {
      font-size: var(--font-size-sm);
    }
  }
}
</style>
