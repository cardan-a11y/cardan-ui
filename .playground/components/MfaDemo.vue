<script setup lang="ts">
// The mock Fortify endpoints in server/routes never report the password as
// confirmed, so every flow starts with the password dialog. Any password
// confirms it, except 000000.
const {
  openMfaEnableDialog,
  openMfaDisableDialog,
  openMfaRecoveryCodesDialog,
} = useMfaDialog();
</script>

<template>
  <div class="mfa-demo">
    <p>
      The dialogs talk to mock Fortify endpoints of this demo. Every password
      and code is accepted except <code>000000</code>, which shows the
      validation error.
    </p>

    <div class="mfa-demo-buttons">
      <Button
        variant="outline"
        size="lg"
        icon="material-symbols:shield-lock-outline-rounded"
        label="Enable MFA"
        @click="openMfaEnableDialog()"
      />

      <Button
        variant="outline"
        size="lg"
        icon="material-symbols:shield-lock-outline-rounded"
        label="Disable MFA"
        @click="openMfaDisableDialog()"
      />

      <Button
        variant="outline"
        size="lg"
        icon="material-symbols:refresh-rounded"
        label="Regenerate recovery codes"
        @click="openMfaRecoveryCodesDialog()"
      />
    </div>

    <MfaDialog />

    <MfaRecoveryCodesDialog />

    <PasswordConfirmationDialog />
  </div>
</template>

<style>
.mfa-demo {
  .mfa-demo-buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    margin-block-start: 2rem;
  }
}
</style>
