<script setup lang="ts">
/**
 * Turns MFA on or off and regenerates the recovery codes, through the layer's
 * two dialogs, for an account settings page. Whether MFA is on comes from the
 * user payload's `mfa_enabled`.
 *
 * The codes are shown only when they are created, so the button regenerates
 * them instead of showing them: after the password, its dialog asks to replace
 * them and shows the new ones once.
 *
 * A user who is required to have MFA switches apps the Fortify way: switch it
 * off (after confirming the password) and set it up again straight away on the
 * setup page, where the API holds them until the new app is confirmed.
 */
const route = useRoute();
const { refreshIdentity } = useAuth();

const { mfaEnabled, mfaRequired, isMfaSetupRequired } = useMfaSetupReminder();
const {
  openMfaEnableDialog,
  openMfaDisableDialog,
  openMfaRecoveryCodesDialog,
  closeMfaDialog,
  loadingMfaRecoveryCodesDialog,
} = useMfaDialog();

async function handleRefresh() {
  await refreshIdentity();
  emit('refresh');

  if (isMfaSetupRequired.value) {
    closeMfaDialog();
    await navigateTo({
      path: '/mfa-setup',
      query: { redirect: route.fullPath },
    });
  }
}

const emit = defineEmits<{
  /** MFA was turned on or off: re-sync any copy of the user your app keeps. */
  refresh: [];
}>();
</script>

<template>
  <div class="mfa-settings">
    <p class="mfa-settings-status" :class="{ 'is-enabled': mfaEnabled }">
      <Icon
        :name="
          mfaEnabled
            ? 'material-symbols:check-circle-outline-rounded'
            : 'material-symbols:info-outline-rounded'
        "
      />
      {{ mfaEnabled ? $t('mfa.status-on') : $t('mfa.status-off') }}
    </p>

    <p v-if="mfaEnabled" class="mfa-settings-description">
      {{ $t('mfa.recovery-codes-lost') }}
    </p>

    <p v-if="mfaEnabled && mfaRequired" class="mfa-settings-description">
      {{ $t('mfa.change-app-description') }}
    </p>

    <div class="button-group">
      <template v-if="mfaEnabled">
        <Button
          variant="secondary"
          icon="material-symbols:refresh-rounded"
          :label="$t('mfa.recovery-codes-regenerate')"
          :loading="loadingMfaRecoveryCodesDialog"
          @click="openMfaRecoveryCodesDialog"
        />

        <Button
          variant="danger"
          :icon="
            mfaRequired
              ? 'material-symbols:lock-reset'
              : 'material-symbols:lock-open-outline'
          "
          :label="mfaRequired ? $t('mfa.reset') : $t('mfa.disable')"
          @click="openMfaDisableDialog"
        />
      </template>

      <Button
        v-else
        variant="black"
        icon="material-symbols:lock-outline"
        :label="$t('mfa.enable')"
        @click="openMfaEnableDialog"
      />
    </div>

    <!-- A required user goes straight on to set MFA up again, so the
         "MFA is off" step would only flash by. -->
    <MfaDialog :show-disable-result="!mfaRequired" @refresh="handleRefresh" />

    <MfaRecoveryCodesDialog />

    <PasswordConfirmationDialog />
  </div>
</template>

<style>
.mfa-settings {
  max-width: 600px;
  margin-block-start: 2rem;

  .mfa-settings-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: var(--font-weight-medium);
    color: var(--color-text);

    .iconify {
      flex-shrink: 0;
      font-size: var(--font-size-lg);
    }

    &.is-enabled .iconify {
      color: var(--color-green-graphic);
    }
  }

  .mfa-settings-description {
    max-width: 67ch;
    color: var(--color-grey-text);
  }

  .button-group {
    gap: 1.5rem;
    margin-block-start: 1.5rem;
  }
}
</style>
