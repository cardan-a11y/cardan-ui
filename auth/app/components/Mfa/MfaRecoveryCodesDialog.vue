<script setup lang="ts">
/**
 * Replaces the recovery codes. The API never shows the current codes, so the
 * dialog opens on the question whether to replace them, and shows the new ones
 * this once. Closing it forgets them.
 */
const { mfaRecoveryCodesDialogRef, closeMfaRecoveryCodesDialog } =
  useMfaDialog();
const {
  mfaError,
  recoveryCodes,
  generateRecoveryCodes,
  loadingGenerateRecoveryCodes,
  resetMfa,
} = useMfa();

const codeListRef = useTemplateRef<{ focusHeading: () => void }>('codeList');

/** Asking to replace the codes, before the new ones are there. */
const isConfirming = computed(() => !recoveryCodes.value.length);

/**
 * The generate button gives way to the new codes, so focus moves to their
 * heading rather than being lost with the button.
 */
async function handleGenerate() {
  await generateRecoveryCodes();

  if (recoveryCodes.value.length) {
    await nextTick();
    codeListRef.value?.focusHeading();
  }
}
</script>

<template>
  <Dialog
    ref="mfaRecoveryCodesDialogRef"
    :label="$t('mfa.recovery-codes-regenerate')"
    class="mfa-recovery-codes-dialog"
    position="center"
    :click-outside="false"
    @close="resetMfa()"
  >
    <p v-if="isConfirming" class="mfa-recovery-codes-regenerate-description">
      {{ $t('mfa.recovery-codes-regenerate-description') }}
    </p>

    <ErrorMessage v-if="mfaError" :data="mfaError" />

    <MfaRecoveryCodeList
      v-else-if="recoveryCodes.length"
      ref="codeList"
      :heading-level="2"
    />

    <hr class="mfa-recovery-codes-divider" />

    <template #buttons>
      <Button
        v-if="isConfirming"
        variant="black"
        :label="$t('mfa.recovery-codes-generate')"
        icon="material-symbols:refresh-rounded"
        :loading="loadingGenerateRecoveryCodes"
        @click="handleGenerate()"
      />

      <Button
        v-else
        variant="black"
        icon="material-symbols:check"
        :label="$t('mfa.setup-finish')"
        @click="closeMfaRecoveryCodesDialog()"
      />
    </template>
  </Dialog>
</template>

<style>
.mfa-recovery-codes-dialog {
  --dialog-max-width: 480px;

  .mfa-recovery-codes-divider {
    block-size: 1px;
    background-color: var(--color-grey-light);
    margin-block-start: 1.5rem;
  }

  .dialog-buttons {
    margin-block-start: 1.25rem;
    justify-content: space-between;

    .button {
      .button-text {
        padding-block: 0.25rem;
      }
    }
  }

  p {
    margin-block-start: 0;
  }
}
</style>
