<script setup lang="ts">
const { showDisableResult = true } = defineProps<{
  /**
   * Show the "MFA is off" step after disabling. Turn it off when your
   * `refresh` handler takes the user elsewhere straight away, such as back to
   * a setup page because MFA is required: the dialog then keeps loading on the
   * confirmation until that handler closes it.
   */
  showDisableResult?: boolean;
}>();

const { mfaDialogRef, closeMfaDialog } = useMfaDialog();
const { ensurePasswordConfirmed } = usePasswordConfirmation();
const {
  mfaStep,
  loadingConfirmationCode,
  loadingDisableMfa,
  mfaCredentials,
  codeInputRef,
  mfaError,
  enableMfa,
  disableMfa,
  enterCode,
  resetMfa,
} = useMfa();

const dialogLabel = computed(() => {
  if (mfaStep.value === 4) return 'mfa.done';
  if (mfaStep.value === 2 || mfaStep.value === 3) return 'mfa.app-config';

  return 'mfa.heading';
});

// A step replaces the content focus was in (the Enable button, the code form)
// with the next step's, so focus moves to that content
const stepRef = useTemplateRef<HTMLDivElement>('step');
useMfaStepFocus(stepRef);

const loadingEnable = ref(false);

/**
 * Asks for the password once the user chooses to enable MFA on the intro, so
 * that dialog opens on top of this one. Cancelling it keeps the intro open.
 * The button loads from the click until the QR code step, so a second click
 * starts nothing.
 */
async function handleEnableMfa() {
  loadingEnable.value = true;

  try {
    if (await ensurePasswordConfirmed()) await enableMfa();
  } finally {
    loadingEnable.value = false;
  }
}

// Leaving the page while the dialog is open (browser Back) unmounts it without
// a close event: the setup secret and the codes go with it all the same
onBeforeUnmount(resetMfa);

async function handleEnterCode() {
  const success = await enterCode();
  if (success) emit('refresh');
}

async function handleDisableMfa() {
  const success = await disableMfa({ showResult: showDisableResult });
  if (success) emit('refresh');
}

/**
 * `refresh` fires once MFA has actually been turned on or off, so the host app
 * can re-read its own copy of the user (the composable already refreshes the
 * Sanctum identity itself).
 */
const emit = defineEmits<{
  refresh: [];
}>();
</script>

<template>
  <Dialog
    ref="mfaDialogRef"
    :label="$t(dialogLabel)"
    class="mfa-dialog"
    :header-icon="
      mfaStep === 4
        ? 'material-symbols:check-circle-outline-rounded'
        : undefined
    "
    position="center"
    :click-outside="false"
    @close="resetMfa()"
  >
    <!-- The step's content takes focus, as the dialog's title cannot -->
    <div ref="step" class="mfa-dialog-step" tabindex="-1">
      <div v-if="mfaStep === 1" class="mfa-content">
        <p>{{ $t('mfa.description') }}</p>

        <ErrorMessage :data="mfaError" />
      </div>

      <template v-if="mfaStep === 2">
        <MfaQr />

        <ErrorMessage :data="mfaError" />
      </template>

      <Form
        v-if="mfaStep === 3"
        id="mfa-code-confirmation-form"
        :autofocus-fn="() => codeInputRef?.focusElement()"
        @submit="handleEnterCode"
      >
        <MfaCode />
      </Form>

      <MfaEnableResult v-if="mfaStep === 4" />

      <div v-if="mfaStep === 5" class="mfa-content">
        <p>{{ $t('mfa.disable-description') }}</p>

        <ErrorMessage :data="mfaError" />
      </div>

      <MfaDisableResult v-if="mfaStep === 6" />
    </div>

    <hr class="mfa-dialog-divider" />

    <template #buttons>
      <Button
        v-if="mfaStep === 1"
        variant="black"
        icon="material-symbols:lock-outline"
        :label="$t('mfa.enable')"
        :loading="loadingEnable"
        @click="handleEnableMfa()"
      />

      <Button
        v-if="mfaStep === 2"
        variant="black"
        icon="material-symbols:arrow-right-alt"
        icon-pos="end"
        :label="$t('general.continue')"
        @click="mfaStep = 3"
      />

      <Button
        v-if="mfaStep === 3"
        type="submit"
        form="mfa-code-confirmation-form"
        variant="black"
        icon="material-symbols:check"
        :disabled="mfaCredentials.code.length !== 6"
        :loading="loadingConfirmationCode"
        :label="$t('general.confirm')"
      />

      <Button
        v-if="mfaStep === 4 || mfaStep === 6"
        variant="black"
        icon="material-symbols:check"
        :label="$t('general.done')"
        @click="closeMfaDialog()"
      />

      <Button
        v-if="mfaStep === 5"
        variant="danger"
        icon="material-symbols:lock-open-outline"
        :label="$t('mfa.disable')"
        :loading="loadingDisableMfa"
        @click="handleDisableMfa()"
      />
    </template>
  </Dialog>
</template>

<style>
.mfa-dialog {
  --dialog-max-width: 480px;

  /* Focused by script only, so no ring around the whole step; a ring in
     forced-colors mode still, as on AuthPage */
  .mfa-dialog-step {
    outline: 1px solid transparent;
  }

  .mfa-dialog-divider {
    block-size: 1px;
    background-color: var(--color-grey-light);
    margin-block-start: 1.5rem;
  }

  .mfa-code-confirmation {
    min-height: 200px;

    .mfa-code-input {
      margin-block-start: 1.5rem;
    }
  }

  .dialog-title-wrapper {
    .iconify {
      color: var(--color-green-graphic);
    }
  }

  .dialog-buttons {
    margin-block-start: 1.25rem;
  }

  .mfa-content {
    p {
      margin-block-end: 2.5rem;
    }
  }
}
</style>
