<script setup lang="ts">
/**
 * MFA on or off and new recovery codes, for an account settings page, by the
 * payload's `mfa_enabled`. A user required to have MFA who switches it off goes
 * straight on to the setup page.
 */
const route = useRoute();
const { refreshIdentity } = useAuth();
const { loadingDisableMfa } = useMfa();

const { mfaEnabled, mfaRequired, mfaExempt } = useMfaSetupReminder();
const {
  openMfaEnableDialog,
  openMfaDisableDialog,
  openMfaRecoveryCodesDialog,
  closeMfaDialog,
  loadingMfaRecoveryCodesDialog,
  loadingMfaDisableDialog,
} = useMfaDialog();

const resetsMfa = computed(() => mfaRequired.value && !mfaExempt.value);

async function handleRefresh() {
  await refreshIdentity().catch(() => {});
  emit('refresh');

  if (resetsMfa.value && loadingDisableMfa.value) {
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

    <p v-if="mfaEnabled && resetsMfa" class="mfa-settings-description">
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
            resetsMfa
              ? 'material-symbols:lock-reset'
              : 'material-symbols:lock-open-outline'
          "
          :label="resetsMfa ? $t('mfa.reset') : $t('mfa.disable')"
          :loading="loadingMfaDisableDialog"
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

    <MfaDialog :show-disable-result="!resetsMfa" @refresh="handleRefresh" />

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
